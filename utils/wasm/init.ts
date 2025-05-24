import wasmInit, { WasmPacket, PacketKind } from '@/public/wasm/wasmchannel';

interface WasmModule {
  WasmPacket: typeof WasmPacket;
  PacketKind: typeof PacketKind;
}

let wasm: WasmModule | null = null;
let wasmReady: Promise<WasmModule> | null = null;

export async function initWasm(): Promise<WasmModule> {
  if (!wasmReady) {
    wasmReady = (async () => {
      try {
        await wasmInit();
        wasm = { 
          WasmPacket,
          PacketKind
        };
        console.log('WASM module initialized successfully');
        return wasm;
      } catch (error) {
        console.error('Failed to initialize WASM:', error);
        throw error;
      }
    })();
  }
  return wasmReady;
}

export function getWasmInstance(): WasmModule | null {
  return wasm;
}

export { WasmPacket, PacketKind };
