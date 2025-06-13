import { ORPCError } from "@orpc/server";
import { protectedBase } from "~/contexts";
import { DatabaseDriver, CacheDriver } from "~/driver/storage";

export const getMessages = protectedBase.messages.get.handler(
	async ({ context, input }) => {
		console.log("[getMessages] Starting message fetch");
		const { DB, KV } = context;
		console.log("[getMessages] Input parameters:", input);

		// Create drivers
		console.log("[getMessages] Initializing drivers");
		const cacheDriver = new CacheDriver(KV);
		const dbDriver = new DatabaseDriver(DB);
		console.log("[getMessages] Drivers initialized");

		try {
			// if there is a cursor don't return cache
			if (!input.cursor) {
				console.log("[getMessages] No cursor provided, attempting cache fetch");
				// First try to get messages from cache
				const cachedMessages = await cacheDriver.getMessages(input.limit || 50);
				console.log(
					"[getMessages] Cache fetch result:",
					cachedMessages?.length || 0,
					"messages",
				);

				if (cachedMessages && cachedMessages.length > 0) {
					const output = {
						messages: cachedMessages.map((msg) => ({
							...msg,

							// Very bad hack
							createdAt: msg.createdAt || new Date(),
							updatedAt: msg.updatedAt || new Date(),
						})),
						source: "cache" as const,
					};
					console.log("[getMessages] Returning messages from cache", output);
					return output;
				}
				console.log("[getMessages] Cache empty or no results");
			} else {
				console.log("[getMessages] Cursor provided, skipping cache");
			}

			// If cache is empty, fallback to database
			console.log("[getMessages] Fetching messages from database");
			const dbMessages = await dbDriver.getMessages(
				input.limit || 50,
				input.cursor,
			);
			console.log(
				"[getMessages] Database fetch result:",
				dbMessages.length,
				"messages",
			);

			const output = {
				messages: dbMessages.map((msg) => ({
					...msg,
					// Very bad hack
					createdAt: msg.createdAt || new Date(),
					updatedAt: msg.updatedAt || new Date(),
				})),
				source: "database" as const,
			};

			console.log("[getMessages] Returning messages from database:", output);
			return output;
		} catch (error) {
			console.error("[getMessages] Error fetching messages:", error);
			throw new ORPCError("Failed to fetch messages");
		}
	},
);
