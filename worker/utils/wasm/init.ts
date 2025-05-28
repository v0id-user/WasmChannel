// @ts-ignore - WASM files are generated at build time
import * as imports from "@/wasm/wasmchannel_bg.js";
// @ts-ignore - WASM files are generated at build time  
import { WasmPacket, PacketKind, ReactionKind } from "@/wasm/wasmchannel_bg.js";

// Import the WASM module
// @ts-ignore - WASM files are generated at build time
import wkmod from "@/wasm/wasmchannel_bg.wasm";

interface WasmModule {
	WasmPacket: typeof WasmPacket;
	PacketKind: typeof PacketKind;
	ReactionKind: typeof ReactionKind;
}

let wasm: WasmModule | null = null;
let wasmReady: Promise<WasmModule> | null = null;

export async function initWasm(): Promise<WasmModule> {
	if (!wasmReady) {
		wasmReady = (async () => {
			try {
				// Create WebAssembly instance for Cloudflare Workers
				const instance = new WebAssembly.Instance(wkmod, {
					"./wasmchannel_bg.js": imports,
				});
				(imports as any).__wbg_set_wasm(instance.exports);

				wasm = {
					WasmPacket,
					PacketKind,
					ReactionKind,
				};
				console.log("WASM module initialized successfully");
				return wasm;
			} catch (error) {
				console.error("Failed to initialize WASM:", error);
				throw error;
			}
		})();
	}
	return wasmReady;
}

export function getWasmInstance(): WasmModule | null {
	return wasm;
}

export { WasmPacket, PacketKind, ReactionKind };
