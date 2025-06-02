"use client";

import { authClient } from "@/lib/auth-client";
import { useStoreClient } from "@/store/client";
import { getFingerprint } from "@thumbmarkjs/thumbmarkjs";
import { useEffect, useState, useRef } from "react";

interface MeData {
	fingerprint: string | null;
	userId: string | null;
}

// Helper function to add delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useGetMeAggressively() {
	const store = useStoreClient();
	const { setLoadingState } = store;
	const [meData, setMeData] = useState<MeData>({
		fingerprint: null,
		userId: null,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [hasInitialized, setHasInitialized] = useState(false);
	const [retryCount, setRetryCount] = useState(0);
	const [maxRetriesReached, setMaxRetriesReached] = useState(false);
	const isRunning = useRef(false);
	const maxRetries = 5;
	
	const { data: session, isPending: isSessionLoading } =
		authClient.useSession();

	const manualRetry = () => {
		console.log("AUTH: Manual retry initiated");
		setRetryCount(0);
		setMaxRetriesReached(false);
		setHasInitialized(false);
		setError(null);
		isRunning.current = false;
	};

	useEffect(() => {
		// Prevent multiple simultaneous runs
		if (isRunning.current || hasInitialized || maxRetriesReached) {
			return;
		}

		// Check retry limit
		if (retryCount >= maxRetries) {
			console.log("AUTH: Max retries reached, stopping automatic attempts");
			setMaxRetriesReached(true);
			setLoadingState({ 
				step: "auth-fingerprint", 
				error: "تم الوصول للحد الأقصى من المحاولات - انقر للمحاولة مرة أخرى" 
			});
			return;
		}

		const fetchMe = async () => {
			if (isRunning.current) return;
			isRunning.current = true;
			
			try {
				console.log(`AUTH: Starting authentication process... (attempt ${retryCount + 1}/${maxRetries})`);
				setIsLoading(true);
				setError(null);

				// Wait for session to be ready
				if (isSessionLoading) {
					console.log("AUTH: Waiting for session to load...");
					isRunning.current = false;
					return;
				}

				// First, check if we already have data in the store
				const existingData = store.me;
				if (existingData && existingData.fingerprint && existingData.userId) {
					console.log("AUTH: Using existing credentials from store");
					setMeData(existingData);
					setLoadingState({ step: "auth-ready" });
					setHasInitialized(true);
					isRunning.current = false;
					return;
				}

				// If we have a valid session, use it
				if (session?.user && session !== null) {
					console.log("AUTH: Using existing session");
					const fingerprint = session.user.email.split("@")[0];
					const newMeData = {
						fingerprint,
						userId: session.user.id,
					};
					store.setMe(newMeData);
					setMeData(newMeData);
					setLoadingState({ step: "auth-ready" });
					setHasInitialized(true);
					isRunning.current = false;
					return;
				}

				console.log("AUTH: Starting fingerprint authentication process...");
				setLoadingState({ step: "auth-fingerprint" });
				
				// Add delay before starting fingerprint process
				await sleep(1000);

				// Get browser fingerprint for new user
				console.log("AUTH: Generating browser fingerprint...");
				const fingerprint = await getFingerprint();
				const email = `${fingerprint}@wasm.channel`;
				console.log("AUTH: Fingerprint generated:", fingerprint.substring(0, 8) + "...");

				console.log("AUTH: Attempting to sign in existing user...");
				setLoadingState({ step: "auth-signin" });
				
				// Add delay before sign in attempt
				await sleep(1000);

				// Try to sign in existing user
				const signInResponse = await authClient.signIn.email({
					email,
					password: fingerprint,
				});

				if (signInResponse.data?.user) {
					console.log("AUTH: Successfully signed in existing user");
					const newMeData = {
						fingerprint,
						userId: signInResponse.data.user.id,
					};
					store.setMe(newMeData);
					setMeData(newMeData);
					setLoadingState({ step: "auth-ready" });
					setHasInitialized(true);
					isRunning.current = false;
					return;
				}

				console.log("AUTH: Sign in failed, attempting to create new user...");
				setLoadingState({ step: "auth-signup" });
				
				// Add delay before sign up attempt
				await sleep(1000);

				// Create new user if sign in fails
				const signUpResponse = await authClient.signUp.email({
					email,
					password: fingerprint,
					name: fingerprint,
				});

				if (signUpResponse.data?.user) {
					console.log("AUTH: Successfully created new user");
					const newMeData = {
						fingerprint,
						userId: signUpResponse.data.user.id,
					};
					store.setMe(newMeData);
					setMeData(newMeData);
					setLoadingState({ step: "auth-ready" });
					setHasInitialized(true);
					isRunning.current = false;
					return;
				}

				console.error("AUTH: All authentication attempts failed");
				setRetryCount(prev => prev + 1);
				setLoadingState({ 
					step: "auth-fingerprint", 
					error: `فشل في التحقق من الهوية (محاولة ${retryCount + 1}/${maxRetries})` 
				});
				
				// Reset state if all attempts fail
				setMeData({
					fingerprint: null,
					userId: null,
				});
				isRunning.current = false;
			} catch (err) {
				console.error("AUTH: Authentication error:", err);
				setError(
					err instanceof Error ? err : new Error("An unknown error occurred"),
				);
				setRetryCount(prev => prev + 1);
				setLoadingState({ 
					step: "auth-fingerprint", 
					error: `خطأ في التحقق من الهوية (محاولة ${retryCount + 1}/${maxRetries})` 
				});
				isRunning.current = false;
			} finally {
				setIsLoading(false);
			}
		};

		fetchMe();
	}, [store, isSessionLoading, session, hasInitialized, setLoadingState, retryCount, maxRetriesReached]);

	// Cleanup effect - only runs on unmount
	useEffect(() => {
		return () => {
			console.log("AUTH: Cleaning up authentication state");
			authClient.signOut();
			setMeData({
				fingerprint: null,
				userId: null,
			});
			setHasInitialized(false);
			isRunning.current = false;
		};
	}, []);

	return {
		...meData,
		isLoading,
		error,
		maxRetriesReached,
		manualRetry,
		retryCount,
		maxRetries,
	};
}
