import { useCallback } from "react";
import { ReactionKind } from "@/public/wasm/wasmchannel";
import { sendReaction } from "@/oop/chat";
import type { Message, ReactionCount } from "@/types/chat";

export function useChatReactions(
	currentUserId: string,
	setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
	ws?: WebSocket,
) {
	const handleReactionClick = useCallback(
		(messageId: string, reactionKind: ReactionKind) => {
			// Update local state optimistically
			setMessages((prev) =>
				prev.map((message) => {
					if (message.id !== messageId) return message;

					const existingReaction = message.reactions.find(
						(r) => r.kind === reactionKind,
					);
					const hasUserReacted =
						existingReaction?.users.includes(currentUserId) || false;

					if (hasUserReacted) {
						// Remove user's reaction
						return {
							...message,
							reactions: message.reactions
								.map((r) => {
									if (r.kind === reactionKind) {
										const newUsers = r.users.filter(
											(id) => id !== currentUserId,
										);
										return newUsers.length > 0
											? { ...r, count: newUsers.length, users: newUsers }
											: null;
									}
									return r;
								})
								.filter(Boolean) as ReactionCount[],
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
												users: [...r.users, currentUserId],
											}
										: r,
								),
							};
						} else {
							return {
								...message,
								reactions: [
									...message.reactions,
									{ kind: reactionKind, count: 1, users: [currentUserId] },
								],
							};
						}
					}
				}),
			);

			// Send reaction packet to server if WebSocket is available
			if (ws && ws.readyState === WebSocket.OPEN) {
				sendReaction(ws, messageId, reactionKind);
			}
		},
		[currentUserId, setMessages, ws],
	);

	return { handleReactionClick };
}
