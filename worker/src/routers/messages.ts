import { z } from "zod";
import { protectedBase } from "~/contexts";

const sendMessageSchema = z.object({
	message: z.string(),
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
	.handler(async ({ context }) => {
		const { db, session } = context;

		// TODO: Return all messages from the database
		return {
			messages: [],
		};
	});

export const send = protectedBase
	.route({
		path: "/messages",
		summary: "Send a message",
		description: "Send a message to the database fallback.",
		deprecated: false,
		tags: ["auth", "chat", "protected"],
		successDescription: "Returns the message that was sent",
	})
	.input(sendMessageSchema)
	.handler(async ({ context, input }) => {
		const { db, session } = context;

		// TODO: Send a message to the database
		return {
			message: "Message sent",
		};
	});
