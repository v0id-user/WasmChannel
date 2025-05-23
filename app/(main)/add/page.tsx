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
        <div className="hero min-h-screen flex items-center justify-center">
            <main className="hero-content flex-col items-center w-full max-w-md">
                <h1 className="text-4xl font-bold text-center">Wasm Channel</h1>
                
                <div className="card w-full bg-base-100 shadow-xl mb-4">
                    <div className="card-body">
                        <h2 className="card-title justify-center">Simple Addition</h2>
                        <form onSubmit={handleAdd} className="form-control gap-4 flex flex-col items-center">
                            <div className="form-control">
                                <label className="label justify-center">
                                    <span className="label-text">First Number</span>
                                </label>
                                <input
                                    type="number"
                                    value={num1}
                                    onChange={(e) => setNum1(e.target.value)}
                                    className="input input-bordered text-center"
                                    placeholder="Enter first number"
                                />
                            </div>

                            <div className="form-control">
                                <label className="label justify-center">
                                    <span className="label-text">Second Number</span>
                                </label>
                                <input
                                    type="number"
                                    value={num2}
                                    onChange={(e) => setNum2(e.target.value)}
                                    className="input input-bordered text-center"
                                    placeholder="Enter second number"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary mx-auto w-full"
                            >
                                Add Numbers
                            </button>
                        </form>
                    </div>
                </div>

                <div className="card w-full bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title justify-center">Complex Operations</h2>
                        <div className="form-control gap-4">
                            <div className="form-control">
                                <label className="label justify-center">
                                    <span className="label-text">Number for Operations</span>
                                </label>
                                <input
                                    type="number"
                                    value={singleNumber}
                                    onChange={(e) => setSingleNumber(e.target.value)}
                                    className="input input-bordered text-center"
                                    placeholder="Enter a number"
                                />
                            </div>

                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={handleFactorial}
                                    disabled={isLoading}
                                    className="btn btn-success w-full"
                                >
                                    Calculate Factorial
                                </button>
                                <button
                                    onClick={handleFibonacci}
                                    disabled={isLoading}
                                    className="btn btn-secondary w-full"
                                >
                                    Generate Fibonacci Sequence
                                </button>
                                <button
                                    onClick={handleComplexOperation}
                                    disabled={isLoading}
                                    className="btn btn-accent w-full"
                                >
                                    Run Complex Operation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {isLoading && (
                    <div className="alert alert-info text-center">
                        Calculating...
                    </div>
                )}

                {error && (
                    <div className="alert alert-error text-center">
                        {error}
                    </div>
                )}

                {result && (
                    <div className="card bg-base-100 shadow-xl w-full">
                        <div className="card-body">
                            <h3 className="card-title justify-center">Result:</h3>
                            <pre className="font-mono whitespace-pre-wrap text-center">{result}</pre>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}