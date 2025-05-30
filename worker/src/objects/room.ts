import { DurableObject } from "cloudflare:workers";
import { Env } from "../index";
import { createPacket, serializePacket } from "@/oop/packet";
import { PacketKind } from "@/utils/wasm/init";
import { createAuthWithD1 } from "@/auth";
import { DrizzleD1Database } from "drizzle-orm/d1";
import { createDb } from "../db";

export class Room extends DurableObject {
	// Store active WebSocket clients with bidirectional lookups
	clientsById = new Map<string, WebSocket>();
	clientsBySocket = new Map<WebSocket, string>();
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

	webSocketMessage(ws: WebSocket, event: string | ArrayBuffer) {
		const messageData =
			event instanceof ArrayBuffer
				? new Uint8Array(event)
				: new TextEncoder().encode(event);

		console.log(
			`Message from client ${this.clientsBySocket.get(ws)}: ${messageData}`,
		);

		const clientId = this.clientsBySocket.get(ws);
		if (!clientId) return;

		this.#broadcastToOthers(messageData, clientId);
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

		const packet = createPacket(
			PacketKind.Joined,
			null,
			new TextEncoder().encode(clientId),
		);

		const serializedPacket = serializePacket(packet);
		// This was just a test
		// this.env.QUEUE_MESSAGES.send(serializedPacket, {
		// 	contentType: "bytes",
		// });

		// Notify other clients about new connection
		this.#broadcastToOthers(serializedPacket, clientId);
	}

	// Broadcast to all clients except the sender
	#broadcastToOthers(message: Uint8Array, senderId: string): void {
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
