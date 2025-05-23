import wasmInit, { add } from '@/public/wasm/wasmchannel';

let wasm: { add: typeof add } | null = null;
let wasmReady: Promise<{ add: typeof add }> | null = null;

export async function initWasm(): Promise<{ add: typeof add }> {
  if (!wasmReady) {
    wasmReady = (async () => {
      try {
        await wasmInit();
        wasm = { add };
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

export function getWasmInstance(): { add: typeof add } | null {
  return wasm;
}
