import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: process.env.BETTER_AUTH_BASE_URL!,
	fetchOptions: {
		credentials: "include",
	},
});
