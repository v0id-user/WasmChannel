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
};

export default nextConfig;
