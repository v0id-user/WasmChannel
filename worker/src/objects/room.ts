import { DurableObject } from "cloudflare:workers";
import { Env } from "../index";
import { createPacket, deserializePacket, serializePacket } from "@/oop/packet";
import { PacketKind, ReactionKind, WasmPacket } from "@/utils/wasm/init";
import { createAuthWithD1 } from "@/auth";
import { DrizzleD1Database } from "drizzle-orm/d1";
import { createDb } from "~/db";
import { CacheDriver } from "~/driver/storage";

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

		await this.#addClient(session.user.id, server);

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
				PacketKind.Message,
				null,
				new TextEncoder().encode(
					`Rate limit exceeded: ${this.RATE_LIMIT_COUNT} messages per second`,
				),
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

		this.#broadcastToOthers(this.#onlineUsersPacket(), clientId, true);
	}

	#onlineUsersPacket() {
		const packetOnlineUsers = createPacket(
			PacketKind.OnlineUsers,
			null,
			new TextEncoder().encode(this.clientsById.size.toString()),
		);

		const serializedPacketOnlineUsers = serializePacket(packetOnlineUsers);

		return serializedPacketOnlineUsers;
	}

	// Add a new client
	async #addClient(clientId: string, ws: WebSocket): Promise<void> {
		this.clientsById.set(clientId, ws);
		this.clientsBySocket.set(ws, clientId);

		console.log(
			`Client ${clientId} added. Total clients: ${this.clientsById.size}`,
		);

		const serializedPacketOnlineUsers = this.#onlineUsersPacket();

		// Notify other clients about new connection
		await Promise.all([
			this.#broadcastToOthers(serializedPacketOnlineUsers, clientId, true),
			// This function only used for server to notify the client about the specific info
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


			if (isServer) {
				// Server message
				await this.#handleServerPacket(packet, senderId);
				return
			}

			// Client message

			// Validate packets coming from clients, it will throw an error if the packet is invalid
			this.#validateClientPacket(packet);

			// Route to appropriate handler based on packet type
			if (packet.kind() === PacketKind.Message) {
				await this.#handleMessagePacket(packet, senderId);
			} else if (packet.kind() === PacketKind.Reaction) {
				await this.#handleReactionPacket(packet, senderId);
			} else if (packet.kind() === PacketKind.Typing) {
				await this.#handleTypingPacket(packet, senderId);
			} else {
				console.log("Invalid packet kind:", packet.kind(), "from", senderId);
				throw new Error(
					"Invalid packet kind: " + packet.kind() + " from " + senderId,
				);
			}
		} catch (error) {
			console.error("Error processing packet:", error);
			return;
		}
	}

	#validateClientPacket(packet: WasmPacket): void {
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

		// Clients should never set user_id (server always sets this)
		if (packet.user_id() !== undefined) {
			throw new Error(
				"Invalid packet: clients cannot set user_id (server sets this)",
			);
		}

		// Validate message_id requirements per packet type
		if (packet.kind() === PacketKind.Message) {
			if (!packet.message_id()) {
				throw new Error("Message packets must have message_id set by client");
			}
		} else if (packet.kind() === PacketKind.Reaction) {
			if (!packet.message_id()) {
				const payloadBytes = packet.payload();
				const messageIdFromPayload = new TextDecoder().decode(payloadBytes);
				if (!messageIdFromPayload) {
					throw new Error("Reaction packets must have message_id");
				}
			}
		} else if (packet.kind() === PacketKind.Typing) {
			if (packet.message_id()) {
				throw new Error("Typing packets should not have message_id");
			}
		}
	}

	async #handleMessagePacket(
		packet: WasmPacket,
		senderId: string,
	): Promise<void> {
		const messageId = packet.message_id()!;

		const fullPacket = new WasmPacket(
			packet.kind(),
			messageId,
			senderId,
			packet.reaction_kind(),
			packet.payload(),
		);

		// Send to queue and cache with better error handling
		const [queueResult, cacheResult] = await Promise.allSettled([
			this.env.QUEUE_MESSAGES.send(fullPacket),
			this.#saveToCache([fullPacket], senderId),
		]);

		// Log any failures but don't block the broadcast
		if (queueResult.status === "rejected") {
			console.error("Failed to send message to queue:", queueResult.reason);
		}

		if (cacheResult.status === "rejected") {
			console.error("Failed to save message to cache:", cacheResult.reason);
		}

		// Always broadcast to clients for real-time experience, even if storage partially failed
		const serializedPacket = serializePacket(fullPacket);
		await this.#broadcastToAllClients(serializedPacket);
	}

	async #handleReactionPacket(
		packet: WasmPacket,
		senderId: string,
	): Promise<void> {
		// Extract messageId from metadata or payload
		let messageId = packet.message_id();
		if (!messageId) {
			const payloadBytes = packet.payload();
			messageId = new TextDecoder().decode(payloadBytes);
		}

		const reactionKind = packet.reaction_kind();

		if (!messageId || reactionKind === undefined) {
			throw new Error(
				"Invalid reaction packet: missing message_id or reaction_kind",
			);
		}

		const reactionPacket = new WasmPacket(
			packet.kind(),
			messageId,
			senderId,
			reactionKind,
			new TextEncoder().encode(""),
		);

		// Send to queue and update cache with better error handling
		const [queueResult, cacheResult] = await Promise.allSettled([
			this.env.QUEUE_MESSAGES.send(reactionPacket),
			this.#updateCacheReaction(messageId, reactionKind, senderId),
		]);

		// Log any failures but don't block the broadcast
		if (queueResult.status === "rejected") {
			console.error("Failed to send reaction to queue:", queueResult.reason);
		}

		if (cacheResult.status === "rejected") {
			console.error("Failed to update reaction in cache:", cacheResult.reason);
		}

		// Always broadcast to clients for real-time experience, even if storage partially failed
		const serializedPacket = serializePacket(reactionPacket);
		await this.#broadcastToAllClients(serializedPacket);
	}

	async #handleTypingPacket(
		packet: WasmPacket,
		senderId: string,
	): Promise<void> {
		const fullPacket = new WasmPacket(
			packet.kind(),
			packet.message_id(),
			senderId,
			packet.reaction_kind(),
			packet.payload(),
		);

		// For typing indicators and other non-persistent packets, just broadcast
		const serializedPacket = serializePacket(fullPacket);
		await this.#broadcastToOthersOnly(serializedPacket, senderId);
	}

	async #handleServerPacket(packet: WasmPacket, senderId: string): Promise<void> {
		const serializedPacket = serializePacket(packet);
		await this.#broadcastToOthersOnly(serializedPacket, senderId);
	}

	async #saveToCache(packets: WasmPacket[], senderId: string): Promise<void> {
		try {
			const cacheDriver = new CacheDriver(this.env.KV);
			await cacheDriver.write(packets, senderId);
		} catch (error) {
			console.error("Error saving to cache:", error);
		}
	}

	async #updateCacheReaction(
		messageId: string,
		reactionKind: ReactionKind,
		userId: string,
	): Promise<void> {
		try {
			const cacheDriver = new CacheDriver(this.env.KV);
			await cacheDriver.updateReaction(messageId, reactionKind, userId);
		} catch (error) {
			console.error("Error updating cache reaction:", error);
		}
	}

	async #broadcastToAllClients(serializedPacket: Uint8Array): Promise<void> {
		const clientsIdsCopy = new Map(this.clientsById);
		for (const [clientId, ws] of clientsIdsCopy) {
			try {
				ws.send(serializedPacket);
			} catch (error) {
				console.error(`Error sending to client ${clientId}:`, error);
				this.#removeClient(clientId, ws);
			}
		}
	}

	async #broadcastToOthersOnly(
		serializedPacket: Uint8Array,
		senderId: string,
	): Promise<void> {
		const clientsIdsCopy = new Map(this.clientsById);
		for (const [clientId, ws] of clientsIdsCopy) {
			try {
				if (clientId === senderId) continue; // Skip sender
				ws.send(serializedPacket);
			} catch (error) {
				console.error(`Error sending to client ${clientId}:`, error);
				this.#removeClient(clientId, ws);
			}
		}
	}

	#removeClient(clientId: string, ws: WebSocket): void {
		this.clientsById.delete(clientId);
		this.clientsBySocket.delete(ws);
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
