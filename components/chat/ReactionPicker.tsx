import { ReactionKind } from "@/public/wasm/wasmchannel";
import { reactionEmojis } from "@/constants/chat";

interface ReactionPickerProps {
	onReactionSelect: (messageId: string, reaction: ReactionKind) => void;
	messageId: string;
	isVisible: boolean;
}

export function ReactionPicker({
	onReactionSelect,
	messageId,
	isVisible,
}: ReactionPickerProps) {
	if (!isVisible) return null;

	const availableReactions = [
		ReactionKind.Like,
		ReactionKind.Heart,
		ReactionKind.Star,
		ReactionKind.Dislike,
	];

	return (
		<div
			className="absolute bottom-full mb-1 left-0 bg-white border p-1 flex gap-0.5 z-10 animate-fade-in-up"
			style={{ borderColor: "#000000" }}
		>
			{availableReactions.map((reaction) => (
				<button
					key={reaction}
					onClick={() => onReactionSelect(messageId, reaction)}
					className="p-1 text-sm border transition-all"
					style={{ borderColor: "#000000" }}
					onMouseEnter={(e) => {
						e.target.style.backgroundColor = "#0143EB";
						e.target.style.borderColor = "#000000";
						e.target.style.transform = "scale(1.1)";
					}}
					onMouseLeave={(e) => {
						e.target.style.backgroundColor = "transparent";
						e.target.style.borderColor = "#000000";
						e.target.style.transform = "scale(1)";
					}}
					title={reactionEmojis[reaction]}
				>
					{reactionEmojis[reaction]}
				</button>
			))}
		</div>
	);
}
