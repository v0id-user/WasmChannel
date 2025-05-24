import { WasmPacket, PacketKind } from '@/utils/wasm/init';

export function createPacket(kind: PacketKind, payload: Uint8Array): WasmPacket {
    return new WasmPacket(kind, payload);
}

export function serializePacket(packet: WasmPacket): Uint8Array {
    return packet.serialize();
}

export function deserializePacket(bytes: Uint8Array): WasmPacket {
    return WasmPacket.deserialize(bytes);
}

export { WasmPacket, PacketKind };

