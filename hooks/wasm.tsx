import { useState, useEffect } from "react";
import { initWasm } from "@/utils/wasm/init";
import { useStoreClient } from "@/store/client";

export function useWasmInit() {
	const [isReady, setIsReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { setLoadingState } = useStoreClient();

	useEffect(() => {
		console.log("WASM: Starting initialization...");
		setLoadingState({ step: "wasm-loading" });

		initWasm()
			.then(() => {
				console.log("WASM: Initialization completed successfully");
				setIsReady(true);
				setLoadingState({ step: "wasm-ready" });
				console.log("WASM initialized");
			})
			.catch((err) => {
				console.error("WASM: Initialization failed:", err);
				setError("Failed to initialize WASM module");
				setLoadingState({
					step: "wasm-loading",
					error: "فشل في تحميل الوحدات المطلوبة",
				});
				console.error("WASM initialization error:", err);
			});
	}, [setLoadingState]);

	return { isReady, error };
}
