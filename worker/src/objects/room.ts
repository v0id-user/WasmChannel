import { DurableObject } from "cloudflare:workers";
import { Env } from "../index";

export class Room extends DurableObject {
	// Store active WebSocket clients with their IDs
	clients = new Map<string, WebSocket>();

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		// `blockConcurrencyWhile()` ensures no requests are delivered until initialization completes.
		ctx.blockConcurrencyWhile(async () => {
			// After initialization, future reads do not need to access storage.
			this.clients =
				(await ctx.storage.get("clients")) || new Map<string, WebSocket>();
		});
	}

	async fetch(req: Request) {
		const websocketPair = new WebSocketPair();
		const [client, server] = Object.values(websocketPair);
		this.ctx.acceptWebSocket(server);
		let clientId = Math.random().toString(36).substring(7);
		this.clients.set(clientId, client);
		console.log(req.headers);
		console.log(
			`Client ${clientId} connected. Total clients: ${this.clients.size}`,
		);
		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	// Add a new client
	async addClient(clientId: string, ws: any): Promise<void> {
		this.clients.set(clientId, ws);
		console.log(
			`Client ${clientId} added. Total clients: ${this.clients.size}`,
		);

		// Send welcome message to the new client
		ws.send(
			JSON.stringify({
				type: "connected",
				clientId: clientId,
				clientCount: this.clients.size,
			}),
		);

		// Notify other clients about new connection
		this.broadcastToOthers(
			{
				type: "user_joined",
				clientId: clientId,
				clientCount: this.clients.size,
			},
			clientId,
		);
	}

	// Remove a client
	async removeClient(clientId: string): Promise<void> {
		if (this.clients.has(clientId)) {
			this.clients.delete(clientId);
			console.log(
				`Client ${clientId} removed. Total clients: ${this.clients.size}`,
			);

			// Notify remaining clients
			this.broadcastToOthers(
				{
					type: "user_left",
					clientId: clientId,
					clientCount: this.clients.size,
				},
				clientId,
			);
		}
	}

	// Broadcast a message from a specific client to all other clients
	async broadcastMessage(
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
				fromClientId: fromClientId,
				data: message,
				timestamp: new Date().toISOString(),
			};

			this.broadcastToAll(broadcastData);
		} catch (error) {
			console.error("Error broadcasting message:", error);
		}
	}

	// Broadcast to all clients
	private broadcastToAll(message: any): void {
		const messageStr = JSON.stringify(message);
		const clientsCopy = new Map(this.clients);

		for (const [clientId, ws] of clientsCopy) {
			try {
				ws.send(messageStr);
			} catch (error) {
				console.error(`Error sending message to client ${clientId}:`, error);
				// Remove client if send fails
				this.clients.delete(clientId);
			}
		}
	}

	// Broadcast to all clients except the sender
	private broadcastToOthers(message: any, excludeClientId: string): void {
		const messageStr = JSON.stringify(message);
		const clientsCopy = new Map(this.clients);

		for (const [clientId, ws] of clientsCopy) {
			if (clientId !== excludeClientId) {
				try {
					ws.send(messageStr);
				} catch (error) {
					console.error(`Error sending message to client ${clientId}:`, error);
					// Remove client if send fails
					this.clients.delete(clientId);
				}
			}
		}
	}

	// Get current client count
	async getClientCount(): Promise<number> {
		return this.clients.size;
	}

	// Send message to all clients from external source
	async sendToAll(message: any): Promise<void> {
		this.broadcastToAll(message);
	}

	// Get list of connected client IDs
	async getClientIds(): Promise<string[]> {
		return Array.from(this.clients.keys());
	}
}
