import { ReactionKind, PacketKind } from "@/public/wasm/wasmchannel";
import { createPacket, serializePacket, WasmPacket } from "./packet";

// Local function serialize and send packet
function send(ws: WebSocket, packet: WasmPacket) {
	const serializedPacket = serializePacket(packet);
	ws.send(serializedPacket);
}

export function sendMessage(ws: WebSocket,  payload: string) {
	// Use the new constructor with message_id and user_id
	const packet = new WasmPacket(
		PacketKind.Message,
		null,  
		null,     
		null,       
		new TextEncoder().encode(payload),
	);

	send(ws, packet);
}

export function sendReaction(
	ws: WebSocket,
	messageId: string,
	reaction: ReactionKind,
) {
	// Use the new constructor for reactions
	const packet = new WasmPacket(
		PacketKind.Reaction,
		messageId,    // message_id (the message being reacted to)
		null,       
		reaction,     // reaction_kind
		new TextEncoder().encode(JSON.stringify({ timestamp: Date.now() })),
	);

	send(ws, packet);
}

export function sendTyping(ws: WebSocket, isTyping: boolean) {
	// Use the new constructor for typing indicators
	const packet = new WasmPacket(
		PacketKind.Typing,
		null,         // message_id (not applicable for typing)
		null,       // user_id
		null,         // reaction_kind
		new TextEncoder().encode(JSON.stringify({ isTyping, timestamp: Date.now() })),
	);

	send(ws, packet);
}
