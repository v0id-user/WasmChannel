/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const __wbg_wasmpacket_free: (a: number, b: number) => void;
export const wasmpacket_new: (
	a: number,
	b: number,
	c: number,
	d: number,
	e: number,
	f: number,
	g: any,
) => number;
export const wasmpacket_serialized: (a: number) => number;
export const wasmpacket_message_id: (a: number) => [number, number];
export const wasmpacket_user_id: (a: number) => [number, number];
export const wasmpacket_kind: (a: number) => number;
export const wasmpacket_reaction_kind: (a: number) => number;
export const wasmpacket_payload: (a: number) => any;
export const wasmpacket_serialize: (a: number) => [number, number, number];
export const wasmpacket_deserialize: (a: any) => [number, number, number];
export const calculate_crc32: (a: number, b: number) => number;
export const __wbindgen_export_0: WebAssembly.Table;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (
	a: number,
	b: number,
	c: number,
	d: number,
) => number;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_start: () => void;
