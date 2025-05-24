import { ping, pong } from "./helpers";
import { getAblyAuthToken } from "./auth";
import type { RouterClient } from "@orpc/server";

export const router = {
	ping,
	pong,
	getAblyAuthToken,
};

export type Router = RouterClient<typeof router>;
