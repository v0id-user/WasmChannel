import { z } from "zod";
import { protectedBase } from "~/contexts";
import { DatabaseDriver, CacheDriver } from "~/driver/storage";

const getMessagesSchema = z.object({
	cursor: z.string().optional(),
	limit: z.number().optional(),
});

export const get = protectedBase
	.route({
		path: "/messages",
		method: "GET",
		summary: "Get all messages",
		description: "Get all messages from the database",
		deprecated: false,
		tags: ["auth", "chat", "protected"],
		successDescription: "Returns all messages from the database",
	})
	.input(getMessagesSchema)
	.handler(async ({ context, input }) => {
		const { DB, KV } = context;

		// Create drivers
		const cacheDriver = new CacheDriver(KV);
		const dbDriver = new DatabaseDriver(DB);

		try {
			// if there is a cursor don't return cache
			if (!input.cursor) {
				// First try to get messages from cache
				const cachedMessages = await cacheDriver.getMessages(input.limit || 50);

				if (cachedMessages && cachedMessages.length > 0) {
					return {
						messages: cachedMessages,
						source: "cache",
					};
				}
			}
			// If cache is empty, fallback to database
			const dbMessages = await dbDriver.getMessages(
				input.limit || 50,
				input.cursor,
			);

			return {
				messages: dbMessages,
				source: "database",
			};
		} catch (error) {
			console.error("Error fetching messages:", error);
			return {
				messages: [],
				error: "Failed to fetch messages",
			};
		}
	});
