import { useRef, useEffect, useCallback } from "react";
import type { User } from "@/types/chat";
import { ReactionKind } from "@/utils/wasm/init";
import { GroupedMessage } from "@/utils/chat/messageGrouping";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";

interface MessagesAreaProps {
	groupedMessages: GroupedMessage[];
	typingUsers: User[];
	currentUserId: string;
	onReactionClick: (messageId: string, reactionKind: ReactionKind) => void;
}

export function MessagesArea({
	groupedMessages,
	typingUsers,
	currentUserId,
	onReactionClick,
}: MessagesAreaProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [groupedMessages, typingUsers, scrollToBottom]);

	return (
		<div className="flex-1 overflow-y-auto">
			{groupedMessages.map(({ message, showAvatar, user }) => (
				<ChatMessage
					key={message.id}
					message={message}
					user={user}
					showAvatar={showAvatar}
					onReactionClick={onReactionClick}
					currentUserId={currentUserId}
				/>
			))}

			<TypingIndicator typingUsers={typingUsers} />

			<div ref={messagesEndRef} />
		</div>
	);
} 