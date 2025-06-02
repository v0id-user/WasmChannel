"use client";
import { useStoreClient } from "@/store/client";
import { useEffect, useRef, useState } from "react";

// Helper function to add delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useClient() {
	const { bootstrapped, setWs, me } = useStoreClient();
	const client = useRef<WebSocket | null>(null);
	const [clientReady, setClientReady] = useState<boolean>(false);
	const retryCount = useRef(0);
	const retryTimeout = useRef<NodeJS.Timeout | null>(null);
	const maxRetries = 5;
	const retryDelay = 2000; // 2 seconds

	useEffect(() => {
		if (!bootstrapped) {
			console.log("useClient: Waiting for bootstrap to complete...");
			return;
		}

		if (!me?.userId || !me?.fingerprint) {
			console.log("useClient: Waiting for authentication credentials...");
			return;
		}

		const connectWebSocket = async () => {
			// Clean up existing connection
			if (client.current) {
				client.current.close();
				client.current = null;
			}

			// Clear any pending retry timeout
			if (retryTimeout.current) {
				clearTimeout(retryTimeout.current);
				retryTimeout.current = null;
			}

			console.log("useClient: Connecting to WebSocket with credentials:", {
				userId: me.userId,
				fingerprint: me.fingerprint.substring(0, 8) + "..."
			});

			// Add small delay before connecting to prevent rapid attempts
			await sleep(500);

			const ws = new WebSocket(process.env.NEXT_PUBLIC_WORKER_CHAT!);

			ws.onopen = () => {
				console.log("useClient: Connected to chat worker successfully");
				setClientReady(true);
				retryCount.current = 0; // Reset retry count on successful connection
			};

			ws.onclose = (event) => {
				console.log("useClient: Disconnected from chat worker", {
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
						`useClient: Retrying connection (${retryCount.current}/${maxRetries}) in ${retryDelay}ms...`,
					);
					retryTimeout.current = setTimeout(() => {
						// Check if component is still mounted and we should still retry
						if (retryCount.current <= maxRetries) {
							connectWebSocket();
						}
					}, retryDelay);
				} else if (retryCount.current >= maxRetries) {
					console.error("useClient: Max retries reached, giving up connection attempts");
				}
			};

			ws.onerror = (error) => {
				console.error("useClient: WebSocket error:", error);
			};

			client.current = ws;
			setWs(ws);
		};

		connectWebSocket();

		// Cleanup function
		return () => {
			console.log("useClient: Cleaning up WebSocket connection");
			if (retryTimeout.current) {
				clearTimeout(retryTimeout.current);
				retryTimeout.current = null;
			}
			if (client.current) {
				client.current.close();
				client.current = null;
			}
		};
	}, [bootstrapped, setWs, me]);

	return {
		clientReady,
	};
}
