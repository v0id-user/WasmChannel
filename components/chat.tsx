"use client";

import { useEffect, useRef, useState } from "react";
import { useBoot } from "@/components/providers/BootProvider";
import { useRoomStore } from "@/store/room";
import { users } from "@/constants/chat";
import { useChatSimulation } from "@/hooks/chat/useChatSimulation";
import { useChat } from "@/hooks/chat/useChat";
import { useTypingTimeout } from "@/hooks/chat/useTypingTimeout";
import { useChatState } from "@/hooks/chat/useChatState";
import { usePacketHandler } from "@/hooks/chat/usePacketHandler";
import { useReactionHandler } from "@/hooks/chat/useReactionHandler";
import { groupMessagesByUser } from "@/utils/chat/messageGrouping";
import { OnlineUsersBar } from "./chat/OnlineUsersBar";
import { MessageInput } from "./chat/MessageInput";
import { ChatFooter } from "./chat/ChatFooter";
import { ChatHeader } from "./chat/ChatHeader";
import { MessagesArea } from "./chat/MessagesArea";
import { LoadingState } from "./chat/LoadingState";

export default function Chat() {
	const { state: bootState } = useBoot();
	const { socket: ws } = useRoomStore();
	const [isManualScrolling, setIsManualScrolling] = useState(false);
	const scrollToBottomRef = useRef<(() => void) | null>(null);

	// Chat state management
	const {
		messages,
		setMessages,
		newMessage,
		setNewMessage,
		typingUsers,
		setTypingUsers,
		onlineUsersCount,
		setOnlineUsersCount,
		isClient,
		isPending,
		isError,
		error,
		// Infinite scroll related
		hasMoreMessages,
		loadMoreMessages,
	} = useChatState();

	// Typing timeout management
	const { addTypingUser, removeTypingUser, clearAllTimeouts } =
		useTypingTimeout(setTypingUsers);

	// Packet handling
	const { handlePacket } = usePacketHandler({
		bootUserId: bootState.userId || "",
		messages,
		setMessages,
		setTypingUsers,
		setOnlineUsersCount,
		addTypingUser,
		removeTypingUser,
	});

	// Reaction handling
	const { handleReactionClick } = useReactionHandler({
		ws,
		bootUserId: bootState.userId || "",
		messages,
	});

	// Chat functionality
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

	// Cleanup timeouts on unmount
	useEffect(() => {
		return () => {
			clearAllTimeouts();
		};
	}, [clearAllTimeouts]);

	// Handle scroll to bottom
	const handleScrollToBottom = () => {
		if (scrollToBottomRef.current) {
			scrollToBottomRef.current();
		}
	};

	// Early return for loading state
	if (!bootState.userId || !ws || !isClient || isPending) {
		console.log("chat.tsx: Waiting...");
		console.log("Client state:", isClient);
		console.log("WebSocket state:", ws);
		console.log("User ID:", bootState.userId);
		return <LoadingState />;
	}

	if (isError) {
		console.error("chat.tsx: Error fetching messages:", error);
		return <div className="font-mono">خطأ في الاتصال بالخادم</div>;
	}

	// Group messages for rendering
	const groupedMessages = groupMessagesByUser(messages);

	return (
		<div
			className="min-h-screen flex flex-col items-center justify-center p-4 font-mono"
			style={{ backgroundColor: "#F3F3F3" }}
			dir="rtl"
		>
			<div
				className="w-full max-w-2xl h-[600px] bg-white border-[0.5px] flex flex-col chat-container relative"
				style={{ borderColor: "#000000" }}
			>
				<ChatHeader />
				<OnlineUsersBar onlineUsersCount={onlineUsersCount} />
				<MessagesArea
					groupedMessages={groupedMessages}
					typingUsers={typingUsers}
					currentUserId={bootState.userId}
					onReactionClick={handleReactionClick}
					hasMoreMessages={hasMoreMessages}
					onLoadMore={loadMoreMessages}
					onManualScrollChange={setIsManualScrolling}
					scrollToBottomRef={scrollToBottomRef}
				/>

				{/* Manual scroll indicator - positioned above input */}
				{isManualScrolling && (
					<div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-10">
						<button
							onClick={handleScrollToBottom}
							className="px-1 py-0.5 font-mono text-xs border transition-all duration-200 hover:scale-105 active:scale-95"
							style={{
								backgroundColor: "rgba(102, 102, 102, 0.15)",
								borderColor: "rgba(102, 102, 102, 0.3)",
								color: "#888888",
								backdropFilter: "blur(8px)",
							}}
						>
							<div className="flex items-center gap-2">
								<span>شاهد المحادثات الحديثة</span>
								<span className="text-xs">↓</span>
							</div>
						</button>
					</div>
				)}

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
