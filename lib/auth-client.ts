import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_WORKER!,
	fetchOptions: {
		credentials: "include",
	},
});
