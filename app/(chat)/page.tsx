"use client";

import Chat from "@/components/chat";
import { useBoot } from "@/components/providers/BootProvider";

export default function ChatPage() {
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
				className="flex items-center justify-center min-h-screen bg-gray-50"
				dir="rtl"
			>
				<div className="flex flex-col items-center space-y-6 p-8">
					<div className="text-center space-y-4">
						<div className="text-lg font-medium text-red-600">
							حدث خطأ أثناء التحميل
						</div>
						<div className="text-sm text-red-500 max-w-md">{state.error}</div>
						<button
							onClick={() => window.location.reload()}
							className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
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
				className="flex items-center justify-center min-h-screen bg-gray-50"
				dir="rtl"
			>
				<div className="flex flex-col items-center space-y-6 p-8">
					{/* Main spinner */}
					<div className="relative">
						<div className="w-12 h-12 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
						<div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-b-gray-600 rounded-full animate-spin animation-delay-150"></div>
					</div>

					{/* Status message */}
					<div className="text-center space-y-2">
						<div className="text-lg font-medium text-black">
							{state.message}
						</div>

						{/* Subtle step indicator */}
						<div className="text-xs text-gray-500 font-mono">
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
									className={`w-2 h-2 rounded-full transition-all duration-300 ${
										isCompleted
											? "bg-black"
											: isActive
												? "bg-gray-600 animate-pulse"
												: "bg-gray-300"
									}`}
								/>
							);
						})}
					</div>
				</div>
			</div>
		);
	}

	console.log("PAGE: All ready! Rendering chat component...");
	return <Chat />;
}
