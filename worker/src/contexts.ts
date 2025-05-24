import { os } from "@orpc/server";
import type { DrizzleD1Database } from "drizzle-orm/d1";

export interface AppContext {
    db: DrizzleD1Database<Record<string, never>> & { $client: D1Database; };
}

export const base = os.$context<AppContext>();

// TODO: protected base context