let wasm;
export function __wbg_set_wasm(val) {
	wasm = val;
}

const lTextDecoder =
	typeof TextDecoder === "undefined"
		? (0, module.require)("util").TextDecoder
		: TextDecoder;

let cachedTextDecoder = new lTextDecoder("utf-8", {
	ignoreBOM: true,
	fatal: true,
});

cachedTextDecoder.decode();

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
	if (
		cachedUint8ArrayMemory0 === null ||
		cachedUint8ArrayMemory0.byteLength === 0
	) {
		cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
	}
	return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
	ptr = ptr >>> 0;
	return cachedTextDecoder.decode(
		getUint8ArrayMemory0().subarray(ptr, ptr + len),
	);
}

let WASM_VECTOR_LEN = 0;

const lTextEncoder =
	typeof TextEncoder === "undefined"
		? (0, module.require)("util").TextEncoder
		: TextEncoder;

let cachedTextEncoder = new lTextEncoder("utf-8");

const encodeString =
	typeof cachedTextEncoder.encodeInto === "function"
		? function (arg, view) {
				return cachedTextEncoder.encodeInto(arg, view);
			}
		: function (arg, view) {
				const buf = cachedTextEncoder.encode(arg);
				view.set(buf);
				return {
					read: arg.length,
					written: buf.length,
				};
			};

function passStringToWasm0(arg, malloc, realloc) {
	if (realloc === undefined) {
		const buf = cachedTextEncoder.encode(arg);
		const ptr = malloc(buf.length, 1) >>> 0;
		getUint8ArrayMemory0()
			.subarray(ptr, ptr + buf.length)
			.set(buf);
		WASM_VECTOR_LEN = buf.length;
		return ptr;
	}

	let len = arg.length;
	let ptr = malloc(len, 1) >>> 0;

	const mem = getUint8ArrayMemory0();

	let offset = 0;

	for (; offset < len; offset++) {
		const code = arg.charCodeAt(offset);
		if (code > 0x7f) break;
		mem[ptr + offset] = code;
	}

	if (offset !== len) {
		if (offset !== 0) {
			arg = arg.slice(offset);
		}
		ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0;
		const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
		const ret = encodeString(arg, view);

		offset += ret.written;
		ptr = realloc(ptr, len, offset, 1) >>> 0;
	}

	WASM_VECTOR_LEN = offset;
	return ptr;
}

function isLikeNone(x) {
	return x === undefined || x === null;
}

function takeFromExternrefTable0(idx) {
	const value = wasm.__wbindgen_export_0.get(idx);
	wasm.__externref_table_dealloc(idx);
	return value;
}

function passArray8ToWasm0(arg, malloc) {
	const ptr = malloc(arg.length * 1, 1) >>> 0;
	getUint8ArrayMemory0().set(arg, ptr / 1);
	WASM_VECTOR_LEN = arg.length;
	return ptr;
}
/**
 * @param {Uint8Array} data
 * @returns {number}
 */
export function calculate_crc32(data) {
	const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
	const len0 = WASM_VECTOR_LEN;
	const ret = wasm.calculate_crc32(ptr0, len0);
	return ret >>> 0;
}

/**
 * @enum {0 | 1 | 2 | 3 | 4 | 5}
 */
export const PacketKind = Object.freeze({
	Message: 0,
	0: "Message",
	OnlineUsers: 1,
	1: "OnlineUsers",
	Delete: 2,
	2: "Delete",
	Reaction: 3,
	3: "Reaction",
	Joined: 4,
	4: "Joined",
	Typing: 5,
	5: "Typing",
});
/**
 * @enum {0 | 1 | 2 | 3 | 4}
 */
export const ReactionKind = Object.freeze({
	None: 0,
	0: "None",
	Like: 1,
	1: "Like",
	Dislike: 2,
	2: "Dislike",
	Heart: 3,
	3: "Heart",
	Star: 4,
	4: "Star",
});

const WasmPacketFinalization =
	typeof FinalizationRegistry === "undefined"
		? { register: () => {}, unregister: () => {} }
		: new FinalizationRegistry((ptr) =>
				wasm.__wbg_wasmpacket_free(ptr >>> 0, 1),
			);

export class WasmPacket {
	static __wrap(ptr) {
		ptr = ptr >>> 0;
		const obj = Object.create(WasmPacket.prototype);
		obj.__wbg_ptr = ptr;
		WasmPacketFinalization.register(obj, obj.__wbg_ptr, obj);
		return obj;
	}

	__destroy_into_raw() {
		const ptr = this.__wbg_ptr;
		this.__wbg_ptr = 0;
		WasmPacketFinalization.unregister(this);
		return ptr;
	}

