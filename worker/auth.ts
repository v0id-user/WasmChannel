// Load any env file around the project
import "dotenv/config";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as authSchema from "./src/db/schema/auth-schema";

export const auth = betterAuth({
	database: drizzleAdapter(
		// @ts-ignore - This trick is used to make the auth work with the D1 binding, and just generates a schemas. Migrations happen with drizzle-kit.
		{} as DrizzleD1Database,
		{
			provider: "sqlite",
			schema: authSchema,
		},
	),
	appName: "WasmChannel",
	baseURL: process.env.BETTER_AUTH_URL!,
	// Allowed domains
	user: {
		changeEmail: {
			enabled: false,
		},
		deleteUser: {
			enabled: false,
		},
	},

	// Minimizing the auth options to only allow anonymous access
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		autoSignIn: true,
	},

	advanced: {
		// Hard coded for production NOT GOOD FOR DEV
		crossSubDomainCookies: {
			enabled: true,
			domains: [process.env.WS_DOMAIN!],
		},
		defaultCookieAttributes: {
			domain: process.env.DOMAIN!,
			httpOnly: false,
			secure: process.env.DEBUG === "true" ? false : true,
			sameSite: process.env.DEBUG === "true" ? "Lax" : "None",
		},
	},
	trustedOrigins: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [],
});

// For runtime usage with actual D1 database
export function createAuth(db: DrizzleD1Database) {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema: authSchema,
		}),
		appName: "WasmChannel",
		baseURL: process.env.BETTER_AUTH_URL!,

		// Allowed domains
		user: {
			changeEmail: {
				enabled: false,
			},
			deleteUser: {
				enabled: false,
			},
		},

		// Minimizing the auth options to only allow anonymous access
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
			autoSignIn: true,
		},
		advanced: {
			// Hard coded for production NOT GOOD FOR DEV
			crossSubDomainCookies: {
				enabled: true,
				domains: [process.env.WS_DOMAIN!],
			},
			defaultCookieAttributes: {
				domain: process.env.DOMAIN!,
				httpOnly: false,
				secure: process.env.DEBUG === "true" ? false : true,
				sameSite: process.env.DEBUG === "true" ? "Lax" : "None",
			},
			ipAddress: {
				ipAddressHeaders: [
					"x-forwarded-for",
					"x-real-ip",
					"cf-connecting-ip",
					"true-client-ip",
					"cf-pseudo-ipv4",
					"x-client-ip"
				],
			},
		},
		trustedOrigins: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [],
	});
}

// For runtime usage with D1 binding
export function createAuthWithD1(d1: DrizzleD1Database) {
	return createAuth(d1);
}
