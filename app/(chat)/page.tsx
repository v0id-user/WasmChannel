"use client";

import Chat from "@/components/chat";
import { useClient } from "@/hooks/chat/useClient";
import { useStoreClient } from "@/store/client";
import { useGetMeAggressively } from "@/hooks/auth/me";

export default function Home() {
	const { bootstrapped, loadingState } = useStoreClient();
	const { clientReady } = useClient();
	const { maxRetriesReached, showRecoveryButton, manualRetry, fullRecovery, retryCount, maxRetries } = useGetMeAggressively();

	console.log("PAGE: Rendering chat page", {
		bootstrapped,
		clientReady,
		currentStep: loadingState.step,
		currentMessage: loadingState.message,
		hasError: !!loadingState.error,
		maxRetriesReached,
		showRecoveryButton,
		retryCount
	});

	if (!bootstrapped || !clientReady) {
		console.log("PAGE: Showing loading screen...");
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50" dir="rtl">
				<div className="flex flex-col items-center space-y-6 p-8">
					{/* Main spinner - hide when max retries reached */}
					{!maxRetriesReached && (
						<div className="relative">
							<div className="w-12 h-12 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
							<div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-b-gray-600 rounded-full animate-spin animation-delay-150"></div>
						</div>
					)}
					
					{/* Action buttons when max retries reached */}
					{maxRetriesReached && (
						<div className="flex flex-col items-center space-y-3">
							<button
								onClick={manualRetry}
								className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
							>
								محاولة مرة أخرى
							</button>
							
							{showRecoveryButton && (
								<button
									onClick={fullRecovery}
									className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
								>
									مسح البيانات وإعادة التحميل
								</button>
							)}
						</div>
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
							<div className={`text-sm px-3 py-2 rounded-md border max-w-md ${
								maxRetriesReached 
									? 'text-orange-700 bg-orange-50 border-orange-200' 
									: 'text-red-600 bg-red-50 border-red-200'
							}`}>
								{loadingState.error}
							</div>
						)}
						
						{/* Help text for recovery */}
						{maxRetriesReached && showRecoveryButton && (
							<div className="text-xs text-gray-500 max-w-md text-center mt-4">
								إذا استمرت المشكلة، يمكنك مسح البيانات المحفوظة وإعادة تحميل الصفحة
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
