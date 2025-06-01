"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ReactionKind } from "@/public/wasm/wasmchannel";
import { sendMessage } from "@/oop/chat";
import { useStoreClient } from "@/store/client";
import { SmilePlus } from "lucide-react";

// Mock data types
interface User {
	id: string;
	name: string;
	isOnline: boolean;
}

interface ReactionCount {
	kind: ReactionKind;
	count: number;
	users: string[]; // user IDs who reacted
}

interface Message {
	id: string;
	userId: string;
	text: string;
	timestamp: Date;
	reactions: ReactionCount[];
	isOwn: boolean;
}

// Reaction emoji mapping
const reactionEmojis: Record<ReactionKind, string> = {
	[ReactionKind.None]: "",
	[ReactionKind.Like]: "👍",
	[ReactionKind.Dislike]: "👎",
	[ReactionKind.Heart]: "❤️",
	[ReactionKind.Star]: "⭐",
};

// Utility function to generate avatar color based on name
function getAvatarColor(name: string): string {
	const colors = [
		"bg-blue-500",
		"bg-green-500",
		"bg-purple-500",
		"bg-red-500",
		"bg-yellow-500",
		"bg-pink-500",
		"bg-indigo-500",
		"bg-teal-500",
	];
	const hash = name.split("").reduce((a, b) => {
		a = (a << 5) - a + b.charCodeAt(0);
		return a & a;
	}, 0);
	return colors[Math.abs(hash) % colors.length];
}

// Generate random username
function generateRandomUsername(): string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < 12; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// Static data to avoid hydration issues
const users: User[] = [
	{ id: "1", name: generateRandomUsername(), isOnline: true },
	{ id: "2", name: generateRandomUsername(), isOnline: true },
	{ id: "3", name: generateRandomUsername(), isOnline: false },
	{ id: "4", name: generateRandomUsername(), isOnline: true },
	{ id: "5", name: generateRandomUsername(), isOnline: true },
];

// Static initial messages with fixed timestamps to avoid hydration issues
const getInitialMessages = (): Message[] => [
	{
		id: "1",
		userId: "2",
		text: "مرحباً بالجميع! كيف حالكم اليوم؟",
		timestamp: new Date("2024-01-01T12:00:00Z"),
		reactions: [
			{ kind: ReactionKind.Like, count: 2, users: ["1", "4"] },
			{ kind: ReactionKind.Heart, count: 1, users: ["1"] },
		],
		isOwn: false,
	},
	{
		id: "2",
		userId: "1",
		text: "أهلاً! الحمد لله بخير، وأنت؟",
		timestamp: new Date("2024-01-01T12:01:00Z"),
		reactions: [],
		isOwn: true,
	},
	{
		id: "3",
		userId: "4",
		text: "مرحباً جميعاً 👋 أتطلع للحديث معكم",
		timestamp: new Date("2024-01-01T12:02:00Z"),
		reactions: [{ kind: ReactionKind.Star, count: 1, users: ["2"] }],
		isOwn: false,
	},
	{
		id: "4",
		userId: "1",
		text: "أهلاً وسهلاً! نحن سعداء بوجودك معنا",
		timestamp: new Date("2024-01-01T12:03:00Z"),
		reactions: [{ kind: ReactionKind.Heart, count: 3, users: ["2", "4", "5"] }],
		isOwn: true,
	},
];

function UserAvatar({ user, size = "sm" }: { user: User; size?: "xs" | "sm" }) {
	const sizeClasses = {
		xs: "w-5 h-5 text-xs",
		sm: "w-6 h-6 text-xs",
	};

	return (
		<div
			className={`${sizeClasses[size]} rounded-full ${getAvatarColor(user.name)} text-white flex items-center justify-center font-medium relative flex-shrink-0`}
		>
			{user.name.charAt(0).toUpperCase()}
			{user.isOnline && (
				<div className="w-2 h-2 bg-green-500 rounded-full absolute -bottom-0 -right-0 border border-white"></div>
			)}
		</div>
	);
}

