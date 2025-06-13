import { useState, useEffect } from "react";
import type { Message, User } from "@/types/chat";
import { users, getInitialMessages } from "@/constants/chat";

export function useChatState() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [typingUsers, setTypingUsers] = useState<User[]>([]);
	const [onlineUsersCount, setOnlineUsersCount] = useState<number>(0);
	const [isClient, setIsClient] = useState(false);

	// Initialize on client side only
	useEffect(() => {
		setIsClient(true);
		// Initialize with static users count for fallback
		setOnlineUsersCount(users.filter((u) => u.isOnline).length);
		if (process.env.NEXT_PUBLIC_DEBUG === "yes") {
			setMessages(getInitialMessages());
		}
	}, []);

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
	};
}
