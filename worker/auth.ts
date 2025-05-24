import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import { createDb } from "./src/db";

// common better auth config
const commonConfig = {
	// Minimizing the auth options to only allow anonymous access
	emailAndPassword: {
		enabled: false,
	},
	account: {
		accountLinking: {
			enabled: false,
		},
	},

	trustedOrigins: [process.env.FRONTEND_URL!],

	plugins: [anonymous()],
};

// For CLI usage - uses a dummy D1 instance
export const auth = betterAuth({
	database: drizzleAdapter(
		// @ts-ignore - This will be replaced at runtime
		{} as DrizzleD1Database,
		{
			provider: "sqlite",
		},
	),
	...commonConfig,
});

// For runtime usage with actual D1 database
export function createAuth(db: DrizzleD1Database) {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "sqlite",
		}),
		...commonConfig,
	});
}

// For runtime usage with D1 binding
export function createAuthWithD1(d1: D1Database) {
	const db = createDb(d1);
	return createAuth(db);
}
