import { RPCLink } from "@orpc/client/fetch";
import type { Router, router } from "@/worker/src/routers";
import { createORPCClient } from "@orpc/client";
import { createContext, use } from "react";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createORPCReactQueryUtils, RouterUtils } from "@orpc/react-query";
import { RouterClient } from "@orpc/server";

type ORPCReactUtils = RouterUtils<RouterClient<typeof router>>;

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			console.error(error);
			// Aggressively invalidate the cache
			query.invalidate();
		},
	}),
});

export const link = new RPCLink({
	url: `${process.env.NEXT_PUBLIC_WORKER}/rpc`,
	fetch(url, options) {
		return fetch(url, {
			...options,
			// For cross-origin requests
			credentials: "include",
		});
	},
});

export const client: Router = createORPCClient(link);

export const orpc = createORPCReactQueryUtils(client);

export const ORPCContext = createContext<ORPCReactUtils | undefined>(undefined);

export function useORPC(): ORPCReactUtils {
	const orpc = use(ORPCContext);
	if (!orpc) {
		throw new Error("ORPCContext is not set up properly");
	}
	return orpc;
}
