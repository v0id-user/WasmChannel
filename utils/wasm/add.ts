import { initWasm } from './init';

export async function add(left: bigint, right: bigint): Promise<bigint> {
  try {
    const wasm = await initWasm();
    if (!wasm) {
      throw new Error('WASM module not initialized');
    }
    return wasm.add(left, right);
  } catch (error) {
    console.error('Error in WASM add function:', error);
    throw error;
  }
}
