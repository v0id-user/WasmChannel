import { useState, useEffect } from "react";
import { ReactionKind } from "@/public/wasm/wasmchannel";
import { SmilePlus } from "lucide-react";
import type { Message, User } from "@/types/chat";
import { UserAvatar } from "./UserAvatar";
import { ReactionDisplay } from "./ReactionDisplay";
import { ReactionPicker } from "./ReactionPicker";

interface ChatMessageProps {
	message: Message;
	user: User;
	showAvatar: boolean;
	onReactionClick: (messageId: string, reaction: ReactionKind) => void;
	currentUserId: string;
}

export function ChatMessage({
	message,
	user,
	showAvatar,
	onReactionClick,
	currentUserId,
}: ChatMessageProps) {
	const [formattedTime, setFormattedTime] = useState<string>("");
	const [showReactionPicker, setShowReactionPicker] = useState(false);

	useEffect(() => {
		// Format time on client side to avoid hydration issues
		setFormattedTime(
			message.timestamp.toLocaleTimeString("ar-SA", {
				hour: "2-digit",
				minute: "2-digit",
			}),
		);
	}, [message.timestamp]);

	return (
		<div
			className={`group px-3 py-1 hover:bg-gray-50 relative ${
				message.isOwn ? "animate-slide-in-left" : "animate-slide-in-right"
			}`}
			onMouseEnter={() => setShowReactionPicker(false)}
		>
			{showAvatar ? (
				<div className="flex gap-3">
					<UserAvatar user={user} size="sm" />
					<div className="flex-1 min-w-0">
						<div className="flex items-baseline gap-2 mb-1">
							<span
								className={`text-sm font-medium ${
									message.isOwn ? "text-blue-600" : "text-gray-900"
								}`}
							>
								{user.name}
							</span>
							<time className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
								{formattedTime}
							</time>
							{!message.isOwn && (
								<button
									onClick={() => setShowReactionPicker(!showReactionPicker)}
									className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-600 transition-all ml-2"
									title="إضافة تفاعل"
								>
									<SmilePlus className="w-4 h-4 text-gray-400 cursor-pointer" />
								</button>
							)}
						</div>
						<div className="text-sm text-gray-800 leading-relaxed break-words">
							{message.text}
						</div>
						<ReactionDisplay
							reactions={message.reactions}
							onReactionClick={message.isOwn ? () => {} : onReactionClick}
							messageId={message.id}
							currentUserId={currentUserId}
						/>
						<div className="relative">
							<ReactionPicker
								onReactionSelect={(messageId, reaction) => {
									onReactionClick(messageId, reaction);
									setShowReactionPicker(false);
								}}
								messageId={message.id}
								isVisible={showReactionPicker && !message.isOwn}
							/>
						</div>
					</div>
				</div>
			) : (
				<div className="flex gap-3">
					<div className="w-6 flex justify-center">
						<time className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
							{formattedTime}
						</time>
					</div>
					<div className="flex-1 min-w-0 relative">
						<div className="text-sm text-gray-800 leading-relaxed break-words">
							{message.text}
						</div>
						<ReactionDisplay
							reactions={message.reactions}
							onReactionClick={message.isOwn ? () => {} : onReactionClick}
							messageId={message.id}
							currentUserId={currentUserId}
						/>
						{!message.isOwn && (
							<button
								onClick={() => setShowReactionPicker(!showReactionPicker)}
								className="absolute top-0 left-0 text-xs text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-600 transition-all"
								title="إضافة تفاعل"
							>
								<SmilePlus className="w-4 h-4 text-gray-400 cursor-pointer" />
							</button>
						)}
						<div className="relative">
							<ReactionPicker
								onReactionSelect={(messageId, reaction) => {
									onReactionClick(messageId, reaction);
									setShowReactionPicker(false);
								}}
								messageId={message.id}
								isVisible={showReactionPicker && !message.isOwn}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
