import { Hono } from "hono";
import { router } from "./routers";
import { cors } from "hono/cors";
import { createDb } from "./db";
import { createAuthWithD1 } from "@/auth";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { OpenAPIGenerator } from "@orpc/openapi";
import { Cloudflare } from "@cloudflare/workers-types";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { Room } from "./objects/room";
import { PacketKind, ReactionKind, WasmPacket } from "@/wasm/wasmchannel";
import { user } from "./db/schema/schema";
import { createPacket, serializePacket, deserializePacket } from "@/oop";
import { DatabaseDriver } from "~/driver/storage";
import { CORSPlugin } from "@orpc/server/plugins";

export type Env = Cloudflare.Env & {
	DB: D1Database;
	KV: KVNamespace;
	QUEUE_MESSAGES: Queue<Uint8Array>;
	ROOM: DurableObjectNamespace<Room>;
};

type Context = {
	room: DurableObjectStub<Room>;
};

// Hono app
const app = new Hono<{ Bindings: Env; Variables: Context }>();

// RPC handler
const handler = new OpenAPIHandler(router, {
	plugins: [
		new CORSPlugin({
			origin: (origin) => origin,
			allowMethods: ["POST", "OPTIONS"],
			allowHeaders: ["Content-Type", "Authorization"],
			exposeHeaders: ["Content-Length"],
			credentials: true,
		}),
	],
});
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
	"*",
	cors({
		origin: process.env.FRONTEND_URL || "http://localhost:3000",
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["POST", "GET", "OPTIONS"],
		exposeHeaders: ["Content-Length"],
		credentials: true,
	}),
);

// Handle auth routes
app.on(["POST", "GET"], "/api/auth/*", (c) => {
	const db = createDb(c.env.DB);
	return createAuthWithD1(db).handler(c.req.raw);
});

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
			      #V0ID
         ,-.
        / \\  '.  __..-,O
       :   \\ --''_..-'.'
       |    . .-' '. '.
       :     .     .'.'
        \\     '.  /  ..
         \\      '.   ' .
          ',       '.   \\
         ,|,'.        '-.\\
        '.||  ''-...__..-'
         |  |
         |__|
         /||\\
        //||\\\\
       // || \\\\
    __//__||__\\\\__
   '--------------'

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

		// Test cache, this might not work because of the "eventually consistent" problem, but it's a test in an experimental project :P
		const cache = c.env.KV;
		cache.put("test", "test");
		const cached = await cache.get("test");
		console.log("Cached: ", cached);

		// Test wasm protocol
		const packet = createPacket(
			PacketKind.Message,
			ReactionKind.Like,
			new Uint8Array(Buffer.from("test")),
		);

		const serialized = serializePacket(packet);
		const deserialized = deserializePacket(serialized);

		console.log("Deserialized: ", deserialized);

		return c.json({
			success: true,
			dbReadyViaFunction: !!dbViaFunction,
			authReadyViaFunction: !!authViaFunction,
			didIGetTheUser: !didIGetTheUserViaFunction || didIGetTheUserViaFunction, // That means a call to the db was made
			isSessionValid: !!session || session === null, // That means a call to the db was made
			cached: cached,
			rusty_rust: deserialized.kind() === PacketKind.Message,
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
			rusty_rust: false,
		});
	}
});

app.get("/openapi.json", (c) => {
	return c.json(openAPI);
});

export default {
	fetch: app.fetch,
	async queue(batch: MessageBatch<Uint8Array>, env: Env) {
		console.log(
			"Processing queue batch with",
			batch.messages.length,
			"messages",
		);

		// Create database driver for persistence
		const dbDriver = new DatabaseDriver(env.DB);

		// Separate messages and reactions for batch processing
		const messagePackets: WasmPacket[] = [];
		const reactionTasks: Promise<{
			success: boolean;
			messageId: string;
			userId: string;
		}>[] = [];

		for (const message of batch.messages) {
			try {
				const body =
					message.body instanceof Uint8Array
						? message.body
						: new Uint8Array(message.body);
				const packet = deserializePacket(body);
				const packetKind = packet.kind();

				if (packetKind === PacketKind.Message) {
					// Collect message packets for batch insert
					messagePackets.push(packet);
				} else if (packetKind === PacketKind.Reaction) {
					// Queue reaction tasks for parallel processing
					const messageId = packet.message_id()!;
					const reactionKind = packet.reaction_kind()!;
					const userId = packet.user_id()!;

					reactionTasks.push(
						dbDriver
							.updateReaction(messageId, reactionKind, userId)
							.then((success) => ({ success, messageId, userId }))
							.catch((error) => {
								console.error(
									`Failed to update reaction for message ${messageId} by user ${userId}:`,
									error,
								);
								return { success: false, messageId, userId };
							}),
					);
				}
			} catch (error) {
				console.error("Error processing message:", error);
				console.error("Error details:", {
					messageId: message.id,
					body: message.body,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		// Process messages in batch
		if (messagePackets.length > 0) {
			try {
				await dbDriver.write(messagePackets);
				console.log(
					`Successfully saved ${messagePackets.length} messages to database`,
				);
			} catch (error) {
				console.error("Error saving messages batch:", error);
			}
		}

		// Process reactions in parallel
		if (reactionTasks.length > 0) {
			try {
				const results = await Promise.allSettled(reactionTasks);
				const successful = results.filter(
					(r) => r.status === "fulfilled" && r.value.success,
				).length;
				const failed = results.filter(
					(r) =>
						r.status === "rejected" ||
						(r.status === "fulfilled" && !r.value.success),
				).length;

				console.log(
					`Reaction processing complete: ${successful} successful, ${failed} failed out of ${reactionTasks.length} total`,
				);

				// Log failed reactions for debugging
				if (failed > 0) {
					const failedReactions = results
						.filter(
							(r) =>
								r.status === "rejected" ||
								(r.status === "fulfilled" && !r.value.success),
						)
						.map((r) =>
							r.status === "fulfilled" ? r.value : { error: r.reason },
						);
					console.error("Failed reactions:", failedReactions);
				}
			} catch (error) {
				console.error("Error processing reactions:", error);
			}
		}
	},
};
// you must export the Room class to use it in the Durable Object
export { Room } from "./objects/room";
