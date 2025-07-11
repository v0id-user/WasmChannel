"use client";

import { useEffect, useRef } from "react";
import { useBoot } from "@/components/providers/BootProvider";
import { useRoomStore } from "@/store/room";
import { create } from "zustand";

// Super unhinged global flag to prevent duplicate connections :-O
type SocketFlags = {
	connectionStarted: boolean;
	setConnectionStarted: (started: boolean) => void;
};

export const useSocketFlags = create<SocketFlags>((set) => ({
	connectionStarted: false,
	setConnectionStarted: (started) => set({ connectionStarted: started }),
}));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useSocket() {
	const { isReady, state } = useBoot();
	const { socket, setSocket, setConnectionStatus } = useRoomStore();
	const connectionStartedRef = useRef(false);
	const retryCountRef = useRef(0);
	const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const { connectionStarted, setConnectionStarted } = useSocketFlags();

	useEffect(() => {
		// If socket already exists, we're good
		if (socket) {
			return;
		}

		// Only connect when fully ready and not already connecting
		if (!isReady || connectionStarted || connectionStartedRef.current) {
			return;
		}

		console.log("WEBSOCKET: Starting connection...");
		connectionStartedRef.current = true;
		setConnectionStarted(true);
		setConnectionStatus("connecting");

		const connectWebSocket = async (attempt: number = 1) => {
			try {
				const wsUrl = `${process.env.NEXT_PUBLIC_WORKER_CHAT}`;
				console.log(
					`WEBSOCKET: Connecting to: ${wsUrl} (attempt ${attempt}/5)`,
				);
				// Hard sleep to prevent duplicate connections | I know not the best way but it works :P
				await sleep(3000);
				const ws = new WebSocket(wsUrl);

				ws.onopen = () => {
					console.log("WEBSOCKET: Connected successfully");
					setSocket(ws);
					setConnectionStatus("connected");
					retryCountRef.current = 0; // Reset retry count on successful connection
					if (retryTimeoutRef.current) {
						clearTimeout(retryTimeoutRef.current);
						retryTimeoutRef.current = null;
					}
				};

				ws.onclose = (event) => {
					console.log("WEBSOCKET: Connection closed", event);
					setSocket(null);
					setConnectionStatus("disconnected");

					// Retry logic
					if (retryCountRef.current < 5) {
						retryCountRef.current++;
						console.log(
							`WEBSOCKET: Retrying in 1 second (attempt ${retryCountRef.current}/5)`,
						);
						retryTimeoutRef.current = setTimeout(() => {
							connectWebSocket(retryCountRef.current);
						}, 1000);
					} else {
						console.log("WEBSOCKET: Max retry attempts reached, giving up");
						setConnectionStarted(false);
						connectionStartedRef.current = false;
						retryCountRef.current = 0;
					}
				};

				ws.onerror = (error) => {
					console.error("WEBSOCKET: Connection error", error);
					setSocket(null);
					setConnectionStatus("error");

					// The onclose event will handle retries, so we don't retry here
				};

				// DO NOT handle onmessage here - that's the responsibility of chat components
			} catch (error) {
				console.error("WEBSOCKET: Failed to create connection", error);
				setConnectionStatus("error");

				// Retry logic for connection creation errors
				if (retryCountRef.current < 5) {
					retryCountRef.current++;
					console.log(
						`WEBSOCKET: Retrying in 1 second (attempt ${retryCountRef.current}/5)`,
					);
					retryTimeoutRef.current = setTimeout(() => {
						connectWebSocket(retryCountRef.current);
					}, 1000);
				} else {
					console.log("WEBSOCKET: Max retry attempts reached, giving up");
					setConnectionStarted(false);
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
			setConnectionStatus("disconnected");
			setConnectionStarted(false);
			connectionStartedRef.current = false;
			retryCountRef.current = 0;
		};
	}, [
		isReady,
		state.userId,
		state.fingerprint,
		setSocket,
		setConnectionStatus,
	]);

	return socket;
}
