import { ReactionKind, PacketKind } from "@/public/wasm/wasmchannel";
import { createPacket, serializePacket, WasmPacket } from "./packet";

// Local function serialize and send packet
function send(ws: WebSocket, packet: WasmPacket) {
	const serializedPacket = serializePacket(packet);
	ws.send(serializedPacket);
}

export function sendMessage(ws: WebSocket, payload: string) {
	const packet = createPacket(
		PacketKind.Message,
		ReactionKind.None,
		new TextEncoder().encode(payload),
	);

	send(ws, packet);
}

export function sendReaction(
	ws: WebSocket,
	messageId: string,
	reaction: ReactionKind,
) {
	const packet = createPacket(
		PacketKind.Reaction,
		reaction,
		new TextEncoder().encode(messageId),
	);

	send(ws, packet);
}

export function sendTyping(ws: WebSocket) {
	const packet = createPacket(
		PacketKind.Typing,
		null,
		new TextEncoder().encode(""),
	);

	send(ws, packet);
}
