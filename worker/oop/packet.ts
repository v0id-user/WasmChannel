import { WasmPacket, PacketKind, ReactionKind } from "@/wasm/wasmchannel";

export function createPacket(
	kind: PacketKind,
	reaction_kind: ReactionKind | null,
	payload: Uint8Array,
): WasmPacket {
	return new WasmPacket(kind, reaction_kind, payload);
}

export function serializePacket(packet: WasmPacket): Uint8Array {
	return packet.serialize();
}

export function deserializePacket(bytes: Uint8Array): WasmPacket {
	return WasmPacket.deserialize(bytes);
}
