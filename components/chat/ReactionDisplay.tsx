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
		// Check if user has already reacted with this reaction type
		const reaction = reactions.find((r) => r.kind === reactionKind);
		const hasUserReacted = reaction?.users.includes(currentUserId) || false;

		// If user has already reacted, don't do anything (no animation, no handler call)
		if (hasUserReacted) {
			return;
		}

		// Only trigger animation and handler if user hasn't reacted yet
		setAnimatingReactions((prev) => new Set([...prev, reactionKind]));
		onReactionClick(messageId, reactionKind);
	};

	if (reactions.length === 0) return null;

	return (
		<div className="flex flex-wrap gap-1 mt-1">
			{reactions.map((reaction) => {
				const hasUserReacted = reaction.users.includes(currentUserId);
				const isAnimating = animatingReactions.has(reaction.kind);

				return (
					<button
						key={reaction.kind}
						onClick={() => handleReactionClick(reaction.kind)}
						className={`
							inline-flex items-center gap-1 px-1 py-0.5 text-xs transition-all duration-200 border font-mono font-bold
							${isAnimating ? "animate-bounce scale-110" : ""}
						`}
						style={{
							backgroundColor: hasUserReacted ? "#0143EB" : "#F3F3F3",
							color: hasUserReacted ? "#FFFFFF" : "#000000",
							borderColor: "#000000",
							cursor: hasUserReacted ? "default" : "pointer",
						}}
						onMouseEnter={(e) => {
							if (!hasUserReacted) {
								(e.target as HTMLButtonElement).style.backgroundColor = "#000000";
								(e.target as HTMLButtonElement).style.color = "#FFFFFF";
							}
						}}
						onMouseLeave={(e) => {
							if (!hasUserReacted) {
								(e.target as HTMLButtonElement).style.backgroundColor = "#F3F3F3";
								(e.target as HTMLButtonElement).style.color = "#000000";
							}
						}}
						title={`${reactionEmojis[reaction.kind]} ${reaction.count}`}
					>
						<span className={`text-xs ${isAnimating ? "animate-pulse" : ""}`}>
							{reactionEmojis[reaction.kind]}
						</span>
						<span className="font-bold font-mono text-xs">{reaction.count}</span>
					</button>
				);
			})}
		</div>
	);
}
