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
import { WasmPacket } from "@/wasm/wasmchannel";
import { user } from "./db/schema/schema";

export type Env = Cloudflare.Env & {
	DB: D1Database;
	KV: KVNamespace;
	QUEUE_MESSAGES: Queue<WasmPacket>;
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

// Enable CORS for auth routes
app.use(
	"/api/auth/*",
	cors({
		origin: process.env.FRONTEND_URL || "http://localhost:3000",
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["POST", "GET", "OPTIONS"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
		credentials: true,
	}),
);

// Handle auth routes
app.on(["POST", "GET"], "/api/auth/*", (c) => {
	const db = createDb(c.env.DB);
	return createAuthWithD1(db).handler(c.req.raw);
});

// Enable CORS for RPC routes
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

// Handle RPC routes
app.use("/rpc/*", async (c, next) => {
	const db = createDb(c.env.DB);
	console.log("DB created for RPC:", !!db);
	const auth = createAuthWithD1(db);
	const session = await auth.api
		.getSession({
			headers: c.req.raw.headers,
		})
		.catch(() => null);

	const { matched, response } = await handler.handle(c.req.raw, {
		prefix: "/rpc",
		context: {
			DB: c.env.DB,
			KV: c.env.KV,
			QUEUE_MESSAGES: c.env.QUEUE_MESSAGES,
			ROOM: c.env.ROOM,
			req: c.req,
			user: session?.user ?? null,
			session: session?.session ?? null,
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

	return c.text(`

             ⢀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡶⠟⠛⠛⠛⠛⠻⢶⣤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢀⣾⠋⣠⡶⠟⠛⠛⠷⣦⣄⠈⠻⣦⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢀⣾⠃⠰⠟⢠⡶⠶⠶⣦⣄⠉⠳⣤⡈⢻⣦⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣼⠇⣰⡆⢠⡄⠀⣀⣀⣀⠙⠻⣦⡙⢿⣆⠉⠁⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠰⠿⢠⡿⠀⣿⠀⣾⠋⣉⠙⢷⣄⠈⠻⣦⡙⢳⣄⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⣤⠀⠚⠃⠀⣿⠀⣿⡀⠹⣷⡀⠙⢷⣄⠈⠻⡦⠁⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⣿⠀⣴⠰⣦⠘⣆⠈⢿⣦⡈⠻⢷⣄⠙⠻⠀⣤⠄⣰⡄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢿⡆⢻⡆⠹⣧⠙⣦⡀⠉⠻⣦⣄⠙⠳⠆⢠⡿⢀⣿⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢸⣇⠈⣿⠀⠘⢷⣌⠛⠶⡤⠀⣉⠛⠆⢠⡿⢁⣾⠃⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠟⢀⣠⣴⠦⠀⠙⢃⣀⣀⠈⠙⠛⠀⠛⢁⣾⠃⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠛⠉⣠⣴⠾⠛⢛⣉⣙⣛⡛⠗⠰⣦⠀⠁⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢠⡶⠟⢛⣉⣉⣉⡛⠛⠶⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠞⢋⣁⣠⣈⠙⠛⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

    Experiment at https://wasm.channel/
          
       Running with ❤️ by @v0id_user
       
       https://x.com/v0id_user
       https://github.com/v0id-user
       https://tree.v0id.me

        `);
});

app.get("/health", async (c) => {
	const dbViaFunction = createDb(c.env.DB);
	const authViaFunction = createAuthWithD1(dbViaFunction);
	let resultViaFunction: any;
	let didIGetTheUserViaFunction: boolean;

	try {
		let authViaFunction = createAuthWithD1(dbViaFunction);
		// Test via function
		console.log("Auth initialized via function:", !!authViaFunction);
		console.log("DB initialized via function:", !!dbViaFunction);

		resultViaFunction = await dbViaFunction.select().from(user).limit(1);
		console.log("Result via function:", resultViaFunction);
		didIGetTheUserViaFunction = resultViaFunction.length > 0;

		// Test better auth
		const session = await authViaFunction.api.getSession({
			headers: c.req.raw.headers,
		});

		// Test cache
		const cache = c.env.KV;
		cache.put("test", "test");
		const cached = await cache.get("test");
		console.log("Cached: ", cached);

		return c.json({
			success: true,
			dbReadyViaFunction: !!dbViaFunction,
			authReadyViaFunction: !!authViaFunction,
			didIGetTheUser: !didIGetTheUserViaFunction || didIGetTheUserViaFunction, // That means a call to the db was made
			isSessionValid: !!session || session === null, // That means a call to the db was made
			cached: cached,
		});
	} catch (error) {
		console.error("Auth test error:", error);
		return c.json({
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
			dbViaFunction: !!dbViaFunction,
			authViaFunction: !!authViaFunction,
			resultViaFunction: !!resultViaFunction,
			cached: false,
		});
	}
});

app.get("/openapi.json", (c) => {
	return c.json(openAPI);
});

export default {
	fetch: app.fetch,
	async queue(batch: MessageBatch<WasmPacket>, env: Env) {
		console.log("Hey the queue is working");
		for (const message of batch.messages) {
			try {
				console.log("Message: ", message);
				console.log("Body: ", message.body);
				console.log("Payload: ", message.body.payload());
				console.log("Kind: ", message.body.kind());
				console.log("Reaction kind: ", message.body.reaction_kind());
				console.log("Sent by: ", message.body.user_id());
				console.log("Message id: ", message.body.message_id());
			} catch (error) {
				// Just skip it's an experiment at the end of the day
				console.error("Error processing message:", error);
				console.error("Error details:", {
					messageId: message.id,
					body: message.body,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}
	},
};
// you must export the Room class to use it in the Durable Object
export { Room } from "./objects/room";
