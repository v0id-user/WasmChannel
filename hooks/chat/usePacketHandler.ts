import { useCallback } from "react";
import type { Message, User } from "@/types/chat";
import { users } from "@/constants/chat";
import { WasmPacket } from "@/oop/packet";
import { handleIncomingPacket } from "@/utils/chat/packetConverter";

interface UsePacketHandlerProps {
	bootUserId: string;
	messages: Message[];
	setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
	setTypingUsers: React.Dispatch<React.SetStateAction<User[]>>;
	setOnlineUsersCount: React.Dispatch<React.SetStateAction<number>>;
	addTypingUser: (user: User) => void;
	removeTypingUser: (userId: string) => void;
}

export function usePacketHandler({
	bootUserId,
	messages,
	setMessages,
	setTypingUsers,
	setOnlineUsersCount,
	addTypingUser,
	removeTypingUser,
}: UsePacketHandlerProps) {
	const handlePacket = useCallback(
		(packet: WasmPacket) => {
			console.log("Received packet:", packet);

			const result = handleIncomingPacket(packet, bootUserId);
			console.log("Packet conversion result:", result);

			switch (result.type) {
				case "message":
					if (result.data) {
						console.log("Adding message to UI state:", {
							id: result.data.id,
							userId: result.data.userId,
							text: result.data.text,
							currentMessagesCount: messages.length,
						});
						setMessages((prev) => {
							const newMessages = [...prev, result.data];
							console.log("Messages state updated, new count:", newMessages.length);
							return newMessages;
						});
					} else {
						console.log("Received message packet but result.data is null");
					}
					break;

				case "reaction":
					if (result.data) {
						const { messageId, reactionKind, userId } = result.data;

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

								if (hasUserReacted) {
									return message;
								} else {
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
					if (result.data) {
						const { userId, isTyping } = result.data;
						const user = users.find((u) => u.id === userId);
						if (user) {
							if (isTyping) {
								addTypingUser(user);
							} else {
								removeTypingUser(userId);
							}
						}
					}
					break;

				case "joined":
					console.log("User joined:", result.data);
					break;

				case "online_users":
					console.log("Online users update:", result.data);
					if (result.data && typeof result.data === "number") {
						const onlineCount = result.data;
						console.log("Updating online users count to:", onlineCount);
						setOnlineUsersCount(onlineCount);
					}
					break;

				case "delete":
					if (result.data) {
						const { messageId, userId } = result.data;
						console.log("Message deleted:", { messageId, userId });
						setMessages((prev) =>
							prev.filter((message) => message.id !== messageId),
						);
					}
					break;

				default:
					console.log("Unknown packet type:", result);
			}
		},
		[
			bootUserId,
			messages.length,
			setMessages,
			setOnlineUsersCount,
			addTypingUser,
			removeTypingUser,
		],
	);

	return { handlePacket };
} 