"use client";

import { memo } from "react";
import type {
	BenchmarkMode,
	PayloadSize,
	TestDuration,
	AutoRunCount,
} from "@/types/benchmark";
import { getModeDescription } from "@/utils/benchmarks/helpers";

interface BenchmarkControlsProps {
	isRunning: boolean;
	benchmarkMode: BenchmarkMode;
	payloadSize: PayloadSize;
	testDuration: TestDuration;
	progress: number;
	// Auto-run props
	isAutoRunning: boolean;
	autoRunCount: AutoRunCount;
	autoRunProgress: number;
	autoRunCurrent: number;
	autoRunTotal: number;
	// Handlers
	onModeChange: (mode: BenchmarkMode) => void;
	onPayloadSizeChange: (size: PayloadSize) => void;
	onDurationChange: (duration: TestDuration) => void;
	onAutoRunCountChange: (count: AutoRunCount) => void;
	onRunBenchmark: () => void;
	onRunAutoTests: () => void;
	onStopAutoRun: () => void;
}

const BenchmarkControls = memo(function BenchmarkControls({
	isRunning,
	benchmarkMode,
	payloadSize,
	testDuration,
	progress,
	isAutoRunning,
	autoRunCount,
	autoRunProgress,
	autoRunCurrent,
	autoRunTotal,
	onModeChange,
	onPayloadSizeChange,
	onDurationChange,
	onAutoRunCountChange,
	onRunBenchmark,
	onRunAutoTests,
	onStopAutoRun,
}: BenchmarkControlsProps) {
	return (
		<div className="bg-white border p-6" style={{ borderColor: "#000000" }}>
			<h2
				className="text-xl font-bold font-mono tracking-wide mb-4"
				style={{ color: "#000000" }}
			>
				BENCHMARK CONFIGURATION
			</h2>

			{/* Mode Selection */}
			<div className="mb-6">
				<label
					className="block text-sm font-bold font-mono mb-2"
					style={{ color: "#000000" }}
				>
					BENCHMARK MODE:
				</label>
				<select
					value={benchmarkMode}
					onChange={(e) => onModeChange(e.target.value as BenchmarkMode)}
					className="w-full p-2 border text-sm font-mono focus:outline-none"
					style={{
						borderColor: "#000000",
						backgroundColor: "#FFFFFF",
						color: "#000000",
					}}
					onFocus={(e) => {
						e.target.style.borderColor = "#0143EB";
						e.target.style.backgroundColor = "#F3F3F3";
					}}
					onBlur={(e) => {
						e.target.style.borderColor = "#000000";
						e.target.style.backgroundColor = "#FFFFFF";
					}}
					disabled={isRunning || isAutoRunning}
				>
					<option value="unfair">
						❌ Unfair (JSON basic vs WASM compressed)
					</option>
					<option value="raw" disabled>
						🚫 Raw Mode (Impossible - WASM always compressed)
					</option>
					<option value="compressed">⚖️ Fair (Both compressed)</option>
				</select>
				<p className="text-xs font-mono mt-1" style={{ color: "#0143EB" }}>
					{getModeDescription(benchmarkMode)}
				</p>
			</div>

			{/* Payload Size Selection */}
			<div className="mb-6">
				<label
					className="block text-sm font-bold font-mono mb-2"
					style={{ color: "#000000" }}
				>
					PAYLOAD SIZE:
				</label>
				<select
					value={payloadSize}
					onChange={(e) => onPayloadSizeChange(e.target.value as PayloadSize)}
					className="w-full p-2 border text-sm font-mono focus:outline-none"
					style={{
						borderColor: "#000000",
						backgroundColor: "#FFFFFF",
						color: "#000000",
					}}
					onFocus={(e) => {
						e.target.style.borderColor = "#0143EB";
						e.target.style.backgroundColor = "#F3F3F3";
					}}
					onBlur={(e) => {
						e.target.style.borderColor = "#000000";
						e.target.style.backgroundColor = "#FFFFFF";
					}}
					disabled={isRunning || isAutoRunning}
				>
					<option value="11b">11 bytes (Tiny - favors JSON)</option>
					<option value="2kb">2KB (Medium - realistic)</option>
					<option value="10kb">10KB (Large - favors compression)</option>
				</select>
				<p className="text-xs font-mono mt-1" style={{ color: "#0143EB" }}>
					Larger payloads show WASM compression benefits vs JSON overhead
				</p>
			</div>

			{/* Test Duration Selection */}
			<div className="mb-6">
				<label
					className="block text-sm font-bold font-mono mb-2"
					style={{ color: "#000000" }}
				>
					TEST DURATION:
				</label>
				<select
					value={testDuration}
					onChange={(e) =>
						onDurationChange(Number(e.target.value) as TestDuration)
					}
					className="w-full p-2 border text-sm font-mono focus:outline-none"
					style={{
						borderColor: "#000000",
						backgroundColor: "#FFFFFF",
						color: "#000000",
					}}
					onFocus={(e) => {
						e.target.style.borderColor = "#0143EB";
						e.target.style.backgroundColor = "#F3F3F3";
					}}
					onBlur={(e) => {
						e.target.style.borderColor = "#000000";
						e.target.style.backgroundColor = "#FFFFFF";
					}}
					disabled={isRunning || isAutoRunning}
				>
					<option value={5}>5 seconds (Quick test)</option>
					<option value={10}>10 seconds (Standard)</option>
					<option value={15}>15 seconds (Extended)</option>
					<option value={30}>30 seconds (Thorough)</option>
					<option value={60}>60 seconds (Maximum)</option>
				</select>
				<p className="text-xs font-mono mt-1" style={{ color: "#0143EB" }}>
					Longer tests provide more accurate performance measurements
				</p>
			</div>

			{/* Mode Explanation */}
			<div
				className="p-3 border mb-4"
				style={{
					borderColor: "#000000",
					backgroundColor: benchmarkMode === "unfair" ? "#F3F3F3" : "#FFFFFF",
				}}
			>
				<div className="text-sm font-mono">
					{benchmarkMode === "unfair" ? (
						<>
							<div className="font-bold mb-1" style={{ color: "#000000" }}>
								⚠️ WHY THIS IS UNFAIR:
							</div>
							<div className="text-xs" style={{ color: "#0143EB" }}>
								• WASM: LZ4 compression + CRC32 + bincode + WASM overhead
								<br />• JSON: Simple JSON.stringify + basic CRC32
								<br />• Result: WASM does 10x more work!
							</div>
						</>
					) : benchmarkMode === "raw" ? (
						<>
							<div className="font-bold mb-1" style={{ color: "#000000" }}>
								🚫 RAW MODE NOT POSSIBLE:
							</div>
							<div className="text-xs" style={{ color: "#0143EB" }}>
								Rust WASM has LZ4 compression baked into the code.
								<br />
								Lines 55-58 in packet.rs always compress payload.
								<br />
								Cannot be disabled without modifying Rust source.
							</div>
						</>
					) : (
						<>
							<div className="font-bold mb-1" style={{ color: "#000000" }}>
								✅ FAIR COMPARISON:
							</div>
							<div className="text-xs" style={{ color: "#0143EB" }}>
								Both implementations use compression and equivalent work
								complexity.
							</div>
						</>
					)}
				</div>
			</div>

			<div className="space-y-4 mb-6">
				<div className="font-mono text-sm" style={{ color: "#000000" }}>
					<span className="font-bold">TEST DATA:</span> Random data
				</div>
				<div className="font-mono text-sm" style={{ color: "#000000" }}>
					<span className="font-bold">DURATION:</span> {testDuration} seconds
					per implementation
				</div>
			</div>

			{/* Auto-Run Section */}
			<div
				className="border p-4 mb-6"
				style={{ borderColor: "#000000", backgroundColor: "#F8F8F8" }}
			>
				<div
					className="text-lg font-bold font-mono mb-3"
					style={{ color: "#000000" }}
				>
					AUTO-RUN TESTS
				</div>

				<div className="mb-4">
					<label
						className="block text-sm font-bold font-mono mb-2"
						style={{ color: "#000000" }}
					>
						NUMBER OF TESTS:
					</label>
					<select
						value={autoRunCount}
						onChange={(e) =>
							onAutoRunCountChange(Number(e.target.value) as AutoRunCount)
						}
						className="w-full p-2 border text-sm font-mono focus:outline-none"
						style={{
							borderColor: "#000000",
							backgroundColor: "#FFFFFF",
							color: "#000000",
						}}
						disabled={isRunning || isAutoRunning}
					>
						<option value={5}>5 tests (Quick batch)</option>
						<option value={10}>10 tests (Small dataset)</option>
						<option value={20}>20 tests (Medium dataset)</option>
						<option value={50}>50 tests (Large dataset)</option>
						<option value={100}>100 tests (Comprehensive)</option>
					</select>
					<p className="text-xs font-mono mt-1" style={{ color: "#0143EB" }}>
						Auto-run will randomize modes and payload sizes for diverse data
					</p>
				</div>

				{isAutoRunning && (
					<div className="mb-4 space-y-2">
						<div
							className="flex justify-between text-sm font-mono"
							style={{ color: "#000000" }}
						>
							<span>AUTO-RUN PROGRESS:</span>
							<span>
								{autoRunCurrent}/{autoRunTotal}
							</span>
						</div>
						<div
							className="w-full border h-3"
							style={{ borderColor: "#000000", backgroundColor: "#F3F3F3" }}
						>
							<div
								className="h-full transition-all duration-300"
								style={{
									width: `${autoRunProgress}%`,
									backgroundColor: "#00FF5F",
								}}
							></div>
						</div>
						<div className="text-xs font-mono" style={{ color: "#0143EB" }}>
							Est. time remaining:{" "}
							{(
								((autoRunTotal - autoRunCurrent) * testDuration * 2) /
								60
							).toFixed(1)}{" "}
							min
						</div>
					</div>
				)}

				{!isAutoRunning && !isRunning ? (
					<button
						onClick={onRunAutoTests}
						className="font-bold py-2 px-4 w-full border font-mono tracking-wide transition-colors text-sm"
						style={{
							backgroundColor: "#00FF5F",
							color: "#000000",
							borderColor: "#000000",
						}}
						onMouseEnter={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor = "#000000";
							(e.target as HTMLButtonElement).style.color = "#FFFFFF";
						}}
						onMouseLeave={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor = "#00FF5F";
							(e.target as HTMLButtonElement).style.color = "#000000";
						}}
					>
						START AUTO-RUN ({autoRunCount} TESTS)
					</button>
				) : isAutoRunning ? (
					<button
						onClick={onStopAutoRun}
						className="font-bold py-2 px-4 w-full border font-mono tracking-wide transition-colors text-sm"
						style={{
							backgroundColor: "#FF4444",
							color: "#FFFFFF",
							borderColor: "#000000",
						}}
						onMouseEnter={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor = "#000000";
						}}
						onMouseLeave={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor = "#FF4444";
						}}
					>
						⏹️ STOP AUTO-RUN
					</button>
				) : (
					<div
						className="text-center py-2 text-sm font-mono"
						style={{ color: "#0143EB" }}
					>
						AUTO-RUN DISABLED DURING MANUAL TEST
					</div>
				)}
			</div>

			{!isRunning && !isAutoRunning ? (
				<button
					onClick={onRunBenchmark}
					className="font-bold py-3 px-8 text-lg w-full border font-mono tracking-wide transition-colors"
					style={{
						backgroundColor: "#0143EB",
						color: "#FFFFFF",
						borderColor: "#000000",
					}}
					onMouseEnter={(e) => {
						(e.target as HTMLButtonElement).style.backgroundColor = "#000000";
						(e.target as HTMLButtonElement).style.color = "#FFFFFF";
					}}
					onMouseLeave={(e) => {
						(e.target as HTMLButtonElement).style.backgroundColor = "#0143EB";
						(e.target as HTMLButtonElement).style.color = "#FFFFFF";
					}}
				>
					START SINGLE BENCHMARK
				</button>
			) : isAutoRunning ? (
				<div
					className="text-center py-3 text-lg font-mono font-bold"
					style={{ color: "#00FF5F" }}
				>
					AUTO-RUN IN PROGRESS...
				</div>
			) : (
				<div className="space-y-4">
					<div
						className="font-bold font-mono tracking-wide"
						style={{ color: "#000000" }}
					>
						RUNNING SINGLE BENCHMARK...
					</div>
					<div
						className="w-full border h-3"
						style={{ borderColor: "#000000", backgroundColor: "#F3F3F3" }}
					>
						<div
							className="h-full transition-all duration-300"
							style={{
								width: `${progress}%`,
								backgroundColor: "#0143EB",
							}}
						></div>
					</div>
					<div className="font-mono font-bold" style={{ color: "#0143EB" }}>
						{progress}%
					</div>
				</div>
			)}
		</div>
	);
});

export default BenchmarkControls;
