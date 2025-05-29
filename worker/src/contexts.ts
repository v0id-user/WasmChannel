import { os } from "@orpc/server";
import { auth } from "@/auth";
import { Room } from "./objects/room";
import { HonoRequest } from "hono";
export interface AppContext {
	DB: D1Database;
	req: HonoRequest;
	KV: KVNamespace;
	QUEUE_MESSAGES: Queue<Uint8Array>;
	ROOM: DurableObjectNamespace<Room>;
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
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
