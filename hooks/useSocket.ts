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

		const connectWebSocket = () => {
			try {
				const wsUrl = `${process.env.NEXT_PUBLIC_WORKER_CHAT}`;
				console.log("WEBSOCKET: Connecting to:", wsUrl);

				const ws = new WebSocket(wsUrl);

				ws.onopen = () => {
					console.log("WEBSOCKET: Connected successfully");
					setSocket(ws);
					setConnectionStatus('connected');
				};

				ws.onclose = (event) => {
					console.log("WEBSOCKET: Connection closed", event);
					setSocket(null);
					setConnectionStatus('disconnected');
					globalConnectionStarted = false;
					connectionStartedRef.current = false; // Allow reconnection
				};

				ws.onerror = (error) => {
					console.error("WEBSOCKET: Connection error", error);
					setSocket(null);
					setConnectionStatus('error');
					globalConnectionStarted = false;
					connectionStartedRef.current = false; // Allow retry
				};

				// DO NOT handle onmessage here - that's the responsibility of chat components
			} catch (error) {
				console.error("WEBSOCKET: Failed to create connection", error);
				setConnectionStatus('error');
				globalConnectionStarted = false;
				connectionStartedRef.current = false; // Allow retry
			}
		};

		connectWebSocket();

		// Cleanup function
		return () => {
			const currentSocket = useRoomStore.getState().socket;
			if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
				console.log("WEBSOCKET: Cleaning up connection");
				currentSocket.close();
			}
			setSocket(null);
			setConnectionStatus('disconnected');
			globalConnectionStarted = false;
			connectionStartedRef.current = false;
		};
	}, [isReady, state.userId, state.fingerprint, socket, setSocket, setConnectionStatus]);

	return socket;
}
