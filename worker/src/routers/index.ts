import { ping } from "./helpers";
import { get, send } from "./messages";
import type { RouterClient } from "@orpc/server";

export const router = {
	helper: {
		ping,
	},
	chat: {
		get,
		send,
	},
};

export type Router = RouterClient<typeof router>;
