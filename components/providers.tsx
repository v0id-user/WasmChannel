"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, orpc, ORPCContext } from "@/lib/orpc";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<ORPCContext.Provider value={orpc}>{children}</ORPCContext.Provider>
			<ReactQueryDevtools />
		</QueryClientProvider>
	);
}
