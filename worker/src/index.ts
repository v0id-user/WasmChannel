import { Hono } from "hono";
import { router } from "./routers";
import { cors } from "hono/cors";
import { createDb } from "./db";
import { createAuthWithD1 } from "@/auth";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { OpenAPIGenerator } from "@orpc/openapi";
import { Cloudflare } from "@cloudflare/workers-types";
import { RPCHandler } from "@orpc/server/fetch";
import { Room } from "./objects/room";
import { upgradeWebSocket } from "hono/cloudflare-workers";

export type Env = Cloudflare.Env & {
	DB: D1Database;
	ROOM: DurableObjectNamespace<Room>;
};

type Context = {
	room: DurableObjectStub<Room>;
};

const app = new Hono<{ Bindings: Env; Variables: Context }>();

const handler = new RPCHandler(router);

const openAPIGenerator = new OpenAPIGenerator({
	schemaConverters: [new ZodToJsonSchemaConverter()],
});

const openAPI = openAPIGenerator.generate(router, {
	info: {
		title: "WasmChannel API",
		version: "1.0.0",
	},
});

// Append Durable Object namespace to the whole app context
app.use("*", async (c, next) => {
	const room = c.env.ROOM.get(c.env.ROOM.idFromName("room"));
	c.set("room", room);
	await next();
});

// Enable CORS for all routes
app.use(
	"/rpc/*",
	cors({
		origin: process.env.FRONTEND_URL || "http://localhost:3000",
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		exposeHeaders: ["Content-Length"],
		credentials: true,
	}),
);

app.use("/rpc/*", async (c, next) => {
	const db = createDb(c.env.DB);
	console.log("DB created for RPC:", !!db);

	const { matched, response } = await handler.handle(c.req.raw, {
		prefix: "/rpc",
		context: { db, req: c.req, session: null },
	});

	if (matched) {
		return c.newResponse(response.body, response);
	}

	await next();
});

app.get("/", (c) => {
	const db = createDb(c.env.DB);
	console.log("DB initialized:", !!db);
	return c.text("Hello Hono!");
});

app.get(
	"/w",
	upgradeWebSocket((c) => {
		const room = c.get("room") as DurableObjectStub<Room>;
		let clientId: string;
		return {
			onMessage(event, ws) {
				console.log(`Message from client: ${event.data}`);
				// Register client on first message if not already registered
				if (!clientId) {
					clientId = Math.random().toString(36).substring(7);
					room.addClient(clientId, ws);
				}
				// Broadcast the message to all clients
				room.broadcastMessage(event.data, clientId);
			},
			onClose: () => {
				console.log("WebSocket connection closed");
				if (clientId) {
					room.removeClient(clientId);
				}
			},
			onError: (event) => {
				console.error("WebSocket error:", event);
				if (clientId) {
					room.removeClient(clientId);
				}
			},
		};
	}),
);

// Test auth endpoint
app.get("/health", async (c) => {
	try {
		const db = createDb(c.env.DB);
		const auth = createAuthWithD1(c.env.DB);
		console.log("Auth initialized:", !!auth);
		console.log("DB initialized:", !!db);

		return c.json({
			success: true,
			message: "Database and Auth bindings working!",
			dbReady: !!db,
			authReady: !!auth,
		});
	} catch (error) {
		console.error("Auth test error:", error);
		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			500,
		);
	}
});

// Logging fingerprint
app.get("/f", async (c) => {
	const headers = c.req.header();
});

app.get("/openapi.json", (c) => {
	return c.json(openAPI);
});

export default app;
// you must export the Room class to use it in the Durable Object
export { Room } from "./objects/room";
