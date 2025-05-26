import { protectedBase } from "~/contexts";

export const getMessages = protectedBase
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
