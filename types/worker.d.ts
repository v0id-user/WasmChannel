// Type-only declarations for worker exports
// Import the declarations emitted by the worker package

export type { Router } from "@wasmchannel/worker/src/routers";
export type {
	PacketKind,
	ReactionKind,
	WasmPacket,
} from "@wasmchannel/worker/wasm/wasmchannel";
