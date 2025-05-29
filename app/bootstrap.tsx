"use client";

import { useStoreClient } from "@/store/client";
import { useEffect } from "react";
import { useGetMeAggressively } from "@/hooks/auth/me";
import { useWasmInit } from "@/hooks/wasm";

export default function useClientBootstrap() {
	const { setBootstrapped } = useStoreClient();
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
				setBootstrapped(true);
			}
		}
		main();
	}, [fingerprint, userId, isLoading, authError, wasmReady, wasmError]);

	return <></>;
}
