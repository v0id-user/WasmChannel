import { $ } from "bun";
import path from "path";

// ANSI color codes for beautiful logging
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	gray: "\x1b[90m",
} as const;

// Timeline state
let currentStep = 0;
const totalSteps = 2;

// Beautiful timeline logging
const timelineStates = {
	pending: `${colors.gray}○${colors.reset}`,
	active: `${colors.cyan}●${colors.reset}`,
	success: `${colors.green}●${colors.reset}`,
	error: `${colors.red}●${colors.reset}`,
} as const;

const connector = {
	continuing: `${colors.gray}│${colors.reset}`,
	last: `${colors.gray}└${colors.reset}`,
	branch: `${colors.gray}├${colors.reset}`,
} as const;

type LogState = keyof typeof timelineStates;

const logTimeline = (
	step: number,
	title: string,
	message = "",
	state: LogState = "active",
	isLast = false,
) => {
	const node = timelineStates[state];
	const conn = isLast ? connector.last : connector.branch;

	console.log(`${conn}${node} ${colors.bright}${title}${colors.reset}`);
	if (message) {
		const msgConnector = isLast ? "  " : `${colors.gray}│${colors.reset} `;
		console.log(`${msgConnector}${colors.dim}${message}${colors.reset}`);
	}
	if (!isLast) {
		console.log(`${colors.gray}│${colors.reset}`);
	}
};

const logSubStep = (message: string, isLast = false) => {
	const subConnector = isLast ? "  " : `${colors.gray}│${colors.reset} `;
	console.log(
		`${subConnector}${colors.gray}├─${colors.reset} ${colors.dim}${message}${colors.reset}`,
	);
};

const updateTimelineStep = (
	step: number,
	state: LogState,
	title: string,
	message = "",
	isLast = false,
) => {
	logTimeline(step, title, message, state, isLast);
};

const logHeader = (title: string) => {
	const border = "─".repeat(title.length + 2);
	console.log(`\n${colors.cyan}┌${border}┐${colors.reset}`);
	console.log(
		`${colors.cyan}│${colors.reset} ${colors.bright}${colors.white}${title}${colors.reset} ${colors.cyan}│${colors.reset}`,
	);
	console.log(`${colors.cyan}└${border}┘${colors.reset}`);
};

const logSuccess = (message: string) => {
	console.log(`\n${colors.green}┌─ ✅ SUCCESS${colors.reset}`);
	console.log(
		`${colors.green}└─${colors.reset} ${colors.bright}${message}${colors.reset}\n`,
	);
};

const logError = (message: string) => {
	console.log(`\n${colors.red}┌─ ❌ FAILED${colors.reset}`);
	console.log(
		`${colors.red}└─${colors.reset} ${colors.bright}${message}${colors.reset}\n`,
	);
};

// Type for build modes
type BuildMode = "dev" | "release";

// Main build logic
const mode: BuildMode = (process.argv[2] as BuildMode) || "dev";
const rustWasmPath = path.resolve(process.cwd(), "rust_wasm");
const outDir = path.resolve(process.cwd(), "public", "wasm");

// Build command arguments
const buildArgs = [
	"build",
	"--target",
	"web",
	"--out-dir",
	outDir,
	mode === "release" ? "--release" : "--dev",
];

// Start the build process
logHeader(`🦀 WASM Build Pipeline - ${mode.toUpperCase()} Mode`);

console.log(`\n${colors.gray}Pipeline Overview:${colors.reset}`);
logTimeline(1, "🔧 Compile Rust → WebAssembly", "", "pending");
if (mode === "release") {
	logTimeline(2, "⚡ Optimize WASM Binary", "", "pending", true);
} else {
	console.log(
		`${connector.last}${timelineStates.pending} ${colors.dim}Optimization skipped in dev mode${colors.reset}`,
	);
}

console.log(`\n${colors.gray}Execution:${colors.reset}`);

