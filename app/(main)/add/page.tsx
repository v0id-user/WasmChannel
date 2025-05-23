'use client';

import { useState } from "react";
import { add, calculate_factorial, fibonacci_sequence, complex_operation } from "@/utils/wasm/add";

export default function Home() {
    const [num1, setNum1] = useState<string>("");
    const [num2, setNum2] = useState<string>("");
    const [singleNumber, setSingleNumber] = useState<string>("");
    const [result, setResult] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const sum = await add(BigInt(num1), BigInt(num2));
            setResult(sum.toString());
        } catch  {
            setError('Error: Please enter valid numbers');
            setResult("");
        }
        setIsLoading(false);
    };

    const handleFactorial = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const number = parseInt(singleNumber);
            if (isNaN(number) || number < 0) {
                throw new Error('Please enter a valid positive number');
            }
            const result = await calculate_factorial(number);
            setResult(`Factorial of ${number} is ${result}`);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
            setResult("");
        }
        setIsLoading(false);
    };

    const handleFibonacci = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const number = parseInt(singleNumber);
            if (isNaN(number) || number < 1) {
                throw new Error('Please enter a valid positive number');
            }
            const sequence = await fibonacci_sequence(number);
            setResult(`Fibonacci sequence (${number} terms): ${sequence.join(', ')}`);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
            setResult("");
        }
        setIsLoading(false);
    };

    const handleComplexOperation = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const number = parseInt(singleNumber);
            if (isNaN(number) || number < 1) {
                throw new Error('Please enter a valid positive number');
            }
            const result = await complex_operation(number);
            setResult(result.replace(/\\n/g, '\n'));
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
            setResult("");
        }
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <main className="flex flex-col items-center justify-center w-full max-w-md">
                <h1 className="text-4xl font-bold mb-8">Wasm Channel</h1>
                
                <div className="w-full mb-8 p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Simple Addition</h2>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="num1" className="text-sm font-medium">First Number</label>
                            <input
                                id="num1"
                                type="number"
                                value={num1}
                                onChange={(e) => setNum1(e.target.value)}
                                className="p-2 border rounded-md"
                                placeholder="Enter first number"
                            />
                        </div>

                        <div className="flex flex-col space-y-2">
                            <label htmlFor="num2" className="text-sm font-medium">Second Number</label>
                            <input
                                id="num2"
                                type="number"
                                value={num2}
                                onChange={(e) => setNum2(e.target.value)}
                                className="p-2 border rounded-md"
                                placeholder="Enter second number"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                        >
                            Add Numbers
                        </button>
                    </form>
                </div>

                <div className="w-full p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Complex Operations</h2>
                    <div className="space-y-4">
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="singleNumber" className="text-sm font-medium">Number for Operations</label>
                            <input
                                id="singleNumber"
                                type="number"
                                value={singleNumber}
                                onChange={(e) => setSingleNumber(e.target.value)}
                                className="p-2 border rounded-md"
                                placeholder="Enter a number"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            <button
                                onClick={handleFactorial}
                                disabled={isLoading}
                                className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300"
                            >
                                Calculate Factorial
                            </button>
                            <button
                                onClick={handleFibonacci}
                                disabled={isLoading}
                                className="p-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-purple-300"
                            >
                                Generate Fibonacci Sequence
                            </button>
                            <button
                                onClick={handleComplexOperation}
                                disabled={isLoading}
                                className="p-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:bg-indigo-300"
                            >
                                Run Complex Operation
                            </button>
                        </div>
                    </div>
                </div>

                {isLoading && (
                    <div className="mt-4 p-4 bg-blue-100 text-blue-700 rounded-md w-full">
                        Calculating...
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md w-full">
                        {error}
                    </div>
                )}

                {result && (
                    <div className="mt-6 p-4 bg-gray-100 rounded-md w-full">
                        <p className="text-lg font-medium">Result:</p>
                        <pre className="text-md font-mono whitespace-pre-wrap">{result}</pre>
                    </div>
                )}
            </main>
        </div>
    );
} 