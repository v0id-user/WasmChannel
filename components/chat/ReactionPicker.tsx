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
		<div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-1 z-10 animate-fade-in-up">
			{availableReactions.map((reaction) => (
				<button
					key={reaction}
					onClick={() => onReactionSelect(messageId, reaction)}
					className="p-2 hover:bg-gray-100 rounded-md text-lg hover:scale-110 active:scale-95 transform transition-transform"
					title={reactionEmojis[reaction]}
				>
					{reactionEmojis[reaction]}
				</button>
			))}
		</div>
	);
}
