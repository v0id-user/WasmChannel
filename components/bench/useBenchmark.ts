import { useState, useCallback, useRef } from "react";
import {
	WasmPacket,
	PacketKind as WasmPacketKind,
	ReactionKind as WasmReactionKind,
} from "@/utils/wasm/init";
import {
	JsonPacket,
	JsonPacketKind,
	JsonReactionKind,
} from "@/utils/benchmarks/jsonPacket";
import {
	generateRandomPayload,
	generateFakeMessageData,
	getModeDescription,
} from "@/utils/benchmarks/helpers";
import type {
	BenchmarkResult,
	LogEntry,
	BenchmarkMode,
	PayloadSize,
	ComparisonEntry,
	TestDuration,
	AutoRunCount,
} from "@/types/benchmark";

export function useBenchmark() {
	const [isRunning, setIsRunning] = useState(false);
	const [results, setResults] = useState<BenchmarkResult | null>(null);
	const [progress, setProgress] = useState(0);
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [benchmarkMode, setBenchmarkMode] =
		useState<BenchmarkMode>("compressed");
	const [payloadSize, setPayloadSize] = useState<PayloadSize>("2kb");
	const [testDuration, setTestDuration] = useState<TestDuration>(5);
	const [isWasmWarmedUp, setIsWasmWarmedUp] = useState(false);
	const [comparisonEntries, setComparisonEntries] = useState<ComparisonEntry[]>(
		[],
	);

	// Auto-run state
	const [isAutoRunning, setIsAutoRunning] = useState(false);
	const [autoRunCount, setAutoRunCount] = useState<AutoRunCount>(10);
	const [autoRunProgress, setAutoRunProgress] = useState(0);
	const [autoRunCurrent, setAutoRunCurrent] = useState(0);
	const [autoRunTotal, setAutoRunTotal] = useState(0);
	const autoRunCancelRef = useRef(false);

	const addLog = useCallback(
		(
			type: LogEntry["type"],
			message: string,
			details?: LogEntry["details"],
		) => {
			const timestamp = new Date().toLocaleTimeString("en-US", {
				hour12: false,
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				fractionalSecondDigits: 3,
			});

			// Limit details to prevent memory bloat
			const lightDetails = details
				? {
						operations: details.operations,
						avgOpsPerSecond: details.avgOpsPerSecond,
						errors: details.errors,
					}
				: undefined;

			const logEntry: LogEntry = {
				timestamp,
				type,
				message,
				details: lightDetails,
			};

			setLogs((prev) => {
				const newLogs = [...prev, logEntry];
				// Limit to 50 entries to prevent memory leak
				return newLogs.length > 50 ? newLogs.slice(-50) : newLogs;
			});
		},
		[],
	);

	const clearLogs = useCallback(() => {
		setLogs([]);
	}, []);

	const clearComparisonEntries = useCallback(() => {
		setComparisonEntries([]);
	}, []);

	const runBenchmark = useCallback(
		async (singleRun = false) => {
			setIsRunning(true);
			// Don't reset results immediately to prevent flickering
			setProgress(0);
			if (!singleRun) clearLogs();

			addLog(
				"info",
				`  Starting benchmark - ${getModeDescription(benchmarkMode)} (${testDuration}s duration)`,
			);
			addLog(
				"warning",
				benchmarkMode === "unfair"
					? "⚠️ UNFAIR MODE: WASM does compression+CRC+bincode, JSON does basic operations"
					: "✅ FAIR MODE: Both implementations do equivalent work",
			);

			// Add WASM warm-up status indicator
			if (!isWasmWarmedUp) {
				addLog(
					"warning",
					"WASM COLD START: First run includes JIT compilation overhead",
				);
			} else {
				addLog("success", "WASM WARMED UP: Optimal performance expected");
			}

			// Generate random test data
			const testPayload = generateRandomPayload(payloadSize);
			const jsonTestPayload = Array.from(testPayload);
			const fakeData = generateFakeMessageData();

			addLog(
				"info",
				`Test payload: ${payloadSize.toUpperCase()} random data (${testPayload.length} bytes)`,
				{
					byteLength: testPayload.length,
					mode: benchmarkMode,
					messageId: fakeData.messageId,
					userId: fakeData.userId,
				},
			);

			// Simplified progress updates to reduce UI repaints
			let progressStep = 0;
			const progressInterval = setInterval(() => {
				progressStep += 5;
				if (progressStep <= 95) {
					setProgress(progressStep);
				} else {
					clearInterval(progressInterval);
				}
			}, 200);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Rust WASM Benchmark
			const durationMs = testDuration * 1000;
			addLog(
				"info",
				`🦀 Starting Rust WASM benchmark (${testDuration} seconds)`,
			);
			const rustStartTime = performance.now();
			let rustOperations = 0;
			let rustErrors = 0;

			addLog(
				"info",
				"WASM direct calls (no wrapper overhead): LZ4 compression + CRC32 + bincode",
			);

			let lastRustLogTime = rustStartTime;
			while (performance.now() - rustStartTime < durationMs) {
				try {
					const fakeData = generateFakeMessageData();
					const packet = new WasmPacket(
						WasmPacketKind.Message,
						fakeData.messageId,
						fakeData.userId,
						WasmReactionKind.Like,
						testPayload,
					);
					const serialized = packet.serialize();
					const deserialized = WasmPacket.deserialize(serialized);

					if (deserialized) {
						rustOperations++;

						// Reduce logging frequency for better performance
						if (rustOperations % 500 === 0) {
							const currentTime = performance.now();
							const opsPerSec = 500 / ((currentTime - lastRustLogTime) / 1000);
							addLog(
								"info",
								`🦀 Rust WASM: ${rustOperations} ops (${opsPerSec.toFixed(0)} ops/sec avg)`,
								{
									operations: rustOperations,
									avgOpsPerSecond: opsPerSec.toFixed(2),
									serializedSize: serialized.length,
								},
							);
							lastRustLogTime = currentTime;
						}
					} else {
						rustErrors++;
					}
				} catch {
					rustErrors++;
					if (rustErrors === 1) {
						addLog("error", "WASM operation failed", { errors: rustErrors });
					}
					if (rustErrors > 10) break;
				}
			}

			const rustDuration = performance.now() - rustStartTime;
			const rustOpsPerSec = rustOperations / (rustDuration / 1000);

			addLog("success", `🦀 Rust WASM completed`, {
				duration: `${rustDuration.toFixed(2)}ms`,
				totalOperations: rustOperations,
				opsPerSecond: rustOpsPerSec.toFixed(2),
				errors: rustErrors,
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// JSON Benchmark
			const useCompression = benchmarkMode === "compressed";
			const useBasicMode = benchmarkMode === "raw";

			addLog(
				"info",
				`📄 Starting JSON benchmark (${testDuration} seconds) - ${
					useCompression
						? "WITH compression"
						: useBasicMode
							? "RAW mode (no compression)"
							: "UNFAIR mode (basic JSON only)"
				}`,
			);

			const jsonStartTime = performance.now();
			let jsonOperations = 0;
			let jsonErrors = 0;

			let lastJsonLogTime = jsonStartTime;
			while (performance.now() - jsonStartTime < durationMs) {
				try {
					const fakeData = generateFakeMessageData();
					const packet = new JsonPacket(
						JsonPacketKind.Message,
						fakeData.messageId,
						fakeData.userId,
						JsonReactionKind.Like,
						jsonTestPayload,
						useCompression,
					);
					const serialized = packet.serialize();
					const deserialized = JsonPacket.deserialize(
						serialized,
						useCompression,
					);

					if (deserialized) {
						jsonOperations++;

						// Reduce logging frequency for better performance
						if (jsonOperations % 500 === 0) {
							const currentTime = performance.now();
							const opsPerSec = 500 / ((currentTime - lastJsonLogTime) / 1000);
							addLog(
								"info",
								`📄 JSON: ${jsonOperations} ops (${opsPerSec.toFixed(0)} ops/sec avg)`,
								{
									operations: jsonOperations,
									avgOpsPerSecond: opsPerSec.toFixed(2),
									serializedSize: serialized.length,
									compression: useCompression,
								},
							);
							lastJsonLogTime = currentTime;
						}
					} else {
						jsonErrors++;
					}
				} catch {
					jsonErrors++;
					if (jsonErrors === 1) {
						addLog("error", "JSON operation failed", { errors: jsonErrors });
					}
					if (jsonErrors > 10) break;
				}
			}

			const jsonDuration = performance.now() - jsonStartTime;
			const jsonOpsPerSec = jsonOperations / (jsonDuration / 1000);

			addLog("success", `📄 JSON completed`, {
				duration: `${jsonDuration.toFixed(2)}ms`,
				totalOperations: jsonOperations,
				opsPerSecond: jsonOpsPerSec.toFixed(2),
				errors: jsonErrors,
				compression: useCompression,
			});

			// Clean up progress interval and set final progress
			clearInterval(progressInterval);
			setProgress(100);

			const rustWinner = rustOperations > jsonOperations;
			const jsonWinner = jsonOperations > rustOperations;

			// Analysis based on mode
			if (benchmarkMode === "unfair") {
				addLog(
					"warning",
					"⚠️ UNFAIR COMPARISON: WASM does much more work than JSON!",
					{
						wasmWork: "LZ4 compression + CRC32 + bincode + WASM overhead",
						jsonWork: "Simple JSON.stringify + basic CRC32",
						recommendation: "Use Raw or Compressed mode for fair comparison",
					},
				);
			} else {
				addLog("info", "📊 Fair benchmark analysis complete");
			}

			if (rustWinner) {
				const advantage = ((rustOperations / jsonOperations - 1) * 100).toFixed(
					1,
				);
				addLog("success", `🏆 Rust WASM wins by ${advantage}%`, {
					rustOps: rustOperations,
					jsonOps: jsonOperations,
					advantage: `${advantage}%`,
				});
			} else if (jsonWinner) {
				const advantage = ((jsonOperations / rustOperations - 1) * 100).toFixed(
					1,
				);
				addLog("success", `🏆 JSON wins by ${advantage}%`, {
					rustOps: rustOperations,
					jsonOps: jsonOperations,
					advantage: `${advantage}%`,
				});
			} else {
				addLog("info", "🤝 It's a tie!", {
					rustOps: rustOperations,
					jsonOps: jsonOperations,
				});
			}

			setResults({
				rust: rustOperations,
				json: jsonOperations,
				rustWinner,
				jsonWinner,
				mode: benchmarkMode,
				rustErrors,
				jsonErrors,
			});

			// Add to comparison entries
			const newEntry: ComparisonEntry = {
				id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				payloadSize,
				mode: benchmarkMode,
				rustOps: rustOperations,
				jsonOps: jsonOperations,
				rustErrors,
				jsonErrors,
				timestamp: new Date().toISOString(),
			};

			setComparisonEntries((prev) => [...prev, newEntry]);

			// Mark WASM as warmed up after first run
			if (!isWasmWarmedUp) {
				setIsWasmWarmedUp(true);
				addLog("success", "🔥 WASM is now warmed up for subsequent runs");
			}

			setIsRunning(false);
			addLog("success", "✅ BENCHMARK finished");

			// Console logging for easy access to results
			console.log("  BENCHMARK RESULTS:");
			console.log("================================");
			console.log(`Mode: ${benchmarkMode.toUpperCase()}`);
			console.log(
				`WASM Status: ${isWasmWarmedUp ? "WARMED UP" : "COLD START"}`,
			);
			console.log(
				`🦀 Rust WASM: ${rustOperations.toLocaleString()} operations`,
			);
			console.log(`📄 JSON: ${jsonOperations.toLocaleString()} operations`);
			console.log(`Rust Errors: ${rustErrors}`);
			console.log(`JSON Errors: ${jsonErrors}`);

			if (rustWinner) {
				const advantage = ((rustOperations / jsonOperations - 1) * 100).toFixed(
					1,
				);
				console.log(`🏆 WINNER: Rust WASM (${advantage}% faster)`);
			} else if (jsonWinner) {
				const advantage = ((jsonOperations / rustOperations - 1) * 100).toFixed(
					1,
				);
				console.log(`🏆 WINNER: JSON (${advantage}% faster)`);
			} else {
				console.log("🤝 RESULT: Tie!");
			}
			console.log("================================");
		},
		[
			benchmarkMode,
			payloadSize,
			testDuration,
			addLog,
			clearLogs,
			isWasmWarmedUp,
		],
	);

	// Auto-run functionality
	const runAutoTests = useCallback(async () => {
		setIsAutoRunning(true);
		setAutoRunCurrent(0);
		setAutoRunTotal(autoRunCount);
		setAutoRunProgress(0);
		autoRunCancelRef.current = false;

		addLog(
			"info",
			`  Starting AUTO-RUN: ${autoRunCount} tests with ${testDuration}s duration each`,
		);
		addLog(
			"info",
			`Total estimated time: ${((autoRunCount * testDuration * 2) / 60).toFixed(1)} minutes`,
		);

		const allModes: BenchmarkMode[] = ["compressed", "unfair"];
		const allSizes: PayloadSize[] = ["11b", "2kb", "10kb"];

		for (let i = 0; i < autoRunCount; i++) {
			// Check if auto-run was cancelled
			if (autoRunCancelRef.current) break;

			setAutoRunCurrent(i + 1);
			setAutoRunProgress((i / autoRunCount) * 100);

			// Randomize settings for diverse data
			const randomMode = allModes[Math.floor(Math.random() * allModes.length)];
			const randomSize = allSizes[Math.floor(Math.random() * allSizes.length)];

			setBenchmarkMode(randomMode);
			setPayloadSize(randomSize);

			addLog(
				"info",
				`🔄 Auto-run ${i + 1}/${autoRunCount}: ${randomSize.toUpperCase()} ${randomMode.toUpperCase()}`,
			);

			// Wait a bit for state to update
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Run single benchmark
			await runBenchmark(true);

			// Brief pause between tests
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		setAutoRunProgress(100);
		setIsAutoRunning(false);
		addLog(
			"success",
			`🎉 AUTO-RUN COMPLETE: Generated ${autoRunCount} benchmark results!`,
		);
	}, [autoRunCount, testDuration, runBenchmark, addLog]);

	const stopAutoRun = useCallback(() => {
		autoRunCancelRef.current = true;
		setIsAutoRunning(false);
		addLog("warning", "⏹️ AUTO-RUN STOPPED by user");
	}, [addLog]);

	// Memoized handlers to prevent unnecessary re-renders
	const handleModeChange = useCallback((mode: BenchmarkMode) => {
		setBenchmarkMode(mode);
	}, []);

	const handlePayloadSizeChange = useCallback((size: PayloadSize) => {
		setPayloadSize(size);
	}, []);

	const handleDurationChange = useCallback((duration: TestDuration) => {
		setTestDuration(duration);
	}, []);

	const handleAutoRunCountChange = useCallback((count: AutoRunCount) => {
		setAutoRunCount(count);
	}, []);

	return {
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
	};
}
