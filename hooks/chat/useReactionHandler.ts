import { useCallback } from "react";
import type { Message } from "@/types/chat";
import { WasmPacket, createPacket, serializePacket } from "@/oop/packet";
import { PacketKind, ReactionKind } from "@/utils/wasm/init";

interface UseReactionHandlerProps {
	ws: WebSocket | null;
	bootUserId: string;
	messages: Message[];
}

export function useReactionHandler({
	ws,
	bootUserId,
	messages,
}: UseReactionHandlerProps) {
	const handleReactionClick = useCallback(
		(messageId: string, reactionKind: ReactionKind) => {
			if (!ws || !bootUserId) return;

			// Check if user has already reacted with this reaction type
			const message = messages.find((m) => m.id === messageId);
			if (message) {
				const existingReaction = message.reactions.find(
					(r) => r.kind === reactionKind,
				);
				const hasUserReacted =
					existingReaction?.users.includes(bootUserId) || false;

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
		[ws, bootUserId, messages],
	);

	return { handleReactionClick };
}
