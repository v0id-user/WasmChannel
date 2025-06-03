"use client";
import { useStoreClient } from "@/store/client";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

// Helper function to add delays
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useClient() {
	const { bootstrapped, setWs, me, setLoadingState } = useStoreClient();
	const client = useRef<WebSocket | null>(null);
	const [clientReady, setClientReady] = useState<boolean>(false);
	const retryCount = useRef(0);
	const retryTimeout = useRef<NodeJS.Timeout | null>(null);
	const maxRetries = 5;
	const retryDelay = 2000; // 2 seconds

	// Get the actual session to verify authentication
	const { data: session, isPending: isSessionLoading } =
		authClient.useSession();

	useEffect(() => {
		// First check: Bootstrap must be complete
		if (!bootstrapped) {
			console.log("WEBSOCKET: Waiting for bootstrap to complete...");
			return;
		}

		// Second check: Session must be loaded (not pending)
		if (isSessionLoading) {
			console.log("WEBSOCKET: Waiting for session to load...");
			return;
		}

		// Third check: Must have valid session (user is actually authenticated)
		if (!session?.user) {
			console.log("WEBSOCKET: No valid session found - user not authenticated");
			return;
		}

		// Fourth check: Must have credentials in store (from successful auth)
		if (!me?.userId || !me?.fingerprint) {
			console.log(
				"WEBSOCKET: Waiting for authentication credentials to be stored...",
			);
			return;
		}

		// Fifth check: Session user ID must match store user ID (consistency check)
		if (session.user.id !== me.userId) {
			console.log(
				"WEBSOCKET: Session/store user ID mismatch - waiting for sync",
			);
			return;
		}

		const connectWebSocket = async () => {
			// Clean up existing connection
			if (client.current) {
				console.log("WEBSOCKET: Cleaning up existing connection...");
				client.current.close();
				client.current = null;
			}

			// Clear any pending retry timeout
			if (retryTimeout.current) {
				clearTimeout(retryTimeout.current);
				retryTimeout.current = null;
			}

			console.log(
				"WEBSOCKET: All authentication checks passed - connecting with verified credentials:",
				{
					sessionUserId: session.user.id,
					storeUserId: me.userId,
					fingerprint: me.fingerprint.substring(0, 8) + "...",
				},
			);

			setLoadingState({ step: "websocket-connecting" });

			// Add small delay before connecting to prevent rapid attempts
			await sleep(500);

			const ws = new WebSocket(process.env.NEXT_PUBLIC_WORKER_CHAT!);

			ws.onopen = () => {
				console.log("WEBSOCKET: Connected to chat worker successfully");
				setClientReady(true);
				setLoadingState({ step: "websocket-ready" });
				retryCount.current = 0; // Reset retry count on successful connection
			};

			ws.onclose = (event) => {
				console.log("WEBSOCKET: Disconnected from chat worker", {
					code: event.code,
					reason: event.reason,
				});
				setClientReady(false);

				// Retry on various error conditions, but not on normal closure
				const shouldRetry =
					event.code !== 1000 && // Not normal closure
					event.code !== 1001 && // Not going away
					retryCount.current < maxRetries;

				if (shouldRetry) {
					retryCount.current += 1;
					console.log(
						`WEBSOCKET: Retrying connection (${retryCount.current}/${maxRetries}) in ${retryDelay}ms...`,
					);
					setLoadingState({
						step: "websocket-connecting",
						message: `إعادة محاولة الاتصال... (${retryCount.current}/${maxRetries})`,
					});
					retryTimeout.current = setTimeout(() => {
						// Check if component is still mounted and we should still retry
						if (retryCount.current <= maxRetries) {
							connectWebSocket();
						}
					}, retryDelay);
				} else if (retryCount.current >= maxRetries) {
					console.error(
						"WEBSOCKET: Max retries reached, giving up connection attempts",
					);
					setLoadingState({
						step: "websocket-connecting",
						error: "فشل في الاتصال بالخادم",
					});
				}
			};

			ws.onerror = (error) => {
				console.error("WEBSOCKET: WebSocket error:", error);
				setLoadingState({
					step: "websocket-connecting",
					error: "خطأ في الاتصال بالخادم",
				});
			};

			client.current = ws;
			setWs(ws);
		};

		console.log(
			"WEBSOCKET: Starting connection process with authenticated user...",
		);
		connectWebSocket();

		// Cleanup function
		return () => {
			console.log("WEBSOCKET: Cleaning up WebSocket connection");
			if (retryTimeout.current) {
				clearTimeout(retryTimeout.current);
				retryTimeout.current = null;
			}
			if (client.current) {
				client.current.close();
				client.current = null;
			}
		};
	}, [bootstrapped, setWs, me, setLoadingState, session, isSessionLoading]);

	return {
		clientReady,
	};
}
