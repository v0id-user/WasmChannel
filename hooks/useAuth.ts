"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { useBoot } from "@/components/providers/BootProvider";

export function useAuth() {
	const { state, dispatch } = useBoot();
	const authStartedRef = useRef(false);
	const { data: session, isPending } = authClient.useSession();

	useEffect(() => {
		// Only run when fingerprinting is complete and we haven't started auth yet
		if (
			state.step !== "signing-in" ||
			authStartedRef.current ||
			state.authReady ||
			!state.fingerprint ||
			isPending
		) {
			return;
		}

		console.log("AUTH: Starting authentication process...");
		authStartedRef.current = true;

		const authenticateUser = async () => {
			try {
				if (session !== null) {
					dispatch({
						type: "AUTH_READY",
						payload: { userId: session.user.id },
					});
					return;
				}
				const fingerprint = state.fingerprint!;
				const email = `${fingerprint}@wasm.channel`;

				console.log("AUTH: Attempting to sign in existing user...");

				// Try to sign in existing user
				const signInResponse = await authClient.signIn.email({
					email,
					password: fingerprint,
				});

				if (signInResponse.data?.user) {
					console.log("AUTH: Successfully signed in existing user");
					dispatch({
						type: "AUTH_READY",
						payload: { userId: signInResponse.data.user.id },
					});
					return;
				}

				console.log("AUTH: Sign in failed, attempting to create new user...");

				// Create new user if sign in fails
				const signUpResponse = await authClient.signUp.email({
					email,
					password: fingerprint,
					name: fingerprint,
				});

				if (signUpResponse.data?.user) {
					console.log("AUTH: Successfully created new user");
					dispatch({
						type: "AUTH_READY",
						payload: { userId: signUpResponse.data.user.id },
					});
					return;
				}

				throw new Error("Both sign in and sign up failed");
			} catch (error) {
				console.error("AUTH: Authentication failed:", error);
				dispatch({
					type: "AUTH_ERROR",
					payload:
						error instanceof Error ? error.message : "Authentication failed",
				});
			}
		};

		authenticateUser();
	}, [state.step, state.fingerprint, state.authReady, dispatch, isPending]);
}
