'use client';

import { useState, useEffect } from "react";
import { add } from "@/utils/wasm/add";
import { initWasm } from "@/utils/wasm/init";

export default function Home() {
  const [num1, setNum1] = useState<string>("");
  const [num2, setNum2] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initWasm()
      .then(() => setWasmReady(true))
      .catch((err) => setError('Failed to initialize WASM module'));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasmReady) {
      setError('WASM module is not ready yet');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const sum = await add(BigInt(num1), BigInt(num2));
      setResult(sum.toString());
    } catch (error) {
      setError('Error: Please enter valid numbers');
      setResult("");
    }
    setIsLoading(false);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <main className="flex flex-col items-center justify-center w-full max-w-md">
        <h1 className="text-4xl font-bold mb-8">Wasm Channel</h1>
        
        {!wasmReady ? (
          <div className="text-lg">Loading WASM module...</div>
        ) : (
          <form onSubmit={handleAdd} className="w-full space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="num1" className="text-sm font-medium">
                First Number
              </label>
              <input
                id="num1"
                type="number"
                value={num1}
                onChange={(e) => setNum1(e.target.value)}
                className="p-2 border rounded-md"
                placeholder="Enter first number"
                required
              />
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="num2" className="text-sm font-medium">
                Second Number
              </label>
              <input
                id="num2"
                type="number"
                value={num2}
                onChange={(e) => setNum2(e.target.value)}
                className="p-2 border rounded-md"
                placeholder="Enter second number"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
            >
              {isLoading ? "Calculating..." : "Add Numbers"}
            </button>
          </form>
        )}

        {result && (
          <div className="mt-6 p-4 bg-gray-100 rounded-md w-full">
            <p className="text-lg font-medium">Result:</p>
            <p className="text-2xl font-bold">{result}</p>
          </div>
        )}
      </main>
    </div>
  );
}
