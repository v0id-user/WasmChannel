import { DurableObject } from "cloudflare:workers";
import { Env } from "../index";
import { createPacket, deserializePacket, serializePacket } from "@/oop/packet";
import { PacketKind } from "@/utils/wasm/init";
import { auth } from "@/auth";

export class Room extends DurableObject {
	// Store active WebSocket clients with bidirectional lookups
	clientsById = new Map<string, WebSocket>();
	clientsBySocket = new Map<WebSocket, string>();
	env: Env;
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
		const websocketPair = new WebSocketPair();
		const [client, server] = Object.values(websocketPair);

		const session = await auth.api.getSession({
			headers: new Headers(req.headers),
		});

		if (req.headers.get("upgrade") !== "websocket") {
			return new Response(null, {
				status: 400,
				statusText: "Bad Request",
			});
		}

		if (!session) {
			return new Response(null, {
				status: 401,
				statusText: "Unauthorized",
			});
		}

		// Store clientId in the WebSocket for hibernation survival
		server.serializeAttachment(session.user.id);
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

		this.#broadcastMessage(messageData, clientId);
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
		this.env.QUEUE_MESSAGES.send(serializedPacket, {
			contentType: "bytes",
		});

		// Notify other clients about new connection
		this.#broadcastToOthers(serializedPacket);
	}

	// Broadcast a message from a specific client to all other clients
	async #broadcastMessage(
		data: Uint8Array,
		fromClientId: string,
	): Promise<void> {
		console.log(
			`Broadcasting binary data from ${fromClientId}, length: ${data.length} bytes`,
		);

		try {
			this.#broadcastToAll(data);
		} catch (error) {
			console.error("Error broadcasting message:", error);
		}
	}

	// Broadcast to all clients
	#broadcastToAll(message: Uint8Array): void {
		const clientsIdsCopy = new Map(this.clientsById);

		for (const [clientId, ws] of clientsIdsCopy) {
			try {
				ws.send(message);
			} catch (error) {
				console.error(`Error sending message to client ${clientId}:`, error);
				// Remove client if send fails
				this.clientsById.delete(clientId);
				this.clientsBySocket.delete(ws);
			}
		}
	}

	// Broadcast to all clients except the sender
	#broadcastToOthers(message: Uint8Array): void {
		const clientsIdsCopy = new Map(this.clientsById);
		for (const [clientId, ws] of clientsIdsCopy) {
			try {
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
	async sendToAll(message: any): Promise<void> {
		this.#broadcastToAll(message);
	}

	// Get list of connected client IDs
	async getClientIds(): Promise<string[]> {
		return Array.from(this.clientsById.keys());
	}
}
