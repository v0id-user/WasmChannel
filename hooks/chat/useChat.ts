import { useCallback, useEffect } from "react";
import { sendMessage } from "@/oop/chat";
import { deserializePacket, WasmPacket } from "@/oop/packet";
import type { Message } from "@/types/chat";
import { users } from "@/constants/chat";
import { nanoid } from "nanoid";
import { authClient } from "@/lib/auth-client";

export function useChat(
	newMessage: string,
	isClient: boolean,
	currentUserId: string,
	ws: WebSocket | null,
	setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
	setNewMessage: React.Dispatch<React.SetStateAction<string>>,
	handlePacket: (packet: WasmPacket) => void,
) {
	// Get the actual session to verify authentication
	const { data: session, isPending: isSessionLoading } =
		authClient.useSession();

	// Check if user is authenticated:
	// 1. If we have a session, verify it matches currentUserId
	// 2. If no session, allow guest access with just currentUserId (from fingerprinting)
	const isAuthenticated = !isSessionLoading && (
		// Case 1: Has valid session that matches current user
		(!!session?.user && session.user.id === currentUserId) ||
		// Case 2: No session but has valid userId (guest/fingerprint user)
		(!session?.user && !!currentUserId)
	);

	const handleSendMessage = useCallback(() => {
		if (!newMessage.trim() || !isClient || !isAuthenticated || !ws) {
			console.log("useChat: Cannot send message - missing requirements", {
				hasMessage: !!newMessage.trim(),
				isClient,
				isAuthenticated,
				hasWs: !!ws,
				sessionLoading: isSessionLoading,
				hasSession: !!session?.user,
				userIdMatch: session?.user?.id === currentUserId,
				hasCurrentUserId: !!currentUserId,
			});
			return;
		}

		if (ws.readyState !== WebSocket.OPEN) {
			console.log("useChat: WebSocket not ready, readyState:", ws.readyState);
			return;
		}

		const messageId = nanoid();

		setNewMessage("");

		console.log("useChat: Sending message with user:", {
			messageId,
			sessionUserId: session?.user?.id || "guest",
			currentUserId,
			isGuest: !session?.user,
			content: newMessage.substring(0, 50) + "...",
		});
		sendMessage(ws, newMessage, messageId);

		if (process.env.NEXT_PUBLIC_DEBUG === "yes") {
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
							id: nanoid(),
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
	}, [
		newMessage,
		isClient,
		currentUserId,
		ws,
		setNewMessage,
		isAuthenticated,
		session,
		isSessionLoading,
	]);

	useEffect(() => {
		// Must have all required dependencies
		if (!ws || !isAuthenticated || !currentUserId) {
			console.log("useChat: Skipping WebSocket setup - not ready", {
				hasWs: !!ws,
				isAuthenticated,
				hasUserId: !!currentUserId,
				sessionLoading: isSessionLoading,
				hasSession: !!session?.user,
			});
			return;
		}

		// If we have a session, verify it matches (for authenticated users)
		if (session?.user && session.user.id !== currentUserId) {
			console.log("useChat: Session/user ID mismatch - skipping setup", {
				sessionUserId: session?.user?.id,
				currentUserId,
			});
			return;
		}

		if (ws.readyState !== WebSocket.OPEN) {
			console.log("useChat: WebSocket not open, readyState:", ws.readyState);
			return;
		}

		console.log(
			"useChat: Setting up WebSocket message handler for user:",
			{
				sessionUserId: session?.user?.id || "guest",
				currentUserId,
				isGuest: !session?.user,
			},
		);

		const handleMessage = async (event: MessageEvent) => {
			console.log("useChat: Received packet:", event.data);

			let uint8Data: Uint8Array;

			if (event.data instanceof Blob) {
				const arrayBuffer = await event.data.arrayBuffer();
				uint8Data = new Uint8Array(arrayBuffer);
			} else if (event.data instanceof ArrayBuffer) {
				uint8Data = new Uint8Array(event.data);
			} else if (event.data instanceof Uint8Array) {
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
			if (ws.onmessage === handleMessage) {
				ws.onmessage = null;
			}
		};
	}, [
		ws,
		handlePacket,
		isAuthenticated,
		currentUserId,
		session,
		isSessionLoading,
	]);

	return { handleSendMessage };
}
