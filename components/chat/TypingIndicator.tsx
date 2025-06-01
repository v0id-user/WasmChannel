import type { User } from "@/types/chat";

interface TypingIndicatorProps {
	typingUsers: User[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
	if (typingUsers.length === 0) return null;

	const typingText =
		typingUsers.length === 1
			? `${typingUsers[0].name} يكتب...`
			: typingUsers.length === 2
				? `${typingUsers[0].name} و ${typingUsers[1].name} يكتبان...`
				: `${typingUsers.length} أشخاص يكتبون...`;

	return (
		<div className="px-3 py-2 animate-fade-in-up">
			<div className="flex items-center gap-2 text-sm text-gray-500">
				<span>{typingText}</span>
				<div className="flex gap-1">
					<div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse-dots"></div>
					<div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse-dots"></div>
					<div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse-dots"></div>
				</div>
			</div>
		</div>
	);
}
