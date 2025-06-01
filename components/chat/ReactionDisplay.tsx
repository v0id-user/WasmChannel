import { useState, useEffect } from "react";
import { ReactionKind } from "@/public/wasm/wasmchannel";
import type { ReactionCount } from "@/types/chat";
import { reactionEmojis } from "@/constants/chat";

interface ReactionDisplayProps {
	reactions: ReactionCount[];
	onReactionClick: (messageId: string, reaction: ReactionKind) => void;
	messageId: string;
	currentUserId: string;
}

export function ReactionDisplay({
	reactions,
	onReactionClick,
	messageId,
	currentUserId,
}: ReactionDisplayProps) {
	const [animatingReactions, setAnimatingReactions] = useState<
		Set<ReactionKind>
	>(new Set());

	useEffect(() => {
		// Clear animations after they complete
		const timer = setTimeout(() => {
			setAnimatingReactions(new Set());
		}, 500);
		return () => clearTimeout(timer);
	}, [reactions]);

	const handleReactionClick = (reactionKind: ReactionKind) => {
		setAnimatingReactions((prev) => new Set([...prev, reactionKind]));
		onReactionClick(messageId, reactionKind);
	};

	if (reactions.length === 0) return null;

	return (
		<div className="flex flex-wrap gap-1 mt-2">
			{reactions.map((reaction) => {
				const hasUserReacted = reaction.users.includes(currentUserId);
				const isAnimating = animatingReactions.has(reaction.kind);

				return (
					<button
						key={reaction.kind}
						onClick={() => handleReactionClick(reaction.kind)}
						className={`
							inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all duration-200
							hover:scale-105 active:scale-95
							${
								hasUserReacted
									? "bg-blue-100 text-blue-700 border border-blue-300"
									: "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
							}
							${isAnimating ? "animate-bounce scale-110" : ""}
						`}
						title={`${reactionEmojis[reaction.kind]} ${reaction.count}`}
					>
						<span className={`text-sm ${isAnimating ? "animate-pulse" : ""}`}>
							{reactionEmojis[reaction.kind]}
						</span>
						<span className="font-medium">{reaction.count}</span>
					</button>
				);
			})}
		</div>
	);
}
