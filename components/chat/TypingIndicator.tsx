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
		<div
			className="px-4 py-2 animate-fade-in-up border-l-4"
			style={{ borderLeftColor: "#0143EB" }}
		>
			<div className="flex items-center gap-3 text-sm font-mono">
				<span style={{ color: "#0143EB" }}>{typingText}</span>
				<div className="flex gap-1">
					<div
						className="w-2 h-2 border animate-pulse-dots"
						style={{ backgroundColor: "#0143EB", borderColor: "#000000" }}
					></div>
					<div
						className="w-2 h-2 border animate-pulse-dots"
						style={{ backgroundColor: "#0143EB", borderColor: "#000000" }}
					></div>
					<div
						className="w-2 h-2 border animate-pulse-dots"
						style={{ backgroundColor: "#0143EB", borderColor: "#000000" }}
					></div>
				</div>
			</div>
		</div>
	);
}
