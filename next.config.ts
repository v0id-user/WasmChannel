import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	webpack: (config) => {
		// Add support for WASM files
		config.module.rules.push({
			test: /\.wasm$/,
			type: "asset/resource",
		});
		return config;
	},

	experimental: {
		reactCompiler: true,
	},
};

export default nextConfig;
