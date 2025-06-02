import { DurableObject } from "cloudflare:workers";
import { Env } from "../index";
import { createPacket, deserializePacket, serializePacket } from "@/oop/packet";
import { PacketKind, WasmPacket } from "@/utils/wasm/init";
import { createAuthWithD1 } from "@/auth";
import { DrizzleD1Database } from "drizzle-orm/d1";
import { createDb } from "../db";
import { CacheDriver, DatabaseDriver } from "../driver/storage";
import { nanoid } from "nanoid";

export class Room extends DurableObject {
	// Store active WebSocket clients with bidirectional lookups
	clientsById = new Map<string, WebSocket>();
	clientsBySocket = new Map<WebSocket, string>();
	// Rate limiting: track message counts per user
	private userRateMap = new Map<string, { count: number; resetAt: number }>();
	private readonly RATE_LIMIT_COUNT = 5; // 5 messages
	private readonly RATE_LIMIT_WINDOW_MS = 1000; // per 1 second (1000ms)

	env: Env;
	db: DrizzleD1Database = {} as DrizzleD1Database;
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.env = env;
		// `blockConcurrencyWhile()` ensures no requests are delivered until initialization completes.
		ctx.blockConcurrencyWhile(async () => {
			// Restore hibernated WebSocket connections | https://developers.cloudflare.com/durable-objects/best-practices/websockets/#websocket-hibernation-api
			this.clientsById = new Map<string, WebSocket>();
			this.clientsBySocket = new Map<WebSocket, string>();

			// Get all hibernated WebSockets and rebuild our maps
			const hibernatedSockets = this.ctx.getWebSockets();
			for (const ws of hibernatedSockets) {
				const clientId =
					ws.deserializeAttachment() || Math.random().toString(36).substring(7);
				this.clientsById.set(clientId, ws);
				this.clientsBySocket.set(ws, clientId);
			}
		});
	}

	async fetch(req: Request) {
		// Create a new WebSocket pair
		const websocketPair = new WebSocketPair();
		const [client, server] = Object.values(websocketPair);

		// Check if the request is a WebSocket upgrade request
		if (req.headers.get("upgrade") !== "websocket") {
			return new Response(null, {
				status: 400,
				statusText: "Bad Request",
			});
		}

		// Create the database and auth instance
		this.db = createDb(this.env.DB);
		const auth = createAuthWithD1(this.db);

		// Get the session from the request headers
		const session = await auth.api.getSession({
			headers: req.headers,
		});

		// for testing console out the session
		console.log("Session", session);

		// Check if the user is authenticated
		if (!session) {
			return new Response(null, {
				status: 401,
				statusText: "Unauthorized",
			});
		}

		// Store clientId in the WebSocket for hibernation survival
		server.serializeAttachment(session.user.id);

		// Calling `acceptWebSocket()` informs the runtime that this WebSocket is to begin terminating
		// request within the Durable Object. It has the effect of "accepting" the connection,
		// and allowing the WebSocket to send and receive messages.
		// Unlike `ws.accept()`, `state.acceptWebSocket(ws)` informs the Workers Runtime that the WebSocket
		// is "hibernatable", so the runtime does not need to pin this Durable Object to memory while
		// the connection is open. During periods of inactivity, the Durable Object can be evicted
		// from memory, but the WebSocket connection will remain open. If at some later point the
		// WebSocket receives a message, the runtime will recreate the Durable Object
		// (run the `constructor`) and deliver the message to the appropriate handler.
		this.ctx.acceptWebSocket(server);

		this.addClient(session.user.id, server);

		console.log(
			`Client ${session.user.id} connected. Total clients: ${this.clientsById.size}`,
		);

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	async webSocketMessage(ws: WebSocket, event: string | ArrayBuffer) {
		const clientId = this.clientsBySocket.get(ws);
		if (!clientId) return;

		// Rate limiting check
		if (!this.isAllowed(clientId)) {
			// Send rate limit error to the client
			const errorPacket = createPacket(
				PacketKind.Message, // You might want to create a specific error packet type
				null,
				new TextEncoder().encode("Rate limit exceeded: 5 messages per second"),
			);
			const serializedError = serializePacket(errorPacket);

			try {
				ws.send(serializedError);
			} catch (error) {
				console.error(
					`Error sending rate limit message to client ${clientId}:`,
					error,
				);
			}
			return;
		}

		const messageData =
			event instanceof ArrayBuffer
				? new Uint8Array(event)
				: new TextEncoder().encode(event);

		console.log(
			`Message from client ${this.clientsBySocket.get(ws)}: ${messageData}`,
		);

		await this.#broadcastToOthers(messageData, clientId);
	}

	// Rate limiting check method
	private isAllowed(userId: string): boolean {
		const now = Date.now();
		const entry = this.userRateMap.get(userId) ?? {
			count: 0,
			resetAt: now + this.RATE_LIMIT_WINDOW_MS,
		};

		// Reset window if time has passed
		if (now > entry.resetAt) {
			entry.count = 1;
			entry.resetAt = now + this.RATE_LIMIT_WINDOW_MS;
			this.userRateMap.set(userId, entry);
			return true;
		}

		// Check if limit exceeded
		if (entry.count >= this.RATE_LIMIT_COUNT) {
			return false;
		}

		// Increment count
		entry.count++;
		this.userRateMap.set(userId, entry);
		return true;
	}

	webSocketClose(ws: WebSocket) {
		const clientId = this.clientsBySocket.get(ws);
		if (!clientId) return;
		this.clientsById.delete(clientId);
		this.clientsBySocket.delete(ws);
	}

	// Add a new client
	async addClient(clientId: string, ws: WebSocket): Promise<void> {
		this.clientsById.set(clientId, ws);
		this.clientsBySocket.set(ws, clientId);

		console.log(
			`Client ${clientId} added. Total clients: ${this.clientsById.size}`,
		);

		const packetJoined = createPacket(
			PacketKind.Joined,
			null,
			new TextEncoder().encode(clientId),
		);

		const packetOnlineUsers = createPacket(
			PacketKind.OnlineUsers,
			null,
			new TextEncoder().encode(this.clientsById.size.toString()),
		);

		const serializedPacketJoined = serializePacket(packetJoined);
		const serializedPacketOnlineUsers = serializePacket(packetOnlineUsers);
		// This was just a test
		// this.env.QUEUE_MESSAGES.send(serializedPacket, {
		// 	contentType: "bytes",
		// });

		// Notify other clients about new connection
		await Promise.all([
			this.#broadcastToOthers(serializedPacketJoined, clientId, true),
			this.#broadcastToClient(serializedPacketOnlineUsers, clientId),
		]);
	}

	// Broadcast to all clients except the sender
	async #broadcastToOthers(
		message: Uint8Array,
		senderId: string,
		isServer: boolean = false,
	): Promise<void> {
		try {
			const packet = deserializePacket(message);

			// Validate packets coming from clients
			if (!isServer) {
				// Clients can only send Message, Reaction, or Typing packets
				if (
					packet.kind() !== PacketKind.Reaction &&
					packet.kind() !== PacketKind.Message &&
					packet.kind() !== PacketKind.Typing
				) {
					throw new Error(
						"Invalid packet kind: clients can only send Message, Reaction, or Typing packets",
					);
				}

				// For regular messages, clients can now set message_id to ensure consistency
				// For reactions, clients must set message_id (the message being reacted to)
				// For typing, message_id should be null
				// Clients should never set user_id (server always sets this)
				if (packet.user_id() !== undefined) {
					throw new Error(
						"Invalid packet: clients cannot set user_id (server sets this)",
					);
				}

				// Validate message_id requirements per packet type
				if (packet.kind() === PacketKind.Message) {
					// Regular messages should have client-generated message_id
					if (!packet.message_id()) {
						throw new Error("Message packets must have message_id set by client");
					}
				} else if (packet.kind() === PacketKind.Reaction) {
					// Reactions need message_id (either from packet metadata or payload)
					if (!packet.message_id()) {
						// Try to get it from payload as before
						const payloadBytes = packet.payload();
						const messageIdFromPayload = new TextDecoder().decode(payloadBytes);
						if (!messageIdFromPayload) {
							throw new Error("Reaction packets must have message_id");
						}
					}
				} else if (packet.kind() === PacketKind.Typing) {
					// Typing packets should not have message_id
					if (packet.message_id()) {
						throw new Error("Typing packets should not have message_id");
					}
				}
			}

			const cacheDriver = new CacheDriver(this.env.KV);
			const databaseDriver = new DatabaseDriver(this.env.DB);

			// Handle regular message packets
			if (packet.kind() === PacketKind.Message && !isServer) {
				// Use client's message_id to ensure consistency across all clients
				const messageId = packet.message_id()!; // Already validated above
				
				const fullPacket = new WasmPacket(
					packet.kind(),
					messageId, // Use client's message ID
					senderId, // Server sets the user ID
					packet.reaction_kind(),
					packet.payload(),
				);

				// Try to save to database (will be ignored if duplicate reference ID)
				try {
					await databaseDriver.write([fullPacket], senderId);
					// Also save to cache
					await cacheDriver.write([fullPacket], senderId);
				} catch (error) {
					console.error("Error saving message:", error);
					// Continue with broadcast even if save fails
				}

				const serializedFullPacket = serializePacket(fullPacket);

				// Broadcast message to ALL clients (including sender for UI consistency)
				const clientsIdsCopy = new Map(this.clientsById);
				for (const [clientId, ws] of clientsIdsCopy) {
					try {
						ws.send(serializedFullPacket);
					} catch (error) {
						console.error(`Error sending message to client ${clientId}:`, error);
						// Remove client if send fails
						this.clientsById.delete(clientId);
						this.clientsBySocket.delete(ws);
					}
				}

				return; // Early return for message packets
			}

			// Handle reaction packets specially (existing logic)
			if (packet.kind() === PacketKind.Reaction && !isServer) {
				// For reaction packets, extract messageId from payload if not in metadata
				let messageId = packet.message_id();
				if (!messageId) {
					const payloadBytes = packet.payload();
					messageId = new TextDecoder().decode(payloadBytes);
				}
				const reactionKind = packet.reaction_kind();
				
				if (!messageId || reactionKind === null || reactionKind === undefined) {
					throw new Error("Invalid reaction packet: missing message_id or reaction_kind");
				}

				// Commented for now, all I need is just broadcast to all clients
				// const [dbUpdated, cacheUpdated] = await Promise.all([
				// 	databaseDriver.appendReaction(messageId, reactionKind, senderId),
				// 	cacheDriver.appendReaction(messageId, reactionKind, senderId),
				// ]);

				// console.log(`Reaction updated - DB: ${dbUpdated}, Cache: ${cacheUpdated}`);

				// Create updated packet with user ID and proper message ID for broadcasting
				const fullPacket = new WasmPacket(
					packet.kind(),
					messageId, // Set the extracted messageId
					senderId,
					reactionKind,
					new TextEncoder().encode(""), // Empty payload for broadcast
				);

				const serializedFullPacket = serializePacket(fullPacket);

				// Broadcast reaction to all clients (including sender for UI update)
				const clientsIdsCopy = new Map(this.clientsById);
				for (const [clientId, ws] of clientsIdsCopy) {
					try {
						ws.send(serializedFullPacket);
					} catch (error) {
						console.error(`Error sending reaction to client ${clientId}:`, error);
						// Remove client if send fails
						this.clientsById.delete(clientId);
						this.clientsBySocket.delete(ws);
					}
				}

				return; // Early return for reaction packets
			}

			// Handle other packet types (Typing, etc.)
			const fullPacket = new WasmPacket(
				packet.kind(),
				packet.message_id(), // Use packet's message_id if present
				senderId,
				packet.reaction_kind(),
				packet.payload(),
			);

			// For typing indicators and other non-persistent packets, just broadcast
			const serializedFullPacket = serializePacket(fullPacket);

			const clientsIdsCopy = new Map(this.clientsById);
			for (const [clientId, ws] of clientsIdsCopy) {
				try {
					if (clientId === senderId) continue; // Skip sender for typing indicators
					ws.send(serializedFullPacket);
				} catch (error) {
					console.error(`Error sending message to client ${clientId}:`, error);
					// Remove client if send fails
					this.clientsById.delete(clientId);
					this.clientsBySocket.delete(ws);
				}
			}
		} catch (error) {
			console.error("Error deserializing packet:", error);
			// Just skip
			return;
		}
	}

	// Broadcast to a single client (server use only)
	async #broadcastToClient(message: Uint8Array, toId: string): Promise<void> {
		try {
			const ws = this.clientsById.get(toId);
			if (!ws) {
				console.warn(`Client ${toId} not found`);
				return;
			}

			ws.send(message);
		} catch (error) {
			console.error(`Error sending message to client ${toId}:`, error);
			// Remove client if send fails
			const ws = this.clientsById.get(toId);
			if (ws) {
				this.clientsById.delete(toId);
				this.clientsBySocket.delete(ws);
			}
		}
	}

	// Get current client count
	async getClientCount(): Promise<number> {
		return this.clientsById.size;
	}

	// Send message to all clients from external source
	async sendToAll(message: Uint8Array): Promise<void> {
		this.#broadcastToOthers(message, "server");
	}

	// Get list of connected client IDs
	async getClientIds(): Promise<string[]> {
		return Array.from(this.clientsById.keys());
	}
}