function ReactionDisplay({
	reactions,
	onReactionClick,
	messageId,
	currentUserId,
}: {
	reactions: ReactionCount[];
	onReactionClick: (messageId: string, reaction: ReactionKind) => void;
	messageId: string;
	currentUserId: string;
}) {
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

function ReactionPicker({
	onReactionSelect,
	messageId,
	isVisible,
}: {
	onReactionSelect: (messageId: string, reaction: ReactionKind) => void;
	messageId: string;
	isVisible: boolean;
}) {
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

function OnlineUsersBar({ users }: { users: User[] }) {
	const onlineUsers = users.filter((user) => user.isOnline);

	return (
		<div className="bg-gray-100 p-2 border-b border-gray-200 flex-shrink-0">
			<div className="flex items-center gap-2 text-sm">
				<div className="inline-grid *:[grid-area:1/1]">
					<div className="status status-success animate-ping [animation-duration:3s]"></div>
					<div className="status status-success"></div>
				</div>
				<span className="text-gray-600">{onlineUsers.length} متصل الآن</span>

				<div className="flex items-center gap-1 mr-2">
					{onlineUsers.slice(0, 6).map((user) => (
						<div key={user.id} className="group relative">
							<UserAvatar user={user} size="xs" />
							<div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
								{user.name}
							</div>
						</div>
					))}
					{onlineUsers.length > 6 && (
						<div className="text-xs text-gray-500 mr-1">
							+{onlineUsers.length - 6}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function TypingIndicator({ typingUsers }: { typingUsers: User[] }) {
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

function ChatMessage({
	message,
	user,
	showAvatar,
	onReactionClick,
	currentUserId,
}: {
	message: Message;
	user: User;
	showAvatar: boolean;
	onReactionClick: (messageId: string, reaction: ReactionKind) => void;
	currentUserId: string;
}) {
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
								className="absolute top-0 right-0 text-xs text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-600 transition-all"
								title="إضافة تفاعل"
							>
								😊
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

export default function Chat() {
	const { ws } = useStoreClient();
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [typingUsers, setTypingUsers] = useState<User[]>([]);
	const [isClient, setIsClient] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const currentUserId = "1"; // TODO: Extract real user id from the database

	// Initialize on client side only
	useEffect(() => {
		setIsClient(true);
		setMessages(getInitialMessages());
	}, []);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const adjustTextareaHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = "auto";
			textarea.style.height = Math.min(textarea.scrollHeight, 96) + "px";
		}
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, typingUsers, scrollToBottom]);

	useEffect(() => {
		adjustTextareaHeight();
	}, [newMessage, adjustTextareaHeight]);

	// Handle reaction clicks
	const handleReactionClick = useCallback(
		(messageId: string, reactionKind: ReactionKind) => {
			setMessages((prev) =>
				prev.map((message) => {
					if (message.id !== messageId) return message;

					const existingReaction = message.reactions.find(
						(r) => r.kind === reactionKind,
					);
					const hasUserReacted =
						existingReaction?.users.includes(currentUserId) || false;

					if (hasUserReacted) {
						// Remove user's reaction
						return {
							...message,
							reactions: message.reactions
								.map((r) => {
									if (r.kind === reactionKind) {
										const newUsers = r.users.filter(
											(id) => id !== currentUserId,
										);
										return newUsers.length > 0
											? { ...r, count: newUsers.length, users: newUsers }
											: null;
									}
									return r;
								})
								.filter(Boolean) as ReactionCount[],
						};
					} else {
						// Add user's reaction
						if (existingReaction) {
							return {
								...message,
								reactions: message.reactions.map((r) =>
									r.kind === reactionKind
										? {
												...r,
												count: r.count + 1,
												users: [...r.users, currentUserId],
											}
										: r,
								),
							};
						} else {
							return {
								...message,
								reactions: [
									...message.reactions,
									{ kind: reactionKind, count: 1, users: [currentUserId] },
								],
							};
						}
					}
				}),
			);
		},
		[currentUserId],
	);

	// Simulate typing indicators and random reactions (client side only)
	useEffect(() => {
		if (!isClient) return;
		if (process.env.NEXT_PUBLIC_DEBUG === "yes") {
			const interval = setInterval(() => {
				if (Math.random() > 0.8) {
					const randomUsers = users
						.filter((u) => u.isOnline && u.id !== "1")
						.sort(() => 0.5 - Math.random())
						.slice(0, Math.floor(Math.random() * 2) + 1);
					setTypingUsers(randomUsers);

					setTimeout(() => setTypingUsers([]), 2000 + Math.random() * 3000);
				}

				// Simulate random reactions
				if (Math.random() > 0.85) {
					const randomMessage =
						messages[Math.floor(Math.random() * messages.length)];
					if (randomMessage) {
						const randomUser = users.find(
							(u) =>
								u.isOnline &&
								u.id !== currentUserId &&
								u.id !== randomMessage.userId,
						);
						if (randomUser) {
							const reactions = [
								ReactionKind.Like,
								ReactionKind.Heart,
								ReactionKind.Star,
							];
							const randomReaction =
								reactions[Math.floor(Math.random() * reactions.length)];

							setMessages((prev) =>
								prev.map((message) => {
									if (message.id !== randomMessage.id) return message;

									const existingReaction = message.reactions.find(
										(r) => r.kind === randomReaction,
									);
									const hasUserReacted =
										existingReaction?.users.includes(randomUser.id) || false;

									if (!hasUserReacted) {
										if (existingReaction) {
											return {
												...message,
												reactions: message.reactions.map((r) =>
													r.kind === randomReaction
														? {
																...r,
																count: r.count + 1,
																users: [...r.users, randomUser.id],
															}
														: r,
												),
											};
										} else {
											return {
												...message,
												reactions: [
													...message.reactions,
													{
														kind: randomReaction,
														count: 1,
														users: [randomUser.id],
													},
												],
											};
										}
									}
									return message;
								}),
							);
						}
					}
				}
			}, 6000);

			return () => clearInterval(interval);
		}
	}, [isClient, messages, currentUserId]);

	const handleSendMessage = useCallback(() => {
		if (!newMessage.trim() || !isClient) return;

		const message: Message = {
			id: Date.now().toString(),
			userId: currentUserId,
			text: newMessage.trim(),
			timestamp: new Date(),
			reactions: [],
			isOwn: true,
		};
		setMessages((prev) => [...prev, message]);
		setNewMessage("");

		if (process.env.NEXT_PUBLIC_DEBUG === "yes") {
			// Simulate response
			setTimeout(
				() => {
					const responders = users.filter(
						(u) => u.isOnline && u.id !== currentUserId,
					);
					if (responders.length > 0) {
						const responder =
							responders[Math.floor(Math.random() * responders.length)];
						const responses = [
							"أتفق معك تماماً!",
							"فكرة رائعة 👍",
							"شكراً لك على هذه المعلومة",
							"هل يمكنك توضيح أكثر؟",
							"مثير للاهتمام!",
							"أعتقد أن لديك نقطة مهمة هنا",
						];

						const response: Message = {
							id: (Date.now() + 1).toString(),
							userId: responder.id,
							text: responses[Math.floor(Math.random() * responses.length)],
							timestamp: new Date(),
							reactions: [],
							isOwn: false,
						};
						setMessages((prev) => [...prev, response]);
					}
				},
				1000 + Math.random() * 2000,
			);
		}

		sendMessage(ws!, newMessage);
	}, [newMessage, isClient, currentUserId, ws]);

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	// Group messages by user to show avatars only for first message in sequence
	const groupedMessages = messages.reduce(
		(acc, message, index) => {
			const prevMessage = messages[index - 1];
			const showAvatar = !prevMessage || prevMessage.userId !== message.userId;
			acc.push({
				message,
				showAvatar,
				user: users.find((u) => u.id === message.userId)!,
			});
			return acc;
		},
		[] as Array<{ message: Message; showAvatar: boolean; user: User }>,
	);

	if (!isClient) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="w-full max-w-2xl h-96 bg-white rounded-lg shadow-lg border border-gray-200">
					<div className="h-full flex items-center justify-center">
						<div className="text-gray-500">جاري التحميل...</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4"
			dir="rtl"
		>
			<div className="w-full max-w-2xl h-[600px] bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col chat-container">
				{/* Header */}
				<div className="bg-gray-900 text-white p-3 rounded-t-lg flex-shrink-0">
					<h1 className="text-sm font-medium">قناة التجريب</h1>
					<p className="text-xs text-gray-400">مشروع تجريبي للدردشة</p>
				</div>

				{/* Online Users Bar */}
				<OnlineUsersBar users={users} />

				{/* Messages Area */}
				<div className="flex-1 overflow-y-auto">
					{groupedMessages.map(({ message, showAvatar, user }) => (
						<ChatMessage
							key={message.id}
							message={message}
							user={user}
							showAvatar={showAvatar}
							onReactionClick={handleReactionClick}
							currentUserId={currentUserId}
						/>
					))}

					{/* Typing Indicator */}
					<TypingIndicator typingUsers={typingUsers} />

					<div ref={messagesEndRef} />
				</div>

				{/* Message Input */}
				<div className="bg-gray-100 border-t border-gray-200 p-3 rounded-b-lg flex-shrink-0">
					<div className="flex gap-2 items-end">
						<textarea
							ref={textareaRef}
							value={newMessage}
							onChange={(e) => setNewMessage(e.target.value)}
							onKeyDown={handleKeyPress}
							placeholder="اكتب رسالتك هنا..."
							className="flex-1 resize-none px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[36px] leading-5"
							rows={1}
							aria-label="كتابة رسالة جديدة"
						/>
						<button
							onClick={handleSendMessage}
							disabled={!newMessage.trim()}
							className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
							aria-label="إرسال الرسالة"
						>
							إرسال
						</button>
					</div>
					<div className="text-xs text-gray-500 mt-1 text-center">
						اضغط Enter للإرسال، Shift+Enter للسطر الجديد
					</div>
				</div>
			</div>

			{/* Navigation Links */}
			<div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
				<a href="#" className="hover:text-gray-700 transition-colors">
					سياسة الخصوصية
				</a>
				<span className="text-gray-300">•</span>
				<a href="#" className="hover:text-gray-700 transition-colors">
					شروط الخدمة
				</a>
				<span className="text-gray-300">•</span>
				<a href="#" className="hover:text-gray-700 transition-colors">
					ما هذا المشروع؟
				</a>
				<span className="text-gray-300">•</span>
				<a
					href="https://www.v0id.me"
					className="hover:text-gray-700 transition-colors"
				>
					موقعي الشخصي
				</a>
				<span className="text-gray-300">•</span>
				<a
					href="https://ko-fi.com/v0id_user"
					target="_blank"
					rel="noopener noreferrer"
					title="☕"
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src="https://storage.ko-fi.com/cdn/cup-border.png"
						alt="Ko-fi"
						width={16}
						height={16}
					/>
				</a>
			</div>

			<div className="mt-2 text-xs text-gray-400 text-center">
				تجربة • WebAssembly + Next.js
			</div>
		</div>
	);
}
