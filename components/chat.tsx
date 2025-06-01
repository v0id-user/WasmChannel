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
	const { ws } = useStoreClient();
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [typingUsers, setTypingUsers] = useState<User[]>([]);
	const [isClient, setIsClient] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const { me } = useStoreClient();

	// Typing timeout management
	const { addTypingUser, removeTypingUser, clearAllTimeouts } =
		useTypingTimeout(setTypingUsers);

	// Cleanup timeouts on unmount
	useEffect(() => {
		return () => {
			clearAllTimeouts();
		};
	}, [clearAllTimeouts]);

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

	const { handleReactionClick } = useChatReactions(me?.userId, setMessages);

	const handlePacket = (packet: WasmPacket) => {
		console.log("Received packet:", packet);

		const result = handleIncomingPacket(packet, me?.userId);

		switch (result.type) {
			case "message":
				if (result.data) {
					setMessages((prev) => [...prev, result.data]);
				}
				break;

			case "reaction":
				// Handle reaction updates
				if (result.data) {
					const { messageId, reactionKind, userId } = result.data;
					// You can implement reaction handling here
					console.log("Reaction received:", {
						messageId,
						reactionKind,
						userId,
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

			default:
				console.log("Unknown packet type:", result);
		}
	};

	const { handleSendMessage } = useChat(
		newMessage,
		isClient,
		me?.userId,
		ws,
		setMessages,
		setNewMessage,
		handlePacket,
	);

	// Simulation effects
	useChatSimulation(
		isClient,
		messages,
		me?.userId,
		users,
		setTypingUsers,
		setMessages,
	);

	// Group messages by user to show avatars only for first message in sequence
	const groupedMessages = messages.reduce(
		(acc, message, index) => {
			const prevMessage = messages[index - 1];
			const showAvatar = !prevMessage || prevMessage.userId !== message.userId;
			acc.push({
				message,
				showAvatar,
				user: users.find((u) => u.id === message.userId)!,
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
