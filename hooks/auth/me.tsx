"use client";

import { authClient } from "@/lib/auth-client";
import { useStoreClient } from "@/store/client";
import { getFingerprint } from "@thumbmarkjs/thumbmarkjs";
import { useEffect, useState } from "react";

interface MeData {
	fingerprint: string | null;
	userId: string | null;
}

// Helper function to add delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useGetMeAggressively() {
	const store = useStoreClient();
	const [meData, setMeData] = useState<MeData>({
		fingerprint: null,
		userId: null,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [hasInitialized, setHasInitialized] = useState(false);
	const { data: session, isPending: isSessionLoading } =
		authClient.useSession();

	useEffect(() => {
		// Prevent spamming by only running once
		if (hasInitialized) return;

		const fetchMe = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Wait for session to be ready
				if (isSessionLoading) {
					return;
				}

				// First, check if we already have data in the store
				const existingData = store.me;
				if (existingData && existingData.fingerprint && existingData.userId) {
					console.log("Using existing data from store");
					setMeData(existingData);
					setHasInitialized(true);
					return;
				}

				// If we have a valid session, use it
				if (session?.user && session !== null) {
					console.log("Using existing session");
					const fingerprint = session.user.email.split("@")[0];
					const newMeData = {
						fingerprint,
						userId: session.user.id,
					};
					store.setMe(newMeData);
					setMeData(newMeData);
					setHasInitialized(true);
					return;
				}

				console.log("Starting fingerprint authentication process...");
				
				// Add delay before starting fingerprint process
				await sleep(1000);

				// Get browser fingerprint for new user
				const fingerprint = await getFingerprint();
				const email = `${fingerprint}@wasm.channel`;

				console.log("Attempting to sign in existing user...");
				
				// Add delay before sign in attempt
				await sleep(1000);

				// Try to sign in existing user
				const signInResponse = await authClient.signIn.email({
					email,
					password: fingerprint,
				});

				if (signInResponse.data?.user) {
					console.log("Successfully signed in existing user");
					const newMeData = {
						fingerprint,
						userId: signInResponse.data.user.id,
					};
					store.setMe(newMeData);
					setMeData(newMeData);
					setHasInitialized(true);
					return;
				}

				console.log("Sign in failed, attempting to create new user...");
				
				// Add delay before sign up attempt
				await sleep(1000);

				// Create new user if sign in fails
				const signUpResponse = await authClient.signUp.email({
					email,
					password: fingerprint,
					name: fingerprint,
				});

				if (signUpResponse.data?.user) {
					console.log("Successfully created new user");
					const newMeData = {
						fingerprint,
						userId: signUpResponse.data.user.id,
					};
					store.setMe(newMeData);
					setMeData(newMeData);
					setHasInitialized(true);
					return;
				}

				console.log("All authentication attempts failed");
				
				// Reset state if all attempts fail
				setMeData({
					fingerprint: null,
					userId: null,
				});
				setHasInitialized(true);
			} catch (err) {
				console.error("Authentication error:", err);
				setError(
					err instanceof Error ? err : new Error("An unknown error occurred"),
				);
				setHasInitialized(true);
			} finally {
				setIsLoading(false);
			}
		};

		fetchMe();
	}, [store, isSessionLoading, session, hasInitialized]);

	// Cleanup effect - only runs on unmount
	useEffect(() => {
		return () => {
			console.log("Cleaning up authentication state");
			authClient.signOut();
			setMeData({
				fingerprint: null,
				userId: null,
			});
			setHasInitialized(false);
		};
	}, []);

	return {
		...meData,
		isLoading,
		error,
	};
}