const startTime = Date.now();

// Step 1: Compilation
updateTimelineStep(
	1,
	"active",
	"🔧 Compiling Rust to WebAssembly",
	`Mode: ${mode} | Target: web`,
);
logSubStep(`Source: ${path.basename(rustWasmPath)}`);
logSubStep(`Output: ${path.relative(process.cwd(), outDir)}`);

try {
	// Use Bun shell to run wasm-pack
	const result = await $`wasm-pack ${buildArgs}`
		.cwd(rustWasmPath)
		.nothrow()
		.quiet();

	if (result.exitCode !== 0) {
		const errorMessage =
			result.stderr.toString() || `Process exited with code ${result.exitCode}`;
		updateTimelineStep(
			1,
			"error",
			"🔧 Compilation Failed",
			errorMessage,
			mode !== "release",
		);
		logError(`Build failed: ${errorMessage}`);
		process.exit(1);
	}

	const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);
	updateTimelineStep(
		1,
		"success",
		"🔧 Compilation Complete",
		`✨ Completed in ${buildTime}s`,
		mode !== "release",
	);

	if (mode === "release") {
		// Step 2: Optimization
		console.log(`${colors.gray}│${colors.reset}`);
		updateTimelineStep(
			2,
			"active",
			"⚡ Optimizing WASM Binary",
			"Running wasm-opt with size optimization",
		);

		const wasmFile = path.join(outDir, "wasmchannel_bg.wasm");
		const optimizeStartTime = Date.now();

		try {
			// Get initial file size
			const initialSize = Bun.file(wasmFile).size;
			const initialSizeKB = (initialSize / 1024).toFixed(2);

			const optimizeResult =
				await $`wasm-opt -Oz --strip-target-features --strip-eh --strip-dwarf --strip-debug --strip-producers --remove-unused-module-elements --flatten --dce --vacuum --reorder-functions --reorder-locals --merge-blocks --local-cse --simplify-locals --coalesce-locals --optimize-instructions --fast-math ${wasmFile} -o ${wasmFile}`
					.cwd(rustWasmPath)
					.nothrow()
					.quiet();

			if (optimizeResult.exitCode !== 0) {
				const optErrorMessage =
					optimizeResult.stderr.toString() ||
					`Optimization failed with code ${optimizeResult.exitCode}`;
				updateTimelineStep(
					2,
					"error",
					"⚡ Optimization Failed",
					optErrorMessage,
					true,
				);
				logError(`Optimization failed: ${optErrorMessage}`);
				logSuccess("🎉 Build completed (without optimization)!");
				process.exit(0);
			}

			// Get final file size and calculate reduction
			const finalSize = Bun.file(wasmFile).size;
			const finalSizeKB = (finalSize / 1024).toFixed(2);
			const reduction = ((1 - finalSize / initialSize) * 100).toFixed(1);

			const optimizeTime = ((Date.now() - optimizeStartTime) / 1000).toFixed(2);
			const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

			updateTimelineStep(
				2,
				"success",
				"⚡ Optimization Complete",
				`✨ Completed in ${optimizeTime}s | Size: ${initialSizeKB}KB → ${finalSizeKB}KB (${reduction}% reduction)`,
				true,
			);
			logSuccess(`🚀 Release build completed in ${totalTime}s`);
		} catch (optError) {
			updateTimelineStep(
				2,
				"error",
				"⚡ Optimization Failed",
				String(optError),
				true,
			);
			logError(`Optimization failed: ${optError}`);
			logSuccess("🎉 Build completed (without optimization)!");
		}
	} else {
		const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
		logSuccess(`🚀 Development build completed in ${totalTime}s`);
	}
} catch (error) {
	updateTimelineStep(
		1,
		"error",
		"🔧 Compilation Failed",
		String(error),
		mode !== "release",
	);
	logError(`Build failed: ${error}`);
	process.exit(1);
}
