"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useBoot } from "@/components/providers/BootProvider";
import { useRoomStore } from "@/store/room";
// import { useSocket } from "@/hooks/useSocket"; // Removed: Socket initialization handled by SocketGate provider
import type { Message, User } from "@/types/chat";
import { users, getInitialMessages } from "@/constants/chat";
import { useChatSimulation } from "@/hooks/chat/useChatSimulation";
import { useChat } from "@/hooks/chat/useChat";
import { useTypingTimeout } from "@/hooks/chat/useTypingTimeout";
import { OnlineUsersBar } from "./chat/OnlineUsersBar";
import { TypingIndicator } from "./chat/TypingIndicator";
import { ChatMessage } from "./chat/ChatMessage";
import { MessageInput } from "./chat/MessageInput";
import { ChatFooter } from "./chat/ChatFooter";
import { WasmPacket, createPacket, serializePacket } from "@/oop/packet";
import { handleIncomingPacket } from "@/utils/chat/packetConverter";
import { PacketKind, ReactionKind } from "@/utils/wasm/init";

export default function Chat() {
	const { state: bootState } = useBoot();
	const { socket: ws } = useRoomStore();
	// useSocket(); // Initialize socket connection - REMOVED: Already handled by SocketGate provider
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [typingUsers, setTypingUsers] = useState<User[]>([]);
	const [onlineUsersCount, setOnlineUsersCount] = useState<number>(0);
	const [isClient, setIsClient] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Typing timeout management
	const { addTypingUser, removeTypingUser, clearAllTimeouts } =
		useTypingTimeout(setTypingUsers);

	// Initialize on client side only
	useEffect(() => {
		setIsClient(true);
		// Initialize with static users count for fallback
		setOnlineUsersCount(users.filter(u => u.isOnline).length);
		if (process.env.NEXT_PUBLIC_DEBUG === "yes") {
			setMessages(getInitialMessages());
		}
	}, []);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, typingUsers, scrollToBottom]);

	// Cleanup timeouts on unmount
	useEffect(() => {
		return () => {
			clearAllTimeouts();
		};
	}, [clearAllTimeouts]);

	const handleReactionClickWithWS = useCallback(
		(messageId: string, reactionKind: ReactionKind) => {
			if (!ws || !bootState.userId) return;

			// Check if user has already reacted with this reaction type
			const message = messages.find((m) => m.id === messageId);
			if (message) {
				const existingReaction = message.reactions.find(
					(r) => r.kind === reactionKind,
				);
				const hasUserReacted =
					existingReaction?.users.includes(bootState.userId) || false;

				// If user has already reacted, don't send the packet (disable removing reactions)
				if (hasUserReacted) {
					console.log(
						"User has already reacted with this reaction type, ignoring click.\nNo ability to remove reactions :P",
					);
					return;
				}
			}

			try {
				// Create reaction packet
				const reactionPacket = createPacket(
					PacketKind.Reaction,
					reactionKind,
					new TextEncoder().encode(messageId), // Pass messageId as payload
				);

				// Send via WebSocket
				const serializedPacket = serializePacket(reactionPacket);
				ws.send(serializedPacket);

				console.log("Sent reaction packet:", { messageId, reactionKind });
			} catch (error) {
				console.error("Error sending reaction:", error);
			}
		},
		[ws, bootState.userId, messages],
	);

	const handlePacket = (packet: WasmPacket) => {
		console.log("chat.tsx: Received packet:", packet);

		const result = handleIncomingPacket(packet, bootState.userId || "");
		console.log("chat.tsx: Packet conversion result:", result);

		switch (result.type) {
			case "message":
				if (result.data) {
					console.log(
						"chat.tsx: Adding message to UI state:",
						{
							id: result.data.id,
							userId: result.data.userId,
							text: result.data.text,
							currentMessagesCount: messages.length,
						}
					);
					setMessages((prev) => {
						const newMessages = [...prev, result.data];
						console.log("🔥 chat.tsx: Messages state updated, new count:", newMessages.length);
						return newMessages;
					});
				} else {
					console.log("❌ chat.tsx: Received message packet but result.data is null");
				}
				break;

			case "reaction":
				// Handle reaction updates using message IDs (only add reactions, never remove)
				if (result.data) {
					const { messageId, reactionKind, userId } = result.data;

					// Update the specific message's reactions
					setMessages((prev) => {
						const updated = prev.map((message) => {
							if (message.id !== messageId) {
								return message;
							}

							const existingReaction = message.reactions.find(
								(r) => r.kind === reactionKind,
							);
							const hasUserReacted =
								existingReaction?.users.includes(userId) || false;

							// Only add reactions, never remove them
							if (hasUserReacted) {
								// User has already reacted, do nothing (don't remove)
								return message;
							} else {
								// Add user's reaction
								if (existingReaction) {
									return {
										...message,
										reactions: message.reactions.map((r) =>
											r.kind === reactionKind
												? {
														...r,
														count: r.count + 1,
														users: [...r.users, userId],
													}
												: r,
										),
									};
								} else {
									return {
										...message,
										reactions: [
											...message.reactions,
											{ kind: reactionKind, count: 1, users: [userId] },
										],
									};
								}
							}
						});

						return updated;
					});
				}
				break;

			case "typing":
				// Handle typing indicators with timeout
				if (result.data) {
					const { userId, isTyping } = result.data;
					const user = users.find((u) => u.id === userId);
					if (user) {
						if (isTyping) {
							addTypingUser(user); // Automatically sets timeout
						} else {
							removeTypingUser(userId); // Manually stop typing
						}
					}
				}
				break;

			case "joined":
				// Handle user joined notifications
				console.log("User joined:", result.data);
				break;

			case "online_users":
				// Handle online users list updates
				console.log("Online users update:", result.data);
				if (result.data && typeof result.data === 'number') {
					const onlineCount = result.data;
					console.log("Updating online users count to:", onlineCount);
					
					setOnlineUsersCount(onlineCount);
				}
				break;

			case "delete":
				// Handle message deletion
				if (result.data) {
					const { messageId, userId } = result.data;
					console.log("Message deleted:", { messageId, userId });

					// Remove the message from the chat
					setMessages((prev) =>
						prev.filter((message) => message.id !== messageId),
					);
				}
				break;

			default:
				console.log("Unknown packet type:", result);
		}
	};

	// Only call useChat when ws is available, otherwise provide dummy values
	const { handleSendMessage } = useChat(
		newMessage,
		isClient,
		bootState.userId || "",
		ws,
		setMessages,
		setNewMessage,
		handlePacket,
	);

	// Simulation effects
	useChatSimulation(
		isClient,
		messages,
		bootState.userId || "",
		users,
		setTypingUsers,
		setMessages,
	);

	// Early return after all hooks have been called - must have valid userId
	if (!bootState.userId || !ws || !isClient) {
		console.log("chat.tsx: Waiting...");
		console.log("Client state:", isClient);
		console.log("WebSocket state:", ws);
		console.log("User ID:", bootState.userId);
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="w-full max-w-2xl h-96 bg-white rounded-lg shadow-lg border border-gray-200">
					<div className="h-full flex items-center justify-center">
						<div className="text-gray-500">جاري التحميل...</div>
					</div>
				</div>
			</div>
		);
	}

	// At this point, bootState.userId is guaranteed to be a valid string
	const currentUserId = bootState.userId;

	// Group messages by user to show avatars only for first message in sequence
	const groupedMessages = messages.reduce(
		(acc, message, index) => {
			const prevMessage = messages[index - 1];
			const showAvatar = !prevMessage || prevMessage.userId !== message.userId;

			// Find user or create a fallback user with userId as name
			const foundUser = users.find((u) => u.id === message.userId);
			const user = foundUser || {
				id: message.userId,
				name: message.userId, // Use userId as name
				isOnline: true,
			};

			if (!foundUser) {
				console.log(
					"chat.tsx: Creating fallback user for userId:",
					message.userId,
				);
			}

			acc.push({
				message,
				showAvatar,
				user,
			});
			return acc;
		},
		[] as Array<{ message: Message; showAvatar: boolean; user: User }>,
	);

	return (
		<div
			className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4"
			dir="rtl"
		>
			<div className="w-full max-w-2xl h-[600px] bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col chat-container">
				{/* Header */}
				<div className="bg-gray-900 text-white p-3 rounded-t-lg flex-shrink-0">
					<h1 className="text-sm font-medium">قناة التجريب</h1>
					<p className="text-xs text-gray-400">مشروع تجريبي للدردشة</p>
				</div>

				{/* Online Users Bar */}
				<OnlineUsersBar onlineUsersCount={onlineUsersCount} />

				{/* Messages Area */}
				<div className="flex-1 overflow-y-auto">
					{groupedMessages.map(({ message, showAvatar, user }) => (
						<ChatMessage
							key={message.id}
							message={message}
							user={user}
							showAvatar={showAvatar}
							onReactionClick={handleReactionClickWithWS}
							currentUserId={currentUserId}
						/>
					))}

					{/* Typing Indicator */}
					<TypingIndicator typingUsers={typingUsers} />

					<div ref={messagesEndRef} />
				</div>

				{/* Message Input */}
				<MessageInput
					newMessage={newMessage}
					setNewMessage={setNewMessage}
					onSendMessage={handleSendMessage}
				/>
			</div>

			<ChatFooter />
		</div>
	);
}
