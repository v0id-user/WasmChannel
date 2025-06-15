import { ORPCError } from "@orpc/server";
import { protectedBase } from "~/contexts";
import { DatabaseDriver, CacheDriver } from "~/driver/storage";

export const getMessages = protectedBase.messages.get.handler(
	async ({ context, input }) => {
		console.log("[getMessages] Starting message fetch");
		const { DB, KV } = context;
		console.log("[getMessages] Input parameters:", input);

		// Create drivers
		console.log("[getMessages] Initializing drivers");
		const cacheDriver = new CacheDriver(KV);
		const dbDriver = new DatabaseDriver(DB);
		console.log("[getMessages] Drivers initialized");

		const requestedLimit = input.limit || 50;

		try {
			// if there is a cursor don't return cache
			if (!input.cursor) {
				console.log("[getMessages] No cursor provided, attempting cache fetch");
				// First try to get messages from cache
				const cachedMessages = await cacheDriver.getMessages(requestedLimit);
				console.log(
					"[getMessages] Cache fetch result:",
					cachedMessages?.length || 0,
					"messages",
				);

				if (cachedMessages?.length) {
					// Check if cache meets the requested limit
					if (cachedMessages.length >= requestedLimit) {
						const output = {
							messages: cachedMessages.map((msg) => ({
								...msg,
								// Very bad hack
								createdAt: msg.createdAt || new Date(),
								updatedAt: msg.updatedAt || new Date(),
							})),
							source: "cache" as const,
						};
						console.log(
							"[getMessages] Cache meets limit, returning messages from cache",
							output,
						);
						return output;
					} else {
						console.log(
							"[getMessages] Cache doesn't meet limit, fetching additional from database",
						);
						// Get cursor from last cached message for database fetch
						const lastCachedMessage = cachedMessages[cachedMessages.length - 1];
						const remainingLimit = requestedLimit - cachedMessages.length;
						console.log("[getMessages] Remaining limit:", remainingLimit);
						console.log("[getMessages] Anchor message:", lastCachedMessage);
						// Fetch additional messages from database
						const additionalMessages = await dbDriver.getMessages(
							remainingLimit,
							// VERY BAD I'M SO ASHAMED OF DOING THIS BUT IT MUST WORK ANYWAY
							lastCachedMessage.createdAt?.toISOString() ??
								new Date().toISOString(), // Use last cached
						);
						console.log(
							"[getMessages] Additional database fetch result:",
							additionalMessages.length,
							"messages",
						);

						// Merge and deduplicate messages by both id and referenceId
						const allMessages = [...cachedMessages];
						const existingIds = new Set(cachedMessages.map((msg) => msg.id));
						const existingRefIds = new Set(
							cachedMessages.map((msg) => msg.refrenceId),
						);

						for (const msg of additionalMessages) {
							if (
								!existingIds.has(msg.id) &&
								!existingRefIds.has(msg.refrenceId)
							) {
								allMessages.push(msg);
								existingIds.add(msg.id);
								existingRefIds.add(msg.refrenceId);
							}
						}

						const output = {
							messages: allMessages.map((msg) => ({
								...msg,
								// Very bad hack
								createdAt: msg.createdAt || new Date(),
								updatedAt: msg.updatedAt || new Date(),
							})),
							source: "cache+database" as const,
						};
						console.log(
							"[getMessages] Returning merged messages from cache and database:",
							output,
						);
						return output;
					}
				}
				console.log(
					"[getMessages] Cache empty or no results, fetching from database",
				);
			} else {
				console.log("[getMessages] Cursor provided, skipping cache");
			}

			// If cache is empty, fallback to database
			console.log("[getMessages] Fetching messages from database");
			const dbMessages = await dbDriver.getMessages(
				requestedLimit,
				input.cursor,
			);
			console.log(
				"[getMessages] Database fetch result:",
				dbMessages.length,
				"messages",
			);

			const output = {
				messages: dbMessages.map((msg) => ({
					...msg,
					// Very bad hack
					createdAt: msg.createdAt || new Date(),
					updatedAt: msg.updatedAt || new Date(),
				})),
				source: "database" as const,
			};

			console.log("[getMessages] Returning messages from database:", output);
			return output;
		} catch (error) {
			console.error("[getMessages] Error fetching messages:", error);
			throw new ORPCError("Failed to fetch messages");
		}
	},
);
