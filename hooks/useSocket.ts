"use client";

import { useEffect, useRef } from "react";
import { useBoot } from "@/components/providers/BootProvider";
import { useRoomStore } from "@/store/room";

// Global flag to prevent duplicate connections
let globalConnectionStarted = false;

export function useSocket() {
	const { isReady, state } = useBoot();
	const { socket, setSocket, setConnectionStatus } = useRoomStore();
	const connectionStartedRef = useRef(false);
	const retryCountRef = useRef(0);
	const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		// If socket already exists, we're good
		if (socket) {
			return;
		}

		// Only connect when fully ready and not already connecting
		if (!isReady || globalConnectionStarted || connectionStartedRef.current) {
			return;
		}

		console.log("WEBSOCKET: Starting connection...");
		connectionStartedRef.current = true;
		globalConnectionStarted = true;
		setConnectionStatus('connecting');

		const connectWebSocket = (attempt: number = 1) => {
			try {
				const wsUrl = `${process.env.NEXT_PUBLIC_WORKER_CHAT}`;
				console.log(`WEBSOCKET: Connecting to: ${wsUrl} (attempt ${attempt}/5)`);

				const ws = new WebSocket(wsUrl);

				ws.onopen = () => {
					console.log("WEBSOCKET: Connected successfully");
					setSocket(ws);
					setConnectionStatus('connected');
					retryCountRef.current = 0; // Reset retry count on successful connection
					if (retryTimeoutRef.current) {
						clearTimeout(retryTimeoutRef.current);
						retryTimeoutRef.current = null;
					}
				};

				ws.onclose = (event) => {
					console.log("WEBSOCKET: Connection closed", event);
					setSocket(null);
					setConnectionStatus('disconnected');
					
					// Retry logic
					if (retryCountRef.current < 5) {
						retryCountRef.current++;
						console.log(`WEBSOCKET: Retrying in 1 second (attempt ${retryCountRef.current}/5)`);
						retryTimeoutRef.current = setTimeout(() => {
							connectWebSocket(retryCountRef.current);
						}, 1000);
					} else {
						console.log("WEBSOCKET: Max retry attempts reached, giving up");
						globalConnectionStarted = false;
						connectionStartedRef.current = false;
						retryCountRef.current = 0;
					}
				};

				ws.onerror = (error) => {
					console.error("WEBSOCKET: Connection error", error);
					setSocket(null);
					setConnectionStatus('error');
					
					// The onclose event will handle retries, so we don't retry here
				};

				// DO NOT handle onmessage here - that's the responsibility of chat components
			} catch (error) {
				console.error("WEBSOCKET: Failed to create connection", error);
				setConnectionStatus('error');
				
				// Retry logic for connection creation errors
				if (retryCountRef.current < 5) {
					retryCountRef.current++;
					console.log(`WEBSOCKET: Retrying in 1 second (attempt ${retryCountRef.current}/5)`);
					retryTimeoutRef.current = setTimeout(() => {
						connectWebSocket(retryCountRef.current);
					}, 1000);
				} else {
					console.log("WEBSOCKET: Max retry attempts reached, giving up");
					globalConnectionStarted = false;
					connectionStartedRef.current = false;
					retryCountRef.current = 0;
				}
			}
		};

		connectWebSocket();

		// Cleanup function
		return () => {
			// Clear any pending retry timeout
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = null;
			}
			
			const currentSocket = useRoomStore.getState().socket;
			if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
				console.log("WEBSOCKET: Cleaning up connection");
				currentSocket.close();
			}
			setSocket(null);
			setConnectionStatus('disconnected');
			globalConnectionStarted = false;
			connectionStartedRef.current = false;
			retryCountRef.current = 0;
		};
	}, [isReady, state.userId, state.fingerprint, socket, setSocket, setConnectionStatus]);

	return socket;
}
