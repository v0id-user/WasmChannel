import { ping, pong } from "./helpers";
import type { RouterClient } from "@orpc/server";

export const router = {
	ping,
	pong,
};
export type Router = RouterClient<typeof router>;
