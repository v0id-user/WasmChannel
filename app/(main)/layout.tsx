"use client";

import { useEffect, useState } from "react";
import { initWasm } from "@/utils/wasm/init";

export default function MainLayout({
	children,
}: { children: React.ReactNode }) {
	const [wasmReady, setWasmReady] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		initWasm()
			.then(() => {
				setWasmReady(true);
				console.log("WASM initialized in layout");
			})
			.catch((err) => {
				setError("Failed to initialize WASM module");
				console.error("WASM initialization error:", err);
			});
	}, []);

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen p-4">
				<div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>
			</div>
		);
	}

	if (!wasmReady) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen p-4">
				<div className="flex flex-col items-center gap-4">
					<div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
