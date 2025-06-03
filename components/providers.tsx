"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, orpc, ORPCContext } from "@/lib/orpc";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BootProvider } from "./providers/BootProvider";
import { WasmGate } from "./providers/WasmGate";
import { AuthGate } from "./providers/AuthGate";
import { SocketGate } from "./providers/SocketGate";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<ORPCContext.Provider value={orpc}>
				<BootProvider>
					<WasmGate />
					<AuthGate />
					<SocketGate />
					{children}
				</BootProvider>
			</ORPCContext.Provider>
			<ReactQueryDevtools />
		</QueryClientProvider>
	);
}
