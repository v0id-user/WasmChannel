import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Exclude worker folder from file tracing
	outputFileTracingExcludes: {
		"*": ["./worker/**/*"],
	},
	
	webpack: (config) => {
		// Add support for WASM files
		config.module.rules.push({
			test: /\.wasm$/,
			type: "asset/resource",
		});
		
		// Completely exclude worker directory from webpack processing
		config.externals = config.externals || [];
		if (Array.isArray(config.externals)) {
			config.externals.push({
				"@/worker": "commonjs @/worker",
				"./worker": "commonjs ./worker",
			});
		}
		
		// Ignore worker files in module resolution
		config.resolve = config.resolve || {};
		config.resolve.alias = config.resolve.alias || {};
		
		// Add ignore rule for worker directory
		config.module.rules.push({
			test: /worker[\/\\]/,
			use: "ignore-loader"
		});
		
		return config;
	},

	experimental: {
		reactCompiler: true,
	},
};

export default nextConfig;
