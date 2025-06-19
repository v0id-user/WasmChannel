"use client";

import { memo } from "react";
import type { BenchmarkResult } from "@/types/benchmark";

interface BenchmarkResultsProps {
	results: BenchmarkResult | null;
	onRunAgain: () => void;
}

const BenchmarkResults = memo(function BenchmarkResults({
	results,
	onRunAgain,
}: BenchmarkResultsProps) {
	if (!results) return null;

	const getResultColor = (isWinner: boolean, isLoser: boolean) => {
		if (isWinner) return "text-black font-bold";
		if (isLoser) return "";
		return "";
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2 mb-4">
				<div className="text-2xl font-bold font-mono tracking-wide" style={{ color: "#000000" }}>
					RESULTS
				</div>
				<div className="px-2 py-1 text-xs border font-mono font-bold" style={{
					borderColor: "#000000",
					backgroundColor: results.mode === 'unfair' ? "#F3F3F3" : "#FFFFFF",
					color: "#0143EB"
				}}>
					{results.mode.toUpperCase()}
				</div>
			</div>
			
			<div className="grid grid-cols-2 gap-4">
				<div className="text-center border p-4" style={{ borderColor: "#000000", backgroundColor: "#F3F3F3" }}>
					<div className="text-lg font-bold font-mono mb-2" style={{ color: "#000000" }}>
						🦀 RUST WASM
					</div>
					<div className={`text-2xl font-bold font-mono ${getResultColor(results.rustWinner, results.jsonWinner)}`}>
						{results.rust.toLocaleString()}
					</div>
					<div className="text-sm font-mono" style={{ color: "#0143EB" }}>OPERATIONS</div>
					{results.rustErrors > 0 && (
						<div className="text-xs font-mono" style={{ color: "#000000" }}>{results.rustErrors} ERRORS</div>
					)}
				</div>

				<div className="text-center border p-4" style={{ borderColor: "#000000", backgroundColor: "#F3F3F3" }}>
					<div className="text-lg font-bold font-mono mb-2" style={{ color: "#000000" }}>
						📄 JSON
					</div>
					<div className={`text-2xl font-bold font-mono ${getResultColor(results.jsonWinner, results.rustWinner)}`}>
						{results.json.toLocaleString()}
					</div>
					<div className="text-sm font-mono" style={{ color: "#0143EB" }}>OPERATIONS</div>
					{results.jsonErrors > 0 && (
						<div className="text-xs font-mono" style={{ color: "#000000" }}>{results.jsonErrors} ERRORS</div>
					)}
				</div>
			</div>

			<div className="p-4 border" style={{ borderColor: "#000000", backgroundColor: "#F3F3F3" }}>
				<div className="font-bold font-mono mb-2" style={{ color: "#000000" }}>PERFORMANCE ANALYSIS</div>
				<div className="text-sm font-mono" style={{ color: "#0143EB" }}>
					{results.rust > results.json ? (
						<>
							<span className="font-bold" style={{ color: "#000000" }}>RUST WASM</span> is{" "}
							<span className="font-bold" style={{ color: "#000000" }}>
								{((results.rust / results.json - 1) * 100).toFixed(1)}%
							</span>{" "}
							faster than JSON
						</>
					) : results.json > results.rust ? (
						<>
							<span className="font-bold" style={{ color: "#000000" }}>JSON</span> is{" "}
							<span className="font-bold" style={{ color: "#000000" }}>
								{((results.json / results.rust - 1) * 100).toFixed(1)}%
							</span>{" "}
							faster than Rust WASM
						</>
					) : (
						<span className="font-bold" style={{ color: "#000000" }}>It&apos;s a tie!</span>
					)}
				</div>
			</div>

			<button
				onClick={onRunAgain}
				className="font-bold py-2 px-6 w-full border font-mono tracking-wide transition-colors"
				style={{
					backgroundColor: "#F3F3F3",
					color: "#000000",
					borderColor: "#000000"
				}}
				onMouseEnter={(e) => {
					(e.target as HTMLButtonElement).style.backgroundColor = "#0143EB";
					(e.target as HTMLButtonElement).style.color = "#FFFFFF";
				}}
				onMouseLeave={(e) => {
					(e.target as HTMLButtonElement).style.backgroundColor = "#F3F3F3";
					(e.target as HTMLButtonElement).style.color = "#000000";
				}}
			>
				🔄 RUN AGAIN
			</button>
		</div>
	);
});

export default BenchmarkResults; 