import { getMessages } from "./messages";
import type { RouterClient } from "@orpc/server";

export const router = {
	messages: {
		get: getMessages,
	},
};

export type Router = RouterClient<typeof router>;
