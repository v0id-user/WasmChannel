/**
 * ░▒▓ BENCHMARK ▓▒░
 *
 * Built by Cursor.
 * Watched by #V0ID.
 *
 * Pull requests welcome. But don't just bring new code, bring data.
 *
 * git clone https://github.com/v0id-user/WasmChannel.git
 *
 */

"use client";

import { memo } from "react";
import BenchmarkControls from "@/components/bench/BenchmarkControls";
import BenchmarkResults from "@/components/bench/BenchmarkResults";
import BenchmarkConsole from "@/components/bench/BenchmarkConsole";
import BenchmarkComparisonTable from "@/components/bench/BenchmarkComparisonTable";
import { useBenchmark } from "@/components/bench/useBenchmark";

const BenchmarkPage = memo(function BenchmarkPage() {
	const {
		isRunning,
		results,
		progress,
		logs,
		benchmarkMode,
		payloadSize,
		testDuration,
		isWasmWarmedUp,
		comparisonEntries,
		// Auto-run state
		isAutoRunning,
		autoRunCount,
		autoRunProgress,
		autoRunCurrent,
		autoRunTotal,
		// Actions
		runBenchmark,
		runAutoTests,
		stopAutoRun,
		clearLogs,
		clearComparisonEntries,
		// Handlers
		handleModeChange,
		handlePayloadSizeChange,
		handleDurationChange,
		handleAutoRunCountChange,
	} = useBenchmark();

	return (
		<div className="min-h-screen p-4" style={{ backgroundColor: "#F3F3F3" }}>
			<div className="max-w-6xl mx-auto">
				<div className="text-center mb-8">
					<h1
						className="text-4xl font-bold font-mono tracking-wide mb-2"
						style={{ color: "#000000" }}
					>
						BENCHMARK
					</h1>
					<p className="font-mono text-sm mb-4" style={{ color: "#0143EB" }}>
						Performance Benchmark: Rust WASM vs JSON
					</p>

					{/* CLI-like WASM Status */}
					<div
						className="inline-flex items-center gap-1 px-2 py-1 font-mono text-xs"
						style={{
							background: "#181818",
							color: isWasmWarmedUp ? "#00FF5F" : "#FFB300",
							border: `1.5px solid ${isWasmWarmedUp ? "#00FF5F" : "#FFB300"}`,
							borderRadius: "2px",
							boxShadow: "0 1px 0 #0002",
							letterSpacing: "0.02em",
							userSelect: "none",
							minHeight: "1.5rem",
						}}
					>
						<span style={{ fontWeight: 700 }}>
							{isWasmWarmedUp ? "▸ WASM: WARMED UP" : "▸ WASM: COLD START"}
						</span>
						{!isWasmWarmedUp && (
							<span
								className="ml-2 text-[10px] opacity-60"
								style={{ fontWeight: 400 }}
							>
								(JIT overhead)
							</span>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Benchmark Controls */}
					<BenchmarkControls
						isRunning={isRunning}
						benchmarkMode={benchmarkMode}
						payloadSize={payloadSize}
						testDuration={testDuration}
						progress={progress}
						isAutoRunning={isAutoRunning}
						autoRunCount={autoRunCount}
						autoRunProgress={autoRunProgress}
						autoRunCurrent={autoRunCurrent}
						autoRunTotal={autoRunTotal}
						onModeChange={handleModeChange}
						onPayloadSizeChange={handlePayloadSizeChange}
						onDurationChange={handleDurationChange}
						onAutoRunCountChange={handleAutoRunCountChange}
						onRunBenchmark={runBenchmark}
						onRunAutoTests={runAutoTests}
						onStopAutoRun={stopAutoRun}
					/>

					{/* Console Logs */}
					<BenchmarkConsole logs={logs} onClear={clearLogs} />
				</div>

				{/* Results Section */}
				{results && !isRunning && !isAutoRunning && (
					<div className="mt-6">
						<BenchmarkResults results={results} onRunAgain={runBenchmark} />
					</div>
				)}

				{/* Comparison Table */}
				<div className="mt-6">
					<BenchmarkComparisonTable
						entries={comparisonEntries}
						onClear={clearComparisonEntries}
					/>
				</div>

				<div className="text-center mt-8 text-sm font-mono">
					<div className="mb-2" style={{ color: "#000000" }}>
						<span style={{ color: "#0143EB" }}>●</span> WINNER{" "}
						<span style={{ color: "#000000" }}>●</span> NORMAL{" "}
						<span style={{ color: "#0143EB" }}>●</span> INFO
					</div>
					<div style={{ color: "#0143EB" }}>
						CHOOSE PAYLOAD SIZE AND BENCHMARK MODE FOR FAIR COMPARISON
					</div>
				</div>
			</div>
		</div>
	);
});

export default BenchmarkPage;
