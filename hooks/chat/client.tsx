"use client";
import { useStoreClient } from "@/store/client";
import { useEffect, useRef, useState } from "react";

export function useChatClient() {
	const { bootstrapped, setWs } = useStoreClient();
	const client = useRef<WebSocket | null>(null);
	const [clientReady, setClientReady] = useState<boolean>(false);

	useEffect(() => {
		if (!bootstrapped) return;

		const ws = new WebSocket(process.env.NEXT_PUBLIC_WORKER_CHAT!);

		ws.onopen = () => {
			console.log("Connected to chat worker");
			setClientReady(true);
		};

		ws.onclose = () => {
			console.log("Disconnected from chat worker");
			setClientReady(false);
		};

		client.current = ws;
		setWs(ws);

		return () => {
			ws.close();
		};
	}, [bootstrapped, setWs]);

	return {
		clientReady,
	};
}
