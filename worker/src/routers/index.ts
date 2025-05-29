import { ping } from "./helpers";
import { get } from "./messages";
import { health } from "./health";
import type { RouterClient } from "@orpc/server";

export const router = {
	helper: {
		ping,
		health,
	},
	chat: {
		get,
	},
};

export type Router = RouterClient<typeof router>;
