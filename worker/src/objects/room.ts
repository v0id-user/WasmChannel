import { DurableObject } from "cloudflare:workers";
import { Env } from "../index";

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
    console.log(this.env.QUEUE_MESSAGES)
		const websocketPair = new WebSocketPair();
		const [client, server] = Object.values(websocketPair);

		// TODO: Extract user id from the request headers
		let clientId = Math.random().toString(36).substring(7);

		// Store clientId in the WebSocket for hibernation survival
		server.serializeAttachment(clientId);
		this.ctx.acceptWebSocket(server);

		// Store the SERVER WebSocket in maps
		this.clientsById.set(clientId, server);
		this.clientsBySocket.set(server, clientId);

		console.log(
			`Client ${clientId} connected. Total clients: ${this.clientsById.size}`,
		);

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	webSocketMessage(ws: WebSocket, event: string | ArrayBuffer) {
		const messageData =
			typeof event === "string" ? event : new TextDecoder().decode(event);
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
		this.removeClient(clientId);
	}

	// Add a new client
	async addClient(clientId: string, ws: WebSocket): Promise<void> {
		this.clientsById.set(clientId, ws);
		this.clientsBySocket.set(ws, clientId);

		console.log(
			`Client ${clientId} added. Total clients: ${this.clientsById.size}`,
		);

		// Send welcome message to the new client
		ws.send(
			JSON.stringify({
				type: "connected",
				clientId: clientId,
				clientCount: this.clientsById.size,
			}),
		);

		// Notify other clients about new connection
		this.#broadcastToOthers({
			type: "user_joined",
			clientId: clientId,
			clientCount: this.clientsById.size,
		});
	}

	// Remove a client
	async removeClient(clientId: string): Promise<void> {
		const ws = this.clientsById.get(clientId);
		if (ws) {
			this.clientsById.delete(clientId);
			this.clientsBySocket.delete(ws);

			console.log(
				`Client ${clientId} removed. Total clients: ${this.clientsById.size}`,
			);

			// Notify remaining clients
			this.#broadcastToOthers({
				type: "user_left",
				clientId: clientId,
				clientCount: this.clientsById.size,
			});
		}
	}

	// Broadcast a message from a specific client to all other clients
	async #broadcastMessage(
		data: string | ArrayBuffer,
		fromClientId: string,
	): Promise<void> {
		const messageData =
			typeof data === "string" ? data : new TextDecoder().decode(data);
		console.log(`Broadcasting message from ${fromClientId}: ${messageData}`);

		try {
			let message: any;
			try {
				message = JSON.parse(messageData);
			} catch {
				message = { text: messageData };
			}

			const broadcastData = {
				type: "message",
				data: message,
				fromClientId: fromClientId,
				timestamp: new Date().toISOString(),
			};

			this.#broadcastToAll(broadcastData);
		} catch (error) {
			console.error("Error broadcasting message:", error);
		}
	}

	// Broadcast to all clients
	#broadcastToAll(message: any): void {
		const messageStr = JSON.stringify(message);
		const clientsIdsCopy = new Map(this.clientsById);

		for (const [clientId, ws] of clientsIdsCopy) {
			if (clientId === message.fromClientId) {
				console.log(
					"Skipping self ClientId: ",
					clientId,
					" from: ",
					message.fromClientId,
				);
				continue;
			}
			console.log(
				"Broadcasting to: ",
				clientId,
				" from: ",
				message.fromClientId,
			);
			try {
				ws.send(messageStr);
			} catch (error) {
				console.error(`Error sending message to client ${clientId}:`, error);
				// Remove client if send fails
				this.clientsById.delete(clientId);
				this.clientsBySocket.delete(ws);
			}
		}
	}

	// Broadcast to all clients except the sender
	#broadcastToOthers(message: any): void {
		const messageStr = JSON.stringify(message);
		const clientsIdsCopy = new Map(this.clientsById);

		for (const [clientId, ws] of clientsIdsCopy) {
			if (clientId !== message.fromClientId) {
				try {
					ws.send(messageStr);
				} catch (error) {
					console.error(`Error sending message to client ${clientId}:`, error);
					// Remove client if send fails
					this.clientsById.delete(clientId);
					this.clientsBySocket.delete(ws);
				}
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
