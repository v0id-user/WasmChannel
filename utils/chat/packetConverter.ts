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

		// Decode the payload (message content)
		const payload = packet.payload();
		const messageText = new TextDecoder().decode(payload);

		// Try to parse as JSON if it's structured data
		let parsedData: PacketMessage;
		try {
			parsedData = JSON.parse(messageText);
		} catch {
			// If it's not JSON, treat as plain text message
			parsedData = {
				id: Date.now().toString(), // Generate ID if not provided
				userId: "unknown", // Default user
				text: messageText,
				timestamp: Date.now(),
				reactions: [],
			};
		}

		// Convert to Message format
		const message: Message = {
			id: parsedData.id,
			userId: parsedData.userId,
			text: parsedData.text,
			timestamp: new Date(parsedData.timestamp),
			reactions: parsedData.reactions || [],
			isOwn: parsedData.userId === currentUserId,
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

	return new WasmPacket(PacketKind.Message, null, null, null, payload);
}

/**
 * Handles different packet types and converts them appropriately
 */
export function handleIncomingPacket(
	packet: WasmPacket,
	currentUserId?: string,
): {
	type: "message" | "reaction" | "typing" | "joined" | "unknown";
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
			// Handle reaction packets
			const payload = new TextDecoder().decode(packet.payload());
			try {
				const reactionData = JSON.parse(payload);
				return {
					type: "reaction",
					data: {
						messageId: reactionData.messageId,
						reactionKind: packet.reaction_kind(),
						userId: reactionData.userId,
					},
				};
			} catch {
				return { type: "unknown", data: null };
			}

		case PacketKind.Typing:
			// Handle typing indicators
			const typingPayload = new TextDecoder().decode(packet.payload());
			try {
				const typingData = JSON.parse(typingPayload);
				return {
					type: "typing",
					data: {
						userId: typingData.userId,
						isTyping: typingData.isTyping,
					},
				};
			} catch {
				return { type: "unknown", data: null };
			}

		case PacketKind.Joined:
			// Handle user joined
			return {
				type: "joined",
				data: new TextDecoder().decode(packet.payload()),
			};

		default:
			return { type: "unknown", data: null };
	}
}
