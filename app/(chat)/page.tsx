"use client";

import Chat from "@/components/chat";
import { useBoot } from "@/components/providers/BootProvider";
import BannerMessage from "@/components/BannerMessage";
export default function ChatPage() {
	/*
	 * Use the useBoot hook to get a.k.a. consume the current state
	 *
	 * The state is updated by the dispatch function from other components
	 */
	const { isReady, hasError, state } = useBoot();

	console.log("PAGE: Rendering chat page", {
		isReady,
		hasError,
		currentStep: state.step,
		currentMessage: state.message,
		error: state.error,
	});

	if (hasError) {
		return (
			<div
				className="flex items-center justify-center min-h-screen font-mono"
				style={{ backgroundColor: "#F3F3F3" }}
				dir="rtl"
			>
				<div className="flex flex-col items-center space-y-6 p-8">
					<div className="text-center space-y-4">
						<div
							className="text-lg font-bold font-mono"
							style={{ color: "#000000" }}
						>
							حدث خطأ أثناء التحميل
						</div>
						<div
							className="text-sm font-mono max-w-md"
							style={{ color: "#0143EB" }}
						>
							{state.error}
						</div>
						<button
							onClick={() => window.location.reload()}
							className="px-6 py-3 border font-bold font-mono transition-colors tracking-wide uppercase"
							style={{
								backgroundColor: "#0143EB",
								color: "#FFFFFF",
								borderColor: "#000000",
							}}
							onMouseEnter={(e) => {
								(e.target as HTMLButtonElement).style.backgroundColor =
									"#000000";
								(e.target as HTMLButtonElement).style.color = "#FFFFFF";
							}}
							onMouseLeave={(e) => {
								(e.target as HTMLButtonElement).style.backgroundColor =
									"#0143EB";
								(e.target as HTMLButtonElement).style.color = "#FFFFFF";
							}}
						>
							إعادة تحميل الصفحة
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (!isReady) {
		console.log("PAGE: Showing loading screen...");
		return (
			<div
				className="flex items-center justify-center min-h-screen font-mono"
				style={{ backgroundColor: "#F3F3F3" }}
				dir="rtl"
			>
				<div className="flex flex-col items-center space-y-6 p-8">
					{/* Main spinner */}
					<div className="relative">
						<div
							className="w-12 h-12 border rounded-full animate-spin"
							style={{ borderColor: "#000000", borderTopColor: "transparent" }}
						></div>
						<div
							className="absolute inset-0 w-12 h-12 border border-transparent rounded-full animate-spin animation-delay-150"
							style={{ borderBottomColor: "#0143EB" }}
						></div>
					</div>

					{/* Status message */}
					<div className="text-center space-y-2">
						<div
							className="text-lg font-bold font-mono"
							style={{ color: "#000000" }}
						>
							{state.message}
						</div>

						{/* Subtle step indicator */}
						<div className="text-xs font-mono" style={{ color: "#0143EB" }}>
							{state.step.replace("-", " ")}
						</div>
					</div>

					{/* Progress dots */}
					<div className="flex space-x-1">
						{["wasm", "fingerprint", "auth"].map((step) => {
							const isActive =
								(step === "wasm" &&
									["wasm-loading", "wasm-ready"].includes(state.step)) ||
								(step === "fingerprint" && state.step === "fingerprinting") ||
								(step === "auth" && state.step === "signing-in");

							const isCompleted =
								(step === "wasm" &&
									[
										"wasm-ready",
										"fingerprinting",
										"signing-in",
										"ready",
									].includes(state.step)) ||
								(step === "fingerprint" &&
									["signing-in", "ready"].includes(state.step)) ||
								(step === "auth" && state.step === "ready");

							return (
								<div
									key={step}
									className="w-2 h-2 border transition-all duration-300"
									style={{
										backgroundColor: isCompleted
											? "#000000"
											: isActive
												? "#0143EB"
												: "#F3F3F3",
										borderColor: "#000000",
									}}
								/>
							);
						})}
					</div>
				</div>
			</div>
		);
	}

	console.log("PAGE: All ready! Rendering chat component...");
	return (
		<>
			<BannerMessage />
			<Chat />
		</>
	);
}
