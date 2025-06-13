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
			className={`group px-4 py-2 border-b border-l-4 relative transition-all font-mono ${
				message.isOwn ? "animate-slide-in-left" : "animate-slide-in-right"
			}`}
			style={{
				borderBottomColor: "#F3F3F3",
				borderLeftColor: message.isOwn ? "#0143EB" : "transparent",
				backgroundColor: message.isOwn ? "#F3F3F3" : "transparent",
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.backgroundColor = "#F3F3F3";
				setShowReactionPicker(false);
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.backgroundColor = message.isOwn
					? "#F3F3F3"
					: "transparent";
			}}
		>
			{showAvatar ? (
				<div className="flex gap-3">
					<UserAvatar user={user} size="sm" />
					<div className="flex-1 min-w-0">
						<div className="flex items-baseline gap-3 mb-1">
							<span
								className="text-sm font-bold tracking-wide uppercase font-mono"
								style={{ color: message.isOwn ? "#0143EB" : "#000000" }}
							>
								{user.name}
							</span>
							<time
								className="text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity"
								style={{ color: "#0143EB" }}
							>
								{formattedTime}
							</time>
							{!message.isOwn && (
								<button
									onClick={() => setShowReactionPicker(!showReactionPicker)}
									className="text-xs opacity-0 group-hover:opacity-100 transition-all ml-2 p-1 border font-mono"
									style={{
										color: "#0143EB",
										borderColor: "#0143EB",
									}}
									onMouseEnter={(e) => {
										e.target.style.backgroundColor = "#0143EB";
										e.target.style.color = "#FFFFFF";
									}}
									onMouseLeave={(e) => {
										e.target.style.backgroundColor = "transparent";
										e.target.style.color = "#0143EB";
									}}
									title="إضافة تفاعل"
								>
									<SmilePlus className="w-3 h-3" />
								</button>
							)}
						</div>
						<div
							className="text-sm leading-relaxed break-words font-mono"
							style={{ color: "#000000" }}
						>
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
						<time
							className="text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity"
							style={{ color: "#0143EB" }}
						>
							{formattedTime}
						</time>
					</div>
					<div className="flex-1 min-w-0 relative">
						<div
							className="text-sm leading-relaxed break-words font-mono"
							style={{ color: "#000000" }}
						>
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
								className="absolute top-0 left-0 text-xs opacity-0 group-hover:opacity-100 transition-all p-1 border font-mono"
								style={{
									color: "#0143EB",
									borderColor: "#0143EB",
								}}
								onMouseEnter={(e) => {
									e.target.style.backgroundColor = "#0143EB";
									e.target.style.color = "#FFFFFF";
								}}
								onMouseLeave={(e) => {
									e.target.style.backgroundColor = "transparent";
									e.target.style.color = "#0143EB";
								}}
								title="إضافة تفاعل"
							>
								<SmilePlus className="w-3 h-3" />
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
