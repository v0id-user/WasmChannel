import { useEffect } from "react";
import { ReactionKind } from "@/public/wasm/wasmchannel";
import type { Message, User } from "@/types/chat";

export function useChatSimulation(
	isClient: boolean,
	messages: Message[],
	currentUserId: string,
	users: User[],
	setTypingUsers: React.Dispatch<React.SetStateAction<User[]>>,
	setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
) {
	useEffect(() => {
		if (!isClient) return;
		if (process.env.NEXT_PUBLIC_DEBUG === "yes") {
			const interval = setInterval(() => {
				if (Math.random() > 0.8) {
					const randomUsers = users
						.filter((u) => u.isOnline && u.id !== currentUserId)
						.sort(() => 0.5 - Math.random())
						.slice(0, Math.floor(Math.random() * 2) + 1);
					setTypingUsers(randomUsers);

					setTimeout(() => setTypingUsers([]), 2000 + Math.random() * 3000);
				}

				// Simulate random reactions
				if (Math.random() > 0.85) {
					const randomMessage =
						messages[Math.floor(Math.random() * messages.length)];
					if (randomMessage) {
						const randomUser = users.find(
							(u) =>
								u.isOnline &&
								u.id !== currentUserId &&
								u.id !== randomMessage.userId,
						);
						if (randomUser) {
							const reactions = [
								ReactionKind.Like,
								ReactionKind.Heart,
								ReactionKind.Star,
							];
							const randomReaction =
								reactions[Math.floor(Math.random() * reactions.length)];

							setMessages((prev) =>
								prev.map((message) => {
									if (message.id !== randomMessage.id) return message;

									const existingReaction = message.reactions.find(
										(r) => r.kind === randomReaction,
									);
									const hasUserReacted =
										existingReaction?.users.includes(randomUser.id) || false;

									if (!hasUserReacted) {
										if (existingReaction) {
											return {
												...message,
												reactions: message.reactions.map((r) =>
													r.kind === randomReaction
														? {
																...r,
																count: r.count + 1,
																users: [...r.users, randomUser.id],
															}
														: r,
												),
											};
										} else {
											return {
												...message,
												reactions: [
													...message.reactions,
													{
														kind: randomReaction,
														count: 1,
														users: [randomUser.id],
													},
												],
											};
										}
									}
									return message;
								}),
							);
						}
					}
				}
			}, 6000);

			return () => clearInterval(interval);
		}
	}, [isClient, messages, currentUserId, users, setTypingUsers, setMessages]);
}
