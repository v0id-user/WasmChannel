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
	} = useGetMeAggressively();
	const { isReady: wasmReady, error: wasmError } = useWasmInit();

	useEffect(() => {
		async function main() {
			if (
				fingerprint &&
				userId &&
				!isLoading &&
				!authError &&
				wasmReady &&
				!wasmError
			) {
				// Both auth and WASM are ready
				setLoadingState({ step: "complete" });
				// Add a small delay to show the completion message
				setTimeout(() => {
					setBootstrapped(true);
				}, 800);
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
	]);

	return <></>;
}
