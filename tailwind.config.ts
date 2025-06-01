import type { Config } from "tailwindcss";

export default {
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				background: "var(--background)",
				foreground: "var(--foreground)",
			},
			animation: {
				bounce: "bounce 0.5s ease-in-out",
				"pulse-dots": "pulse-dots 1.5s ease-in-out infinite",
				"fade-in-up": "fade-in-up 0.3s ease-out",
				"slide-in-left": "slide-in-left 0.3s ease-out",
				"slide-in-right": "slide-in-right 0.3s ease-out",
			},
			keyframes: {
				"pulse-dots": {
					"0%, 20%": { opacity: "0.2" },
					"50%": { opacity: "1" },
					"80%, 100%": { opacity: "0.2" },
				},
				"fade-in-up": {
					"0%": { opacity: "0", transform: "translateY(10px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				"slide-in-left": {
					"0%": { opacity: "0", transform: "translateX(-20px)" },
					"100%": { opacity: "1", transform: "translateX(0)" },
				},
				"slide-in-right": {
					"0%": { opacity: "0", transform: "translateX(20px)" },
					"100%": { opacity: "1", transform: "translateX(0)" },
				},
			},
		},
	},
	plugins: [require("daisyui")],
} satisfies Config;
