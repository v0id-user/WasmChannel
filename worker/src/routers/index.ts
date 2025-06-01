import { ping } from "./helpers";
import { get } from "./messages";
import type { RouterClient } from "@orpc/server";

export const router = {
	helper: {
		ping,
	},
	chat: {
		get,
	},
};

export type Router = RouterClient<typeof router>;
