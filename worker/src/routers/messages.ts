import { z } from "zod";
import { protectedBase } from "~/contexts";
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
		const { DB, KV, QUEUE_MESSAGES, ROOM, req, user, session } = context;

		// TODO: Return all messages from the database
		// First fetch the cache, then use the cursor if needed
		return {
			messages: [],
		};
	});
