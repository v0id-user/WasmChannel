"use client";
import { useStoreClient } from "@/store/client";
import { useEffect, useRef, useState } from "react";

export function useClient() {
	const { bootstrapped, setWs } = useStoreClient();
	const client = useRef<WebSocket | null>(null);
	const [clientReady, setClientReady] = useState<boolean>(false);
	const retryCount = useRef(0);
	const retryTimeout = useRef<NodeJS.Timeout | null>(null);
	const maxRetries = 5;
	const retryDelay = 2000; // 2 seconds

	useEffect(() => {
		if (!bootstrapped) return;

		const connectWebSocket = () => {
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

			const ws = new WebSocket(process.env.NEXT_PUBLIC_WORKER_CHAT!);

			ws.onopen = () => {
				console.log("Connected to chat worker");
				setClientReady(true);
				retryCount.current = 0; // Reset retry count on successful connection
			};

			ws.onclose = (event) => {
				console.log("Disconnected from chat worker", {
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
						`Retrying connection (${retryCount.current}/${maxRetries}) in ${retryDelay}ms...`,
					);
					retryTimeout.current = setTimeout(() => {
						// Check if component is still mounted and we should still retry
						if (retryCount.current <= maxRetries) {
							connectWebSocket();
						}
					}, retryDelay);
				} else if (retryCount.current >= maxRetries) {
					console.error("Max retries reached, giving up connection attempts");
				}
			};

			ws.onerror = (error) => {
				console.error("WebSocket error:", error);
			};

			client.current = ws;
			setWs(ws);
		};

		connectWebSocket();

		// Cleanup function
		return () => {
			if (retryTimeout.current) {
				clearTimeout(retryTimeout.current);
				retryTimeout.current = null;
			}
			if (client.current) {
				client.current.close();
				client.current = null;
			}
		};
	}, [bootstrapped, setWs]);

	return {
		clientReady,
	};
}
