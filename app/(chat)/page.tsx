"use client";

import Chat from "@/components/chat";
import { useClient } from "@/hooks/chat/useClient";
import { useStoreClient } from "@/store/client";
import { useGetMeAggressively } from "@/hooks/auth/me";

export default function Home() {
	const { bootstrapped, loadingState } = useStoreClient();
	const { clientReady } = useClient();
	const { maxRetriesReached, manualRetry, retryCount, maxRetries } = useGetMeAggressively();

	console.log("PAGE: Rendering chat page", {
		bootstrapped,
		clientReady,
		currentStep: loadingState.step,
		currentMessage: loadingState.message,
		hasError: !!loadingState.error,
		maxRetriesReached,
		retryCount
	});

	if (!bootstrapped || !clientReady) {
		console.log("PAGE: Showing loading screen...");
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<div className="flex flex-col items-center space-y-6 p-8">
					{/* Main spinner - hide when max retries reached */}
					{!maxRetriesReached && (
						<div className="relative">
							<div className="w-12 h-12 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
							<div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-b-gray-600 rounded-full animate-spin animation-delay-150"></div>
						</div>
					)}
					
					{/* Manual retry button when max retries reached */}
					{maxRetriesReached && (
						<button
							onClick={manualRetry}
							className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
						>
							إعادة المحاولة
						</button>
					)}
					
					{/* Status message */}
					<div className="text-center space-y-2">
						<div className="text-lg font-medium text-black">
							{loadingState.message}
						</div>
						
						{/* Retry counter when in auth phase */}
						{loadingState.step.startsWith('auth') && !maxRetriesReached && retryCount > 0 && (
							<div className="text-sm text-gray-600">
								المحاولة {retryCount} من {maxRetries}
							</div>
						)}
						
						{/* Error message if any */}
						{loadingState.error && (
							<div className={`text-sm px-3 py-2 rounded-md border ${
								maxRetriesReached 
									? 'text-orange-700 bg-orange-50 border-orange-200' 
									: 'text-red-600 bg-red-50 border-red-200'
							}`}>
								{loadingState.error}
							</div>
						)}
						
						{/* Subtle step indicator */}
						<div className="text-xs text-gray-500 font-mono">
							{loadingState.step.replace('-', ' ')}
						</div>
					</div>
					
					{/* Progress dots */}
					<div className="flex space-x-1">
						{['wasm', 'auth', 'websocket'].map((step) => {
							const isActive = 
								(step === 'wasm' && ['wasm-loading', 'wasm-ready'].includes(loadingState.step)) ||
								(step === 'auth' && ['auth-fingerprint', 'auth-signin', 'auth-signup', 'auth-ready'].includes(loadingState.step)) ||
								(step === 'websocket' && ['websocket-connecting', 'websocket-ready'].includes(loadingState.step));
							
							const isCompleted = 
								(step === 'wasm' && ['auth-fingerprint', 'auth-signin', 'auth-signup', 'auth-ready', 'websocket-connecting', 'websocket-ready', 'complete'].includes(loadingState.step)) ||
								(step === 'auth' && ['websocket-connecting', 'websocket-ready', 'complete'].includes(loadingState.step)) ||
								(step === 'websocket' && loadingState.step === 'complete');
							
							const hasError = 
								(step === 'auth' && maxRetriesReached);
							
							return (
								<div
									key={step}
									className={`w-2 h-2 rounded-full transition-all duration-300 ${
										hasError
											? 'bg-orange-500'
											: isCompleted 
												? 'bg-black' 
												: isActive 
													? 'bg-gray-600 animate-pulse' 
													: 'bg-gray-300'
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
