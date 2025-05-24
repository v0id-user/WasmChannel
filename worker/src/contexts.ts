import { os } from "@orpc/server";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { HonoRequest } from "hono";
import { auth } from "@/auth";

export interface AppContext {
	db: DrizzleD1Database<Record<string, never>> & { $client: D1Database };
	req: HonoRequest;
	session: Awaited<ReturnType<typeof auth.api.getSession>>;
}

export const base = os.$context<AppContext>().errors({
	Unauthorized: {
		status: 401,
		message: "Unauthorized",
	},
});

// TODO: protected base context

export const protectedBase = base.use(async ({ context, errors, next }) => {
	const { req } = context;
	const session = await auth.api.getSession({
		headers: new Headers(req.header()),
	});

	if (!session) {
		throw errors.Unauthorized();
	}

	return next({ context: { session } });
});
