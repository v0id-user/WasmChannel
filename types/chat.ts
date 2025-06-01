import { ReactionKind } from "@/public/wasm/wasmchannel";

export interface User {
	id: string;
	name: string;
	isOnline: boolean;
}

export interface ReactionCount {
	kind: ReactionKind;
	count: number;
	users: string[]; // user IDs who reacted
}

export interface Message {
	id: string;
	userId: string;
	text: string;
	timestamp: Date;
	reactions: ReactionCount[];
	isOwn: boolean;
} 