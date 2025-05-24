import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import { env } from "node:process";

export function createDb(d1: D1Database) {
	console.log("Creating DB with D1:", !!d1);
	return drizzle(d1);
}
