"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useStoreClient } from "@/store/client";
import type { Message, User } from "@/types/chat";
import { users, getInitialMessages } from "@/constants/chat";
import { useChatReactions } from "@/hooks/chat/useChatReactions";
import { useChatSimulation } from "@/hooks/chat/useChatSimulation";
import { useChat } from "@/hooks/chat/useChat";
import { useTypingTimeout } from "@/hooks/chat/useTypingTimeout";
import { OnlineUsersBar } from "./chat/OnlineUsersBar";
import { TypingIndicator } from "./chat/TypingIndicator";
import { ChatMessage } from "./chat/ChatMessage";
import { MessageInput } from "./chat/MessageInput";
import { ChatFooter } from "./chat/ChatFooter";
import { WasmPacket } from "@/oop/packet";
import { handleIncomingPacket } from "@/utils/chat/packetConverter";

export default function Chat() {
	const { ws, me } = useStoreClient();
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [typingUsers, setTypingUsers] = useState<User[]>([]);
	const [isClient, setIsClient] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Typing timeout management
	const { addTypingUser, removeTypingUser, clearAllTimeouts } =
		useTypingTimeout(setTypingUsers);

	// Initialize on client side only
	useEffect(() => {
		setIsClient(true);
		setMessages(getInitialMessages());
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

	const { handleReactionClick } = useChatReactions(
		me?.userId || "",
		setMessages,
		ws || undefined,
	);

	const handlePacket = (packet: WasmPacket) => {
		console.log("chat.tsx: Received packet:", packet);

		const result = handleIncomingPacket(packet, me?.userId || "");
		console.log("chat.tsx: Packet conversion result:", result);

		switch (result.type) {
			case "message":
				if (result.data) {
					console.log(
						"chat.tsx: Adding message with userId:",
						result.data.userId,
					);
					setMessages((prev) => [...prev, result.data]);
				}
				break;

			case "reaction":
				// Handle reaction updates using message IDs
				if (result.data) {
					const { messageId, reactionKind, userId } = result.data;
					console.log("Reaction received:", {
						messageId,
						reactionKind,
						userId,
					});

					// Update the specific message's reactions
					setMessages((prev) =>
						prev.map((message) => {
							if (message.id !== messageId) return message;

							const existingReaction = message.reactions.find(
								(r) => r.kind === reactionKind,
							);
							const hasUserReacted =
								existingReaction?.users.includes(userId) || false;

							if (hasUserReacted) {
								// Remove user's reaction
								return {
									...message,
									reactions: message.reactions
										.map((r) => {
											if (r.kind === reactionKind) {
												const newUsers = r.users.filter((id) => id !== userId);
												return newUsers.length > 0
													? { ...r, count: newUsers.length, users: newUsers }
													: null;
											}
											return r;
										})
										.filter(Boolean) as typeof message.reactions,
								};
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
						}),
					);
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
				// You could update the users list here if needed
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
		me?.userId || "",
		ws!,
		setMessages,
		setNewMessage,
		handlePacket,
	);

	// Simulation effects
	useChatSimulation(
		isClient,
		messages,
		me?.userId || "",
		users,
		setTypingUsers,
		setMessages,
	);

	// Early return after all hooks have been called
	if (!me || !ws) {
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

	if (!isClient) {
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
				<OnlineUsersBar users={users} />

				{/* Messages Area */}
				<div className="flex-1 overflow-y-auto">
					{groupedMessages.map(({ message, showAvatar, user }) => (
						<ChatMessage
							key={message.id}
							message={message}
							user={user}
							showAvatar={showAvatar}
							onReactionClick={handleReactionClick}
							currentUserId={me?.userId}
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
