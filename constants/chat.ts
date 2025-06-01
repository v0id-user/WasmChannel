import { ReactionKind } from "@/public/wasm/wasmchannel";
import type { User, Message } from "@/types/chat";

// Reaction emoji mapping
export const reactionEmojis: Record<ReactionKind, string> = {
	[ReactionKind.None]: "",
	[ReactionKind.Like]: "👍",
	[ReactionKind.Dislike]: "👎",
	[ReactionKind.Heart]: "❤️",
	[ReactionKind.Star]: "⭐",
};

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
export const users: User[] = [
	{ id: "1", name: generateRandomUsername(), isOnline: true },
	{ id: "2", name: generateRandomUsername(), isOnline: true },
	{ id: "3", name: generateRandomUsername(), isOnline: false },
	{ id: "4", name: generateRandomUsername(), isOnline: true },
	{ id: "5", name: generateRandomUsername(), isOnline: true },
];

// Static initial messages with fixed timestamps to avoid hydration issues
export const getInitialMessages = (): Message[] => [
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