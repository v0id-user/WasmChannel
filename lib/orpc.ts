import type { ContractRouterClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { createORPCClient } from "@orpc/client";
import { createContext, use } from "react";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createORPCReactQueryUtils, RouterUtils } from "@orpc/react-query";
import { contract } from "@/shared/orpc/router";

declare global {
	let $client:
		| JsonifiedClient<ContractRouterClient<typeof contract>>
		| undefined;
}
export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			console.error(error);
			// Aggressively invalidate the cache
			query.invalidate();
		},
	}),
});

export const link = new OpenAPILink(contract, {
	url: `${process.env.NEXT_PUBLIC_WORKER?.replace(/\/$/, "")}/rpc`,
	fetch(url, options) {
		return fetch(url, {
			...options,
			// For cross-origin requests
			credentials: "include",
		});
	},
});

const client: JsonifiedClient<ContractRouterClient<typeof contract>> =
	createORPCClient(link);

export const orpc = createORPCReactQueryUtils(client);

export const ORPCContext = createContext<
	RouterUtils<ContractRouterClient<typeof contract>> | undefined
>(undefined);

export function useORPC(): RouterUtils<ContractRouterClient<typeof contract>> {
	const orpc = use(ORPCContext);
	if (!orpc) {
		throw new Error("ORPCContext is not set up properly");
	}
	return orpc;
}
