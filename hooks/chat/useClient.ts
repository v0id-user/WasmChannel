"use client";
import { useStoreClient } from "@/store/client";
import { useEffect, useRef, useState } from "react";

export function useClient() {
	const { bootstrapped, setWs } = useStoreClient();
	const client = useRef<WebSocket | null>(null);
	const [clientReady, setClientReady] = useState<boolean>(false);
	const retryCount = useRef(0);
	const maxRetries = 5;
	const retryDelay = 2000; // 2 seconds

	useEffect(() => {
		if (!bootstrapped) return;

		const connectWebSocket = () => {
			const ws = new WebSocket(process.env.NEXT_PUBLIC_WORKER_CHAT!);

			ws.onopen = () => {
				console.log("Connected to chat worker");
				setClientReady(true);
				retryCount.current = 0; // Reset retry count on successful connection
			};

			ws.onclose = (event) => {
				console.log("Disconnected from chat worker");
				setClientReady(false);

				// Check if it's an unauthorized error and we haven't exceeded retry limit
				if (event.code === 401 && retryCount.current < maxRetries) {
					retryCount.current += 1;
					console.log(
						`Retrying connection (${retryCount.current}/${maxRetries})...`,
					);
					setTimeout(connectWebSocket, retryDelay);
				}
			};

			client.current = ws;
			setWs(ws);
		};

		connectWebSocket();
	}, [bootstrapped, setWs]);

	useEffect(() => {
		return () => {
			if (client.current) {
				client.current.close();
			}
		};
	}, []);
	return {
		clientReady,
	};
}
