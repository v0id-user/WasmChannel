/* tslint:disable */
/* eslint-disable */
export function calculate_crc32(data: Uint8Array): number;
export enum PacketKind {
	Message = 0,
	OnlineUsers = 1,
	Delete = 2,
	Reaction = 3,
	Joined = 4,
	Typing = 5,
}
export enum ReactionKind {
	None = 0,
	Like = 1,
	Dislike = 2,
	Heart = 3,
	Star = 4,
}
export class WasmPacket {
	free(): void;
	constructor(
		kind: PacketKind,
		message_id: string | null | undefined,
		user_id: string | null | undefined,
		reaction_kind: ReactionKind | null | undefined,
		payload: Uint8Array,
	);
	serialized(): boolean;
	message_id(): string | undefined;
	user_id(): string | undefined;
	kind(): PacketKind;
	reaction_kind(): ReactionKind | undefined;
	payload(): Uint8Array;
	serialize(): Uint8Array;
	static deserialize(bytes: Uint8Array): WasmPacket;
}

export type InitInput =
	| RequestInfo
	| URL
	| Response
	| BufferSource
	| WebAssembly.Module;

export interface InitOutput {
	readonly memory: WebAssembly.Memory;
	readonly __wbg_wasmpacket_free: (a: number, b: number) => void;
	readonly wasmpacket_new: (
		a: number,
		b: number,
		c: number,
		d: number,
		e: number,
		f: number,
		g: any,
	) => number;
	readonly wasmpacket_serialized: (a: number) => number;
	readonly wasmpacket_message_id: (a: number) => [number, number];
	readonly wasmpacket_user_id: (a: number) => [number, number];
	readonly wasmpacket_kind: (a: number) => number;
	readonly wasmpacket_reaction_kind: (a: number) => number;
	readonly wasmpacket_payload: (a: number) => any;
	readonly wasmpacket_serialize: (a: number) => [number, number, number];
	readonly wasmpacket_deserialize: (a: any) => [number, number, number];
	readonly calculate_crc32: (a: number, b: number) => number;
	readonly __wbindgen_export_0: WebAssembly.Table;
	readonly __wbindgen_malloc: (a: number, b: number) => number;
	readonly __wbindgen_realloc: (
		a: number,
		b: number,
		c: number,
		d: number,
	) => number;
	readonly __wbindgen_free: (a: number, b: number, c: number) => void;
	readonly __externref_table_dealloc: (a: number) => void;
	readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(
	module: { module: SyncInitInput } | SyncInitInput,
): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init(
	module_or_path?:
		| { module_or_path: InitInput | Promise<InitInput> }
		| InitInput
		| Promise<InitInput>,
): Promise<InitOutput>;
