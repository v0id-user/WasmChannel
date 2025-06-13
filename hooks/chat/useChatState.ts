import { useState, useEffect } from "react";
import type { Message as ChatMessage, User } from "@/types/chat";
import { users, getInitialMessages } from "@/constants/chat";
import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";
import { Message as OrpcMessage } from "@/types/orpc";
import { authClient } from "@/lib/auth-client";
export function useChatState() {
	const {
		data: messagesResponse,
		isPending,
		isError,
		error,
	} = useQuery(
		orpc.messages.get.queryOptions({
			input: {
				cursor: undefined,
				limit: 100,
			},
			refetchOnWindowFocus: false,
		}),
	);
	// Very bad, but the tanstack query layer handle the double call to the server
	const { data: session } = authClient.useSession();
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [typingUsers, setTypingUsers] = useState<User[]>([]);
	const [onlineUsersCount, setOnlineUsersCount] = useState<number>(0);
	const [isClient, setIsClient] = useState(false);

	// Initialize on client side only
	useEffect(() => {
		// Wait for orpc to fetch messages
		if(isPending || !session) {
			console.log("useChatState: Waiting for messages to load or user to be loaded...");
			return;
		}

		console.log("useChatState: Initializing client state");
		setIsClient(true);
		
		// Initialize with static users count for fallback
		const onlineUsers = users.filter((u) => u.isOnline).length;
		console.log("useChatState: Setting initial online users count:", onlineUsers);
		setOnlineUsersCount(onlineUsers);

		if (process.env.NEXT_PUBLIC_DEBUG === "yes") {
			console.log("useChatState: Debug mode enabled, setting initial messages");
			setMessages(getInitialMessages());
		}

		// Add messages from orpc
		if(messagesResponse) {
			console.log("useChatState: Processing messages from orpc");
			const orpcMessages = messagesResponse.messages as OrpcMessage[];
			console.log("useChatState: Found", orpcMessages.length, "messages");
			
			const chatMessages = orpcMessages.map((message) =>{
				const chatMessage: ChatMessage = {
					id: message.id,
					userId: message.sentBy,
					text: message.message,
					timestamp: message.createdAt,
					reactions: Array.isArray(message.reactions) ? message.reactions.map(reaction => ({
						kind: reaction.kind,
						count: reaction.count,
						users: reaction.users
					})) : [],
					isOwn: message.sentBy === session.user.id,
				}
				return chatMessage;
			})	
			console.log("useChatState: Setting processed messages");
			setMessages(chatMessages.reverse());
		} else {
			console.log("useChatState: No messages response available");
		}

	}, [isPending, session]);

	return {
		messages,
		setMessages,
		newMessage,
		setNewMessage,
		typingUsers,
		setTypingUsers,
		onlineUsersCount,
		setOnlineUsersCount,
		isClient,
		isError,
		isPending,
		error,
	};
}
