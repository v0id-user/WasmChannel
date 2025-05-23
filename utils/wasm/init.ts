import wasmInit, { add, calculate_factorial, fibonacci_sequence, complex_operation } from '@/public/wasm/wasmchannel';

interface WasmModule {
  add: typeof add;
  calculate_factorial: typeof calculate_factorial;
  fibonacci_sequence: typeof fibonacci_sequence;
  complex_operation: typeof complex_operation;
}

let wasm: WasmModule | null = null;
let wasmReady: Promise<WasmModule> | null = null;

export async function initWasm(): Promise<WasmModule> {
  if (!wasmReady) {
    wasmReady = (async () => {
      try {
        await wasmInit();
        wasm = { 
          add,
          calculate_factorial,
          fibonacci_sequence,
          complex_operation
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
