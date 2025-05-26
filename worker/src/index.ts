import { Hono } from "hono";
import { router } from "./routers";
import { cors } from "hono/cors";
import { createDb } from "./db";
import { auth, createAuthWithD1 } from "@/auth";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { OpenAPIGenerator } from "@orpc/openapi";
import { Cloudflare } from "@cloudflare/workers-types";
import { RPCHandler } from "@orpc/server/fetch";
import { Room } from "./objects/room";

export type Env = Cloudflare.Env & {
	DB: D1Database;
	ROOM: DurableObjectNamespace<Room>;
};

type Context = {
	room: DurableObjectStub<Room>;
};

// Hono app
const app = new Hono<{ Bindings: Env; Variables: Context }>();

// RPC handler
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

	const session = await auth.api
		.getSession({
			headers: new Headers(c.req.header()),
		})
		.catch(() => null);

	const { matched, response } = await handler.handle(c.req.raw, {
		prefix: "/rpc",
		context: {
			db,
			req: c.req,
			session,
			room: c.env.ROOM.get(
				c.env.ROOM.idFromName("room"),
			) as DurableObjectStub<Room>,
		},
	});

	if (matched) {
		return c.newResponse(response.body, response);
	}

	await next();
});

app.get("/", (c) => {
	const db = createDb(c.env.DB);
	console.log("DB initialized:", !!db);

	// Check if it's a websocket connection
	if (c.req.header("upgrade") === "websocket") {
		const room = c.env.ROOM.get(c.env.ROOM.idFromName("room"));
		return room.fetch(c.req.raw);
	}

	return c.text("Hello Hono!");
});

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

app.get("/openapi.json", (c) => {
	return c.json(openAPI);
});

export default app;
// you must export the Room class to use it in the Durable Object
export { Room } from "./objects/room";
