import { ping, pong } from "./helpers";
import { RouterClient } from "@orpc/server";

export const router = {
	ping,
	pong,
};
export type Router = RouterClient<typeof router>;
