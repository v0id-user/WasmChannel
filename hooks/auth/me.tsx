"use client";

import { authClient } from "@/lib/auth-client";
import { useStoreClient } from "@/store/client";
import { getFingerprint } from "@thumbmarkjs/thumbmarkjs";
import { useEffect, useState } from "react";

interface MeData {
	fingerprint: string | null;
	userId: string | null;
}

export function useGetMeAggressively() {
	const store = useStoreClient();
	const [meData, setMeData] = useState<MeData>({
		fingerprint: null,
		userId: null,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const { data: session, isPending: isSessionLoading } =
		authClient.useSession();

	useEffect(() => {
		const fetchMe = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Wait for session to be ready
				if (isSessionLoading) {
					return;
				}

				// If we have a valid session, use it
				if (session?.user && session !== null) {
					const fingerprint = session.user.email.split("@")[0];
					const newMeData = {
						fingerprint,
						userId: session.user.id,
					};
					store.setMe(newMeData);
					setMeData(newMeData);
					return;
				}

				// Fallback to stored data if available
				if (store.me) {
					setMeData({
						fingerprint: store.me.fingerprint,
						userId: store.me.userId,
					});
					return;
				}

				// Get browser fingerprint for new user
				const fingerprint = await getFingerprint();
				const email = `${fingerprint}@wasm.channel`;

				// Try to sign in existing user
				const signInResponse = await authClient.signIn.email({
					email,
					password: fingerprint,
				});

				if (signInResponse.data?.user) {
					const newMeData = {
						fingerprint,
						userId: signInResponse.data.user.id,
					};
					store.setMe(newMeData);
					setMeData(newMeData);
					return;
				}

				// Create new user if sign in fails
				const signUpResponse = await authClient.signUp.email({
					email,
					password: fingerprint,
					name: fingerprint,
				});

				if (signUpResponse.data?.user) {
					const newMeData = {
						fingerprint,
						userId: signUpResponse.data.user.id,
					};
					store.setMe(newMeData);
					setMeData(newMeData);
					return;
				}

				// Reset state if all attempts fail
				setMeData({
					fingerprint: null,
					userId: null,
				});
			} catch (err) {
				setError(
					err instanceof Error ? err : new Error("An unknown error occurred"),
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchMe();

		
	}, [store, isSessionLoading, session]);


	useEffect(() => {
		return () => {
			authClient.signOut();
			setMeData({
				fingerprint: null,
				userId: null,
			});
		};
	}, []);

	return {
		...meData,
		isLoading,
		error,
	};
}
