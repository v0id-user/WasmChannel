import { auth, createAuthWithD1 } from "@/auth";
import { base } from "~/contexts";
import { user } from "../db/schema/schema";
import { createDb } from "../db";

export const health = base.handler(async (c) => {
	let dbViaFunction: any;
	let authViaFunction: any;
	let resultViaFunction: any;
	let didIGetTheUserViaFunction: boolean;

	try {
		// Test via function
		dbViaFunction = createDb(c.context.DB);
		authViaFunction = createAuthWithD1(dbViaFunction);
		console.log("Auth initialized via function:", !!authViaFunction);
		console.log("DB initialized via function:", !!dbViaFunction);

		resultViaFunction = await dbViaFunction.select().from(user).limit(1);
		console.log("Result via function:", resultViaFunction);
		didIGetTheUserViaFunction = resultViaFunction.length > 0;

		const didIGetTheUser = didIGetTheUserViaFunction;

		// Test better auth
		const session = await auth.api.getSession({
			headers: c.context.req.raw.headers,
		});

		return {
			success: true,
			dbReadyViaFunction: !!dbViaFunction,
			authReadyViaFunction: !!authViaFunction,
			didIGetTheUser: !didIGetTheUserViaFunction || didIGetTheUserViaFunction, // That means a call to the db was made
			isSessionValid: !!session || session === null, // That means a call to the db was made
		};
	} catch (error) {
		console.error("Auth test error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
			dbViaFunction: !!dbViaFunction,
			authViaFunction: !!authViaFunction,
			resultViaFunction: !!resultViaFunction,
		};
	}
});
