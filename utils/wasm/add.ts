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

export async function calculate_factorial(n: number): Promise<bigint> {
  try {
    const wasm = await initWasm();
    if (!wasm) {
      throw new Error('WASM module not initialized');
    }
    return wasm.calculate_factorial(n);
  } catch (error) {
    console.error('Error in WASM factorial function:', error);
    throw error;
  }
}

export async function fibonacci_sequence(n: number): Promise<number[]> {
  try {
    const wasm = await initWasm();
    if (!wasm) {
      throw new Error('WASM module not initialized');
    }
    const result = wasm.fibonacci_sequence(n);
    return Array.from(result).map(Number);
  } catch (error) {
    console.error('Error in WASM fibonacci function:', error);
    throw error;
  }
}

export async function complex_operation(n: number): Promise<string> {
  try {
    const wasm = await initWasm();
    if (!wasm) {
      throw new Error('WASM module not initialized');
    }
    return wasm.complex_operation(n);
  } catch (error) {
    console.error('Error in WASM complex operation:', error);
    throw error;
  }
}