	free() {
		const ptr = this.__destroy_into_raw();
		wasm.__wbg_wasmpacket_free(ptr, 0);
	}
	/**
	 * @param {PacketKind} kind
	 * @param {string | null | undefined} message_id
	 * @param {string | null | undefined} user_id
	 * @param {ReactionKind | null | undefined} reaction_kind
	 * @param {Uint8Array} payload
	 */
	constructor(kind, message_id, user_id, reaction_kind, payload) {
		var ptr0 = isLikeNone(message_id)
			? 0
			: passStringToWasm0(
					message_id,
					wasm.__wbindgen_malloc,
					wasm.__wbindgen_realloc,
				);
		var len0 = WASM_VECTOR_LEN;
		var ptr1 = isLikeNone(user_id)
			? 0
			: passStringToWasm0(
					user_id,
					wasm.__wbindgen_malloc,
					wasm.__wbindgen_realloc,
				);
		var len1 = WASM_VECTOR_LEN;
		const ret = wasm.wasmpacket_new(
			kind,
			ptr0,
			len0,
			ptr1,
			len1,
			isLikeNone(reaction_kind) ? 5 : reaction_kind,
			payload,
		);
		this.__wbg_ptr = ret >>> 0;
		WasmPacketFinalization.register(this, this.__wbg_ptr, this);
		return this;
	}
	/**
	 * @returns {boolean}
	 */
	serialized() {
		const ret = wasm.wasmpacket_serialized(this.__wbg_ptr);
		return ret !== 0;
	}
	/**
	 * @returns {string | undefined}
	 */
	message_id() {
		const ret = wasm.wasmpacket_message_id(this.__wbg_ptr);
		let v1;
		if (ret[0] !== 0) {
			v1 = getStringFromWasm0(ret[0], ret[1]).slice();
			wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
		}
		return v1;
	}
	/**
	 * @returns {string | undefined}
	 */
	user_id() {
		const ret = wasm.wasmpacket_user_id(this.__wbg_ptr);
		let v1;
		if (ret[0] !== 0) {
			v1 = getStringFromWasm0(ret[0], ret[1]).slice();
			wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
		}
		return v1;
	}
	/**
	 * @returns {PacketKind}
	 */
	kind() {
		const ret = wasm.wasmpacket_kind(this.__wbg_ptr);
		return ret;
	}
	/**
	 * @returns {ReactionKind | undefined}
	 */
	reaction_kind() {
		const ret = wasm.wasmpacket_reaction_kind(this.__wbg_ptr);
		return ret === 5 ? undefined : ret;
	}
	/**
	 * @returns {Uint8Array}
	 */
	payload() {
		const ret = wasm.wasmpacket_payload(this.__wbg_ptr);
		return ret;
	}
	/**
	 * @returns {Uint8Array}
	 */
	serialize() {
		const ret = wasm.wasmpacket_serialize(this.__wbg_ptr);
		if (ret[2]) {
			throw takeFromExternrefTable0(ret[1]);
		}
		return takeFromExternrefTable0(ret[0]);
	}
	/**
	 * @param {Uint8Array} bytes
	 * @returns {WasmPacket}
	 */
	static deserialize(bytes) {
		const ret = wasm.wasmpacket_deserialize(bytes);
		if (ret[2]) {
			throw takeFromExternrefTable0(ret[1]);
		}
		return WasmPacket.__wrap(ret[0]);
	}
}

export function __wbg_buffer_609cc3eee51ed158(arg0) {
	const ret = arg0.buffer;
	return ret;
}

export function __wbg_length_a446193dc22c12f8(arg0) {
	const ret = arg0.length;
	return ret;
}

export function __wbg_new_a12002a7f91c75be(arg0) {
	const ret = new Uint8Array(arg0);
	return ret;
}

export function __wbg_newwithbyteoffsetandlength_d97e637ebe145a9a(
	arg0,
	arg1,
	arg2,
) {
	const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
	return ret;
}

export function __wbg_set_65595bdd868b3009(arg0, arg1, arg2) {
	arg0.set(arg1, arg2 >>> 0);
}

export function __wbindgen_init_externref_table() {
	const table = wasm.__wbindgen_export_0;
	const offset = table.grow(4);
	table.set(0, undefined);
	table.set(offset + 0, undefined);
	table.set(offset + 1, null);
	table.set(offset + 2, true);
	table.set(offset + 3, false);
}

export function __wbindgen_memory() {
	const ret = wasm.memory;
	return ret;
}

export function __wbindgen_string_new(arg0, arg1) {
	const ret = getStringFromWasm0(arg0, arg1);
	return ret;
}

export function __wbindgen_throw(arg0, arg1) {
	throw new Error(getStringFromWasm0(arg0, arg1));
}
