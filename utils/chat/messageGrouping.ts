import type { Message, User } from "@/types/chat";
import { users } from "@/constants/chat";

export interface GroupedMessage {
	message: Message;
	showAvatar: boolean;
	user: User;
}

export function groupMessagesByUser(messages: Message[]): GroupedMessage[] {
	// Sort messages by timestamp first to ensure chronological order
	const sortedMessages = [...messages].sort((a, b) => {
		const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
		const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
		return aTime - bTime; // Oldest first (chronological order)
	});

	return sortedMessages.reduce((acc, message, index) => {
		const prevMessage = sortedMessages[index - 1];
		const showAvatar = !prevMessage || prevMessage.userId !== message.userId;

		// Find user or create a fallback user with userId as name
		const foundUser = users.find((u) => u.id === message.userId);
		const user = foundUser || {
			id: message.userId,
			name: message.userId, // Use userId as name
			isOnline: true,
		};

		if (!foundUser) {
			console.log("Creating fallback user for userId:", message.userId);
		}

		acc.push({
			message,
			showAvatar,
			user,
		});
		return acc;
	}, [] as GroupedMessage[]);
}
