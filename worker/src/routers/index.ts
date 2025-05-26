import { ping } from "./helpers";
import { getMessages } from "./auth";
import type { RouterClient } from "@orpc/server";

export const router = {
	helper: {
		ping,
	},
	getMessages,
};

export type Router = RouterClient<typeof router>;
