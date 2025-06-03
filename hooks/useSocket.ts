"use client";

import { useEffect, useRef, useState } from "react";
import { useBoot } from "@/components/providers/BootProvider";

// Global singleton to prevent duplicate connections
let globalSocket: WebSocket | null = null;
let globalConnectionStarted = false;

export function useSocket() {
	const { isReady, state } = useBoot();
	const [socket, setSocket] = useState<WebSocket | null>(globalSocket);
	const connectionStartedRef = useRef(false);

	useEffect(() => {
		// If global socket exists, use it
		if (globalSocket) {
			setSocket(globalSocket);
			return;
		}

		// Only connect when fully ready and not already connected globally
		if (!isReady || globalConnectionStarted || connectionStartedRef.current) {
			return;
		}

		console.log("WEBSOCKET: Starting connection...");
		connectionStartedRef.current = true;
		globalConnectionStarted = true;

		const connectWebSocket = () => {
			try {
				const wsUrl = `${process.env.NEXT_PUBLIC_WORKER_CHAT}`;
				console.log("WEBSOCKET: Connecting to:", wsUrl);

				const ws = new WebSocket(wsUrl);

				ws.onopen = () => {
					console.log("WEBSOCKET: Connected successfully");
					globalSocket = ws;
					setSocket(ws);
				};

				ws.onclose = (event) => {
					console.log("WEBSOCKET: Connection closed", event);
					globalSocket = null;
					globalConnectionStarted = false;
					setSocket(null);
					connectionStartedRef.current = false; // Allow reconnection
				};

				ws.onerror = (error) => {
					console.error("WEBSOCKET: Connection error", error);
					globalSocket = null;
					globalConnectionStarted = false;
					setSocket(null);
					connectionStartedRef.current = false; // Allow retry
				};

				// DO NOT handle onmessage here - that's the responsibility of chat components
			} catch (error) {
				console.error("WEBSOCKET: Failed to create connection", error);
				globalConnectionStarted = false;
				connectionStartedRef.current = false; // Allow retry
			}
		};

		connectWebSocket();

		// Cleanup function
		return () => {
			if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
				console.log("WEBSOCKET: Cleaning up connection");
				globalSocket.close();
			}
			globalSocket = null;
			globalConnectionStarted = false;
			setSocket(null);
			connectionStartedRef.current = false;
		};
	}, [isReady, state.userId, state.fingerprint]);

	// Listen for global socket changes
	useEffect(() => {
		if (globalSocket && socket !== globalSocket) {
			setSocket(globalSocket);
		}
	}, [socket]);

	return socket;
}
