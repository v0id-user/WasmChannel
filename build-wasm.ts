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
const currentStep = 0;
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
const outDirs = [
	{ name: "public", path: path.resolve(process.cwd(), "public", "wasm") },
	{ name: "worker", path: path.resolve(process.cwd(), "worker", "wasm") },
];

// Start the build process
logHeader(`🦀 WASM Build Pipeline - ${mode.toUpperCase()} Mode`);

console.log(`\n${colors.gray}Pipeline Overview:${colors.reset}`);
logTimeline(
	1,
	"🔧 Compile Rust → WebAssembly",
	"Building for public & worker",
	"pending",
);
if (mode === "release") {
	logTimeline(
		2,
		"⚡ Optimize WASM Binaries",
		"Applying optimizations to both outputs",
		"pending",
		true,
	);
} else {
	console.log(
		`${connector.last}${timelineStates.pending} ${colors.dim}Optimization skipped in dev mode${colors.reset}`,
	);
}

console.log(`\n${colors.gray}Execution:${colors.reset}`);

const startTime = Date.now();

// Post-build patching function for worker files
const patchWorkerFiles = async (workerDir: string) => {
	const wasmChannelJs = path.join(workerDir, "wasmchannel.js");

	try {
		// Read the current file
		const currentContent = await Bun.file(wasmChannelJs).text();

		// Check if it needs patching (if it contains __wbindgen_start call)
		if (currentContent.includes("__wbindgen_start()")) {
			// Create the patched content
			const patchedContent = `import * as imports from "./wasmchannel_bg.js";

// switch between both syntax for node and for workerd
import wkmod from "./wasmchannel_bg.wasm";
import * as nodemod from "./wasmchannel_bg.wasm";

if (typeof process !== "undefined" && process.release?.name === "node") {
  imports.__wbg_set_wasm(nodemod);
} else {
  const instance = new WebAssembly.Instance(wkmod, {
    "./wasmchannel_bg.js": imports,
  });
  imports.__wbg_set_wasm(instance.exports);
}

export * from "./wasmchannel_bg.js";
`;

			// Write the patched content
			await Bun.write(wasmChannelJs, patchedContent);
			return true;
		}
		return false;
	} catch (error) {
		console.error(`Failed to patch ${wasmChannelJs}:`, error);
		return false;
	}
};

// Step 1: Compilation
updateTimelineStep(
	1,
	"active",
	"🔧 Compiling Rust to WebAssembly",
	`Mode: ${mode} | Target: web | Outputs: public & worker`,
);
logSubStep(`Source: ${path.basename(rustWasmPath)}`);

