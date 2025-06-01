import { useCallback, useEffect } from "react";
import { sendMessage } from "@/oop/chat";
import { deserializePacket, WasmPacket } from "@/oop/packet";
import type { Message } from "@/types/chat";
import { users } from "@/constants/chat";

export function useChat(
	newMessage: string,
	isClient: boolean,
	currentUserId: string,
	ws: WebSocket,
	setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
	setNewMessage: React.Dispatch<React.SetStateAction<string>>,
	handlePacket: (packet: WasmPacket) => void,
) {
	const handleSendMessage = useCallback(() => {
		if (!newMessage.trim() || !isClient) return;

		const message: Message = {
			id: Date.now().toString(),
			userId: currentUserId,
			text: newMessage.trim(),
			timestamp: new Date(),
			reactions: [],
			isOwn: true,
		};
		setMessages((prev) => [...prev, message]);
		setNewMessage("");

		if (process.env.NEXT_PUBLIC_DEBUG === "yes") {
			// Simulate response
			setTimeout(
				() => {
					const responders = users.filter(
						(u) => u.isOnline && u.id !== currentUserId,
					);
					if (responders.length > 0) {
						const responder =
							responders[Math.floor(Math.random() * responders.length)];
						const responses = [
							"أتفق معك تماماً!",
							"فكرة رائعة 👍",
							"شكراً لك على هذه المعلومة",
							"هل يمكنك توضيح أكثر؟",
							"مثير للاهتمام!",
							"أعتقد أن لديك نقطة مهمة هنا",
						];

						const response: Message = {
							id: (Date.now() + 1).toString(),
							userId: responder.id,
							text: responses[Math.floor(Math.random() * responses.length)],
							timestamp: new Date(),
							reactions: [],
							isOwn: false,
						};
						setMessages((prev) => [...prev, response]);
					}
				},
				1000 + Math.random() * 2000,
			);
		}
		console.log("useChat: Sending message:", newMessage);
		sendMessage(ws!, newMessage);
	}, [newMessage, isClient, currentUserId, ws, setMessages, setNewMessage]);

	useEffect(() => {
		if (!ws) return;
		
		console.log("useChat: Setting up WebSocket message handler");
		
		const handleMessage = async (event: MessageEvent) => {
			console.log("useChat: Received packet:", event.data);
			
			let uint8Data: Uint8Array;
			
			// Handle different data types from WebSocket
			if (event.data instanceof Blob) {
				// Convert Blob to Uint8Array
				const arrayBuffer = await event.data.arrayBuffer();
				uint8Data = new Uint8Array(arrayBuffer);
			} else if (event.data instanceof ArrayBuffer) {
				// Convert ArrayBuffer to Uint8Array
				uint8Data = new Uint8Array(event.data);
			} else if (event.data instanceof Uint8Array) {
				// Already the correct type
				uint8Data = event.data;
			} else {
				console.error("useChat: Unsupported data type:", typeof event.data);
				return;
			}
			
			console.log("useChat: Converted to Uint8Array:", uint8Data);
			
			try {
				const packet = deserializePacket(uint8Data);
				console.log("useChat: Deserialized packet:", packet);
				handlePacket(packet);
			} catch (error) {
				console.error("useChat: Failed to deserialize packet:", error);
			}
		};
		
		ws.onmessage = handleMessage;
		console.log("useChat: WebSocket onmessage handler assigned");
		
		return () => {
			console.log("useChat: Cleaning up WebSocket message handler");
			ws.onmessage = null;
		};
	}, [ws, handlePacket]);

	return { handleSendMessage };
}
