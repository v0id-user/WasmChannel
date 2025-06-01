import { DurableObject } from "cloudflare:workers";
import { Env } from "../index";
import { createPacket, deserializePacket, serializePacket } from "@/oop/packet";
import { PacketKind } from "@/utils/wasm/init";
import { createAuthWithD1 } from "@/auth";
import { DrizzleD1Database } from "drizzle-orm/d1";
import { createDb } from "../db";
import { CacheDriver } from "../driver/write";

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
			// Clients allowed to send a Reaction or Message
			if (
				packet.kind() != PacketKind.Reaction &&
				packet.kind() != PacketKind.Message &&
				packet.kind() != PacketKind.Typing &&
				!isServer
			) {
				throw new Error("Invalid packet kind");
			}

			const cacheDriver = new CacheDriver(this.env.KV);

			// Push to queue and save to cache
			if (!isServer) {
				await Promise.all([
					this.env.QUEUE_MESSAGES.send({
						wasmPacket: packet,
						sentBy: senderId,
					}),
					cacheDriver.write([packet], senderId),
				]);
			}

			const clientsIdsCopy = new Map(this.clientsById);
			for (const [clientId, ws] of clientsIdsCopy) {
				try {
					if (clientId === senderId) continue;
					ws.send(message);
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