try {
	let totalBuildTime = 0;

	// Build for each output directory
	for (let i = 0; i < outDirs.length; i++) {
		const { name, path: outDir } = outDirs[i];
		const isLast = i === outDirs.length - 1;

		logSubStep(
			`Building for ${name}: ${path.relative(process.cwd(), outDir)}`,
			false,
		);

		// Build command arguments for this output - use bundler target for worker, web target for public
		const target = name === "worker" ? "bundler" : "web";
		const buildArgs = [
			"build",
			"--target",
			target,
			"--out-dir",
			outDir,
			mode === "release" ? "--release" : "--dev",
		];

		const buildStartTime = Date.now();

		// Use Bun shell to run wasm-pack
		const result = await $`wasm-pack ${buildArgs}`
			.cwd(rustWasmPath)
			.nothrow()
			.quiet();

		if (result.exitCode !== 0) {
			const errorMessage =
				result.stderr.toString() ||
				`Process exited with code ${result.exitCode}`;
			updateTimelineStep(
				1,
				"error",
				"🔧 Compilation Failed",
				`Failed building for ${name}: ${errorMessage}`,
				mode !== "release",
			);
			logError(`Build failed for ${name}: ${errorMessage}`);
			process.exit(1);
		}

		const buildTime = ((Date.now() - buildStartTime) / 1000).toFixed(2);
		totalBuildTime += Date.now() - buildStartTime;

		// Post-build patching for worker target
		if (name === "worker") {
			logSubStep(`Patching ${name} files for Cloudflare Workers...`, false);
			const patched = await patchWorkerFiles(outDir);
			if (patched) {
				logSubStep(`✓ ${name} files patched successfully`, false);
			} else {
				logSubStep(`- ${name} files already compatible`, false);
			}
		}

		// Remove .gitignore file in release mode
		if (mode === "release") {
			const gitignorePath = path.join(outDir, ".gitignore");
			try {
				await Bun.file(gitignorePath).exists() && await $`rm ${gitignorePath}`.nothrow();
				logSubStep(`✓ Removed .gitignore from ${name}`, false);
			} catch (error) {
				// Ignore errors if file doesn't exist or can't be removed
			}
		}

		// Show individual build completion in substep style
		const subConnector =
			isLast && mode !== "release" ? "  " : `${colors.gray}│${colors.reset} `;
		console.log(
			`${subConnector}${colors.gray}  ✓${colors.reset} ${colors.green}${name} completed in ${buildTime}s${colors.reset}`,
		);
	}

	const avgBuildTime = (totalBuildTime / 1000).toFixed(2);
	updateTimelineStep(
		1,
		"success",
		"🔧 Compilation Complete",
		`✨ Both outputs completed in ${avgBuildTime}s`,
		mode !== "release",
	);

	if (mode === "release") {
		// Step 2: Optimization
		console.log(`${colors.gray}│${colors.reset}`);
		updateTimelineStep(
			2,
			"active",
			"⚡ Optimizing WASM Binaries",
			"Running wasm-opt with size optimization on both outputs",
		);

		let totalOptTime = 0;
		const optimizationResults = [];

		for (let i = 0; i < outDirs.length; i++) {
			const { name, path: outDir } = outDirs[i];
			const isLast = i === outDirs.length - 1;

			const wasmFile = path.join(outDir, "wasmchannel_bg.wasm");
			logSubStep(
				`Optimizing ${name}: ${path.relative(process.cwd(), wasmFile)}`,
				isLast,
			);

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
					throw new Error(optErrorMessage);
				}

				// Get final file size and calculate reduction
				const finalSize = Bun.file(wasmFile).size;
				const finalSizeKB = (finalSize / 1024).toFixed(2);
				const reduction = ((1 - finalSize / initialSize) * 100).toFixed(1);

				const optimizeTime = ((Date.now() - optimizeStartTime) / 1000).toFixed(
					2,
				);
				totalOptTime += Date.now() - optimizeStartTime;

				optimizationResults.push({
					name,
					initialSizeKB,
					finalSizeKB,
					reduction,
					optimizeTime,
				});

				// Show individual optimization completion
				const subConnector = isLast ? "  " : `${colors.gray}│${colors.reset} `;
				console.log(
					`${subConnector}${colors.gray}  ✓${colors.reset} ${colors.green}${name}: ${initialSizeKB}KB → ${finalSizeKB}KB (${reduction}% reduction)${colors.reset}`,
				);
			} catch (optError) {
				const subConnector = isLast ? "  " : `${colors.gray}│${colors.reset} `;
				console.log(
					`${subConnector}${colors.gray}  ✗${colors.reset} ${colors.red}${name}: optimization failed${colors.reset}`,
				);
				logError(`Optimization failed for ${name}: ${optError}`);
			}
		}

		const avgOptTime = (totalOptTime / 1000).toFixed(2);
		const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

		// Create summary of optimizations
		const successfulOpts = optimizationResults.length;
		const avgReduction =
			successfulOpts > 0
				? (
						optimizationResults.reduce(
							(sum, r) => sum + parseFloat(r.reduction),
							0,
						) / successfulOpts
					).toFixed(1)
				: "0";

		if (successfulOpts === outDirs.length) {
			updateTimelineStep(
				2,
				"success",
				"⚡ Optimization Complete",
				`✨ Both outputs optimized in ${avgOptTime}s | Average reduction: ${avgReduction}%`,
				true,
			);
			logSuccess(`🚀 Release build completed in ${totalTime}s`);
		} else if (successfulOpts > 0) {
			updateTimelineStep(
				2,
				"error",
				"⚡ Partial Optimization",
				`${successfulOpts}/${outDirs.length} outputs optimized successfully`,
				true,
			);
			logSuccess(
				`🎉 Build completed with partial optimization in ${totalTime}s`,
			);
		} else {
			updateTimelineStep(
				2,
				"error",
				"⚡ Optimization Failed",
				"All optimization attempts failed",
				true,
			);
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
