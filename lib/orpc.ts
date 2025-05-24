import { RPCLink } from "@orpc/client/fetch";
import type { Router } from "@/worker/src/routers";
import { createORPCClient } from "@orpc/client";

export const link = new RPCLink({
	url: "http://127.0.0.1:8787/rpc",
});

export const client: Router = createORPCClient(link);
