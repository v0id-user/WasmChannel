import {
	WasmPacket,
	PacketKind,
	ReactionKind,
} from "@/public/wasm/wasmchannel";
import type { Message, ReactionCount } from "@/types/chat";

interface PacketMessage {
	id: string;
	userId: string;
	text: string;
	timestamp: number;
	reactions?: ReactionCount[];
}

/**
 * Converts a WasmPacket to a Message object for the chat UI
 */
export function packetToMessage(
	packet: WasmPacket,
	currentUserId?: string,
): Message | null {
	try {
		// Only process Message packets
		if (packet.kind() !== PacketKind.Message) {
			return null;
		}

		// Get user ID from packet metadata (preferred) or fallback to payload parsing
		const packetUserId = packet.user_id();
		const packetMessageId = packet.message_id();

		// Server should ALWAYS provide message_id and user_id
		if (!packetMessageId || !packetUserId) {
			console.error("Invalid message packet: missing message_id or user_id", {
				messageId: packetMessageId,
				userId: packetUserId,
			});
			return null;
		}

		// Decode the payload (message content)
		const payload = packet.payload();
		const messageText = new TextDecoder().decode(payload);

		// Try to parse as JSON if it's structured data, otherwise treat as plain text
		let parsedData: PacketMessage;
		try {
			parsedData = JSON.parse(messageText);
		} catch {
			// If it's not JSON, treat as plain text message
			parsedData = {
				id: packetMessageId, // Use the server's message ID
				userId: packetUserId, // Use the server's user ID
				text: messageText,
				timestamp: Date.now(),
				reactions: [],
			};
		}

		// ALWAYS use packet metadata from server - no fallbacks
		const message: Message = {
			id: packetMessageId, // Server's message ID is authoritative
			userId: packetUserId, // Server's user ID is authoritative
			text: parsedData.text,
			timestamp: new Date(parsedData.timestamp),
			reactions: parsedData.reactions || [],
			isOwn: packetUserId === currentUserId,
			// TODO: Check if this is correct
			refrenceId: packetMessageId,
		};

		return message;
	} catch (error) {
		console.error("Failed to convert packet to message:", error);
		return null;
	}
}

/**
 * Converts a Message object to a WasmPacket for sending
 */
export function messageToPacket(message: Omit<Message, "isOwn">): WasmPacket {
	const packetData: PacketMessage = {
		id: message.id,
		userId: message.userId,
		text: message.text,
		timestamp: message.timestamp.getTime(),
		reactions: message.reactions,
	};

	const messageText = JSON.stringify(packetData);
	const payload = new TextEncoder().encode(messageText);

	// Use the new constructor with message_id and user_id
	return new WasmPacket(
		PacketKind.Message,
		message.id, // message_id
		message.userId, // user_id
		null, // reaction_kind (null for regular messages)
		payload,
	);
}

/**
 * Creates a reaction packet for a specific message
 */
export function createReactionPacket(
	messageId: string,
	userId: string,
	reactionKind: ReactionKind,
): WasmPacket {
	// Payload can contain additional reaction data if needed
	const reactionData = {
		messageId,
		userId,
		timestamp: Date.now(),
	};

	const payload = new TextEncoder().encode(JSON.stringify(reactionData));

	return new WasmPacket(
		PacketKind.Reaction,
		messageId, // message_id (the message being reacted to)
		userId, // user_id (who is reacting)
		reactionKind, // reaction_kind
		payload,
	);
}

/**
 * Creates a typing indicator packet
 */
export function createTypingPacket(
	userId: string,
	isTyping: boolean,
): WasmPacket {
	const typingData = {
		userId,
		isTyping,
		timestamp: Date.now(),
	};

	const payload = new TextEncoder().encode(JSON.stringify(typingData));

	return new WasmPacket(
		PacketKind.Typing,
		null, // message_id (not applicable for typing)
		userId, // user_id
		null, // reaction_kind (not applicable for typing)
		payload,
	);
}

/**
 * Handles different packet types and converts them appropriately
 */
export function handleIncomingPacket(
	packet: WasmPacket,
	currentUserId?: string,
): {
	type:
		| "message"
		| "reaction"
		| "typing"
		| "joined"
		| "online_users"
		| "delete"
		| "unknown";
	data: any;
} {
	const kind = packet.kind();

	switch (kind) {
		case PacketKind.Message:
			return {
				type: "message",
				data: packetToMessage(packet, currentUserId),
			};

		case PacketKind.Reaction:
			// Handle reaction packets - use metadata from packet
			const messageId = packet.message_id();
			const userId = packet.user_id();
			const reactionKind = packet.reaction_kind();

			if (!messageId || !userId || !reactionKind) {
				console.error("Invalid reaction packet: missing required fields");
				return { type: "unknown", data: null };
			}

			return {
				type: "reaction",
				data: {
					messageId,
					userId,
					reactionKind,
					timestamp: Date.now(),
				},
			};

		case PacketKind.Typing:
			// Handle typing indicators
			const typingUserId = packet.user_id();
			if (!typingUserId) {
				return { type: "unknown", data: null };
			}

			// Try to get typing state from payload
			try {
				const payload = new TextDecoder().decode(packet.payload());
				const typingData = JSON.parse(payload);
				return {
					type: "typing",
					data: {
						userId: typingUserId,
						isTyping: typingData.isTyping,
					},
				};
			} catch {
				// Default to typing=true if we can't parse payload
				return {
					type: "typing",
					data: {
						userId: typingUserId,
						isTyping: true,
					},
				};
			}

		case PacketKind.Joined:
			// Handle user joined
			const joinedUserId = packet.user_id();
			return {
				type: "joined",
				data: {
					userId: joinedUserId,
					payload: new TextDecoder().decode(packet.payload()),
				},
			};

		case PacketKind.OnlineUsers:
			// Handle online users list
			try {
				const payload = new TextDecoder().decode(packet.payload());
				const onlineUsersData = JSON.parse(payload);
				return {
					type: "online_users",
					data: onlineUsersData,
				};
			} catch {
				return { type: "unknown", data: null };
			}

		case PacketKind.Delete:
			// Handle message deletion
			const deleteMessageId = packet.message_id();
			const deleteUserId = packet.user_id();
			return {
				type: "delete",
				data: {
					messageId: deleteMessageId,
					userId: deleteUserId,
				},
			};

		default:
			return { type: "unknown", data: null };
	}
}
