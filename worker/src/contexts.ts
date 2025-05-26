import { os } from "@orpc/server";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { HonoRequest } from "hono";
import { auth } from "@/auth";
import { Room } from "./objects/room";

export interface AppContext {
	db: DrizzleD1Database<Record<string, never>> & { $client: D1Database };
	req: HonoRequest;
	session: Awaited<ReturnType<typeof auth.api.getSession>>;
	room: DurableObjectStub<Room>;
}

export const base = os.$context<AppContext>();
export const protectedBase = base
	.errors({
		Unauthorized: {
			status: 401,
			message: "You must be authenticated to access this resource.",
		},
	})
	.use(async ({ context, errors, next }) => {
		const { session } = context;

		if (!session) {
			throw errors.Unauthorized();
		}

		return next({ context: { session } });
	});
