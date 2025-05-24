import { ping } from "./helpers";
import { getAblyAuthToken } from "./auth";
import type { RouterClient } from "@orpc/server";

export const router = {
	helper: {
		ping,
	},
	getAblyAuthToken,
};

export type Router = RouterClient<typeof router>;
