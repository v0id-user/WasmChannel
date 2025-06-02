import { useState, useEffect } from "react";
import { initWasm } from "@/utils/wasm/init";
import { useStoreClient } from "@/store/client";

export function useWasmInit() {
	const [isReady, setIsReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { setLoadingState } = useStoreClient();

	useEffect(() => {
		setLoadingState({ step: "wasm-loading" });
		
		initWasm()
			.then(() => {
				setIsReady(true);
				setLoadingState({ step: "wasm-ready" });
				console.log("WASM initialized");
			})
			.catch((err) => {
				setError("Failed to initialize WASM module");
				setLoadingState({ 
					step: "wasm-loading", 
					error: "فشل في تحميل الوحدات المطلوبة" 
				});
				console.error("WASM initialization error:", err);
			});
	}, [setLoadingState]);

	return { isReady, error };
}
