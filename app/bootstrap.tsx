"use client";

import { useStoreClient } from "@/store/client";
import { useEffect } from "react";
import { useGetMeAggressively } from "@/hooks/auth/me";
import { useWasmInit } from "@/hooks/wasm";

export default function useClientBootstrap() {
	const { setBootstrapped, setLoadingState } = useStoreClient();
	const {
		fingerprint,
		userId,
		isLoading,
		error: authError,
		maxRetriesReached,
	} = useGetMeAggressively();
	const { isReady: wasmReady, error: wasmError } = useWasmInit();

	useEffect(() => {
		async function main() {
			console.log("BOOTSTRAP: Checking readiness...", {
				fingerprint: !!fingerprint,
				userId: !!userId,
				isLoading,
				authError: !!authError,
				wasmReady,
				wasmError: !!wasmError,
				maxRetriesReached,
			});

			if (
				fingerprint &&
				userId &&
				!isLoading &&
				!authError &&
				wasmReady &&
				!wasmError &&
				!maxRetriesReached
			) {
				// Both auth and WASM are ready
				console.log("BOOTSTRAP: All systems ready! Completing initialization...");
				setLoadingState({ step: "complete" });
				// Add a small delay to show the completion message
				setTimeout(() => {
					console.log("BOOTSTRAP: Bootstrap completed successfully!");
					setBootstrapped(true);
				}, 800);
			} else {
				console.log("BOOTSTRAP: Still waiting for dependencies...");
			}
		}
		main();
	}, [
		fingerprint,
		userId,
		isLoading,
		authError,
		wasmReady,
		wasmError,
		setBootstrapped,
		setLoadingState,
		maxRetriesReached,
	]);

	return <></>;
}
