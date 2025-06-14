import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { createDb } from "~/db";
import { messages } from "~/db/schema/messages";
import { desc, asc, lt, and, eq } from "drizzle-orm";
import { WasmPacket } from "@/wasm/wasmchannel";
import { PacketKind, ReactionKind } from "@/wasm/wasmchannel";

// Infer the database record type from the messages table schema (internal use only)
type DatabaseMessage = typeof messages.$inferSelect;
type DatabaseMessageInsert = typeof messages.$inferInsert;

// Extended reaction structure for UI compatibility
interface MessageReaction {
	kind: ReactionKind;
	count: number;
	users: string[];
}

abstract class StorageDriver {
	protected driver: D1Database | KVNamespace;

	constructor(driver: D1Database | KVNamespace) {
		console.log("[StorageDriver] Initializing storage driver");
		this.driver = driver;
	}

	abstract write(packets: WasmPacket[], sentBy: string): Promise<void>;
	abstract read(): Promise<WasmPacket[]>;
	abstract updateReaction(
		messageId: string,
		reactionKind: ReactionKind,
		userId: string,
	): Promise<boolean>;

	protected manipulateReactions(
		existingReactions: string | null,
		reactionKind: ReactionKind,
		userId: string,
	): { reactions: MessageReaction[]; updated: boolean } {
		console.log("[manipulateReactions] Starting reaction manipulation", { reactionKind, userId });
		let reactions: MessageReaction[] = [];

		try {
			reactions = existingReactions ? JSON.parse(existingReactions) : [];
			console.log("[manipulateReactions] Successfully parsed existing reactions");
		} catch {
			console.log("[manipulateReactions] Failed to parse reactions, using empty array");
			reactions = [];
		}

		const existingReactionIndex = reactions.findIndex(
			(r) => r.kind === reactionKind,
		);
		let updated = false;

		if (existingReactionIndex >= 0) {
			console.log("[manipulateReactions] Found existing reaction of kind", reactionKind);
			const existingReaction = reactions[existingReactionIndex];
			const userIndex = existingReaction.users.indexOf(userId);

			if (userIndex >= 0) {
				console.log("[manipulateReactions] Removing user's reaction");
				existingReaction.users.splice(userIndex, 1);
				existingReaction.count = existingReaction.users.length;

				if (existingReaction.count === 0) {
					console.log("[manipulateReactions] Removing empty reaction");
					reactions.splice(existingReactionIndex, 1);
				}
			} else {
				console.log("[manipulateReactions] Adding user's reaction");
				existingReaction.users.push(userId);
				existingReaction.count = existingReaction.users.length;
			}
			updated = true;
		} else {
			console.log("[manipulateReactions] Creating new reaction");
			reactions.push({
				kind: reactionKind,
				count: 1,
				users: [userId],
			});
			updated = true;
		}

		console.log("[manipulateReactions] Reaction manipulation complete", { updated });
		return { reactions, updated };
	}
}

export class DatabaseDriver extends StorageDriver {
	private db: ReturnType<typeof createDb>;

	constructor(driver: D1Database) {
		super(driver);
		console.log("[DatabaseDriver] Initializing database driver");
		this.db = createDb(driver);
	}

	async write(packets: WasmPacket[]): Promise<void> {
		console.log("[DatabaseDriver.write] Starting write operation with", packets.length, "packets");
		
		const insertData: DatabaseMessageInsert[] = packets.map((packet) => {
			if (!packet.message_id() || !packet.user_id()) {
				throw new Error("Message id or user id are not set");
			}
			const payloadBytes = packet.payload();
			const message = new TextDecoder().decode(payloadBytes);

			return {
				kind: packet.kind().toString(),
				reactionKind: packet.reaction_kind()?.toString() || null,
				message,
				refrenceId: packet.message_id()!,
				sentBy: packet.user_id()!,
			};
		});

		if (insertData.length > 0) {
			try {
				console.log("[DatabaseDriver.write] Inserting", insertData.length, "messages");
				await this.db.insert(messages).values(insertData);
				console.log("[DatabaseDriver.write] Successfully inserted messages");
			} catch (error: any) {
				if (
					error?.message?.includes("UNIQUE constraint failed") ||
					error?.message?.includes("refrenceId") ||
					error?.code === "SQLITE_CONSTRAINT_UNIQUE"
				) {
					console.log(insertData);
					console.log(error);
					console.log("[DatabaseDriver.write] Duplicate message detected, ignoring");
					throw new Error(`Duplicate message detected ${error.message}`);
				}
				console.error("[DatabaseDriver.write] Error during insert:", error);
				throw error;
			}
		}
	}

	async read(): Promise<WasmPacket[]> {
		console.log("[DatabaseDriver.read] Starting read operation");
		
		const msgs = await this.db
			.select()
			.from(messages)
			.where(eq(messages.deletedAt, messages.createdAt))
			.orderBy(asc(messages.createdAt));

		console.log("[DatabaseDriver.read] Retrieved", msgs.length, "messages");

		return msgs.map((msg) => {
			const packetKind = parseInt(msg.kind) as PacketKind;
			const reactionKind = msg.reactionKind
				? (parseInt(msg.reactionKind) as ReactionKind)
				: null;
			const messageBytes = new TextEncoder().encode(msg.message);

			return new WasmPacket(
				packetKind,
				msg.refrenceId,
				msg.sentBy,
				reactionKind,
				messageBytes,
			);
		});
	}

	async updateReaction(
		messageId: string,
		reactionKind: ReactionKind,
		userId: string,
	): Promise<boolean> {
		console.log("[DatabaseDriver.updateReaction] Starting reaction update", { messageId, reactionKind, userId });
		
		try {
			const existingMessage = await this.db
				.select()
				.from(messages)
				.where(
					and(eq(messages.refrenceId, messageId), eq(messages.deletedAt, messages.createdAt)),
				)
				.limit(1);

			if (existingMessage.length === 0) {
				console.log("[DatabaseDriver.updateReaction] Message not found");
				return false;
			}

			const message = existingMessage[0];
			const { reactions, updated } = this.manipulateReactions(
				JSON.stringify(message.reactions),
				reactionKind,
				userId,
			);

			if (updated) {
				console.log("[DatabaseDriver.updateReaction] Updating message in database");
				await this.db
					.update(messages)
					.set({
						reactions,
						updatedAt: new Date(),
					})
					.where(eq(messages.refrenceId, messageId));
				console.log("[DatabaseDriver.updateReaction] Update successful");
			}

			return updated;
		} catch (error) {
			console.error("[DatabaseDriver.updateReaction] Error:", error);
			return false;
		}
	}

	async getMessages(
		limit: number = 50,
		cursor?: string,
	): Promise<DatabaseMessage[]> {
		console.log("[DatabaseDriver.getMessages] Starting query", { limit, cursor });
		
		const conditions = [eq(messages.deletedAt, messages.createdAt)];
		console.log("[DatabaseDriver.getMessages] Base condition: messages not deleted");

		if (cursor) {
			// Check if cursor is a valid date
			const cursorDate = new Date(cursor);
			if (!isNaN(cursorDate.getTime())) {
				conditions.push(lt(messages.createdAt, cursorDate));
				console.log("[DatabaseDriver.getMessages] Added date cursor condition:", cursor);
			} else {
				const message = await this.db
					.select()
					.from(messages)
					.where(eq(messages.refrenceId, cursor))
					.limit(1);

				if (!message[0].createdAt){
					throw new Error(`Message ${cursor} not found`);
				}

				if (message.length) {
					conditions.push(lt(messages.createdAt, message[0].createdAt));
					console.log("[DatabaseDriver.getMessages] Added date cursor condition from reference ID:", message[0].createdAt);
				}
			}
		}

		const result = await this.db
			.select()
			.from(messages)
			.where(and(...conditions))
			.limit(limit)
			.orderBy(desc(messages.createdAt));

		console.log("[DatabaseDriver.getMessages] Query complete, found", result.length, "messages");
		return result;
	}
}

export class CacheDriver extends StorageDriver {
	private static readonly CACHE_KEY = "messages";
	private static readonly MAX_ITEMS = 100;

	constructor(driver: KVNamespace) {
		super(driver);
		console.log("[CacheDriver] Initializing cache driver");
	}

	async write(packets: WasmPacket[], sentBy: string): Promise<void> {
		console.log("[CacheDriver.write] Starting write operation", { packetsCount: packets.length, sentBy });
		const kv = this.driver as KVNamespace;

		const cacheRecords = packets.map((packet) => {
			const payloadBytes = packet.payload();
			const message = new TextDecoder().decode(payloadBytes);

			return {
				kind: packet.kind().toString(),
				reactionKind: packet.reaction_kind()?.toString() || null,
				message,
				refrenceId: packet.message_id()!,
				sentBy,
				reactions: JSON.stringify([]), // Initialize with empty reactions
			};
		});

		// Get current messages from cache
		const existingMessages = (await this.getCachedRecords()) || [];

		// Filter out duplicates - prevent duplicate reference IDs in cache
		const existingIds = new Set(existingMessages.map((m) => m.refrenceId));
		const newRecords = cacheRecords.filter(
			(record) => !existingIds.has(record.refrenceId),
		);

		// Only proceed if we have new records to add
		if (newRecords.length === 0) {
			console.log("No new messages to add to cache (all duplicates detected)");
			return;
		}

		// Add new messages to the top of the stack (LIFO)
		const updatedMessages = [...newRecords, ...existingMessages];

		// Keep only the last 100 messages (stack style)
		if (updatedMessages.length > CacheDriver.MAX_ITEMS) {
			updatedMessages.splice(CacheDriver.MAX_ITEMS);
		}

		// Store back to KV
		await kv.put(CacheDriver.CACHE_KEY, JSON.stringify(updatedMessages));
		console.log(
			`Added ${newRecords.length} new messages to cache (${cacheRecords.length - newRecords.length} duplicates filtered)`,
		);
	}

	async read(): Promise<WasmPacket[]> {
		const cachedRecords = await this.getCachedRecords();

		if (!cachedRecords || cachedRecords.length === 0) {
			return [];
		}

		// Convert cached database records back to WasmPackets
		return cachedRecords.map((record) => {
			const packetKind = parseInt(record.kind) as PacketKind;
			const reactionKind = record.reactionKind
				? (parseInt(record.reactionKind) as ReactionKind)
				: null;
			const messageBytes = new TextEncoder().encode(record.message);

			return new WasmPacket(
				packetKind,
				record.refrenceId,
				record.sentBy,
				reactionKind,
				messageBytes,
			);
		});
	}

	async updateReaction(
		messageId: string,
		reactionKind: ReactionKind,
		userId: string,
	): Promise<boolean> {
		const kv = this.driver as KVNamespace;

		try {
			// Get current messages from cache
			const cachedRecords = await this.getCachedRecords();
			if (!cachedRecords) {
				console.log(
					`No cached records found for reaction update on message ${messageId}`,
				);
				return false; // Not in cache
			}

			// Find the message
			const messageIndex = cachedRecords.findIndex(
				(record) => record.refrenceId === messageId,
			);
			if (messageIndex === -1) {
				console.log(
					`Message ${messageId} not found in cache for reaction update`,
				);
				return false; // Message not found in cache
			}

			const message = cachedRecords[messageIndex];
			const { reactions, updated } = this.manipulateReactions(
				JSON.stringify(message.reactions),
				reactionKind,
				userId,
			);

			if (updated) {
				// Update the message in cache
				cachedRecords[messageIndex].reactions = reactions as any;

				// Store back to KV
				await kv.put(CacheDriver.CACHE_KEY, JSON.stringify(cachedRecords));
				console.log(
					`Successfully updated reaction for message ${messageId} in cache`,
				);
			} else {
				console.log(
					`No reaction update needed for message ${messageId} (no changes)`,
				);
			}

			return updated;
		} catch (error) {
			console.error(
				`Error updating reaction for message ${messageId} in cache:`,
				error,
			);
			return false;
		}
	}

	async getMessages(limit: number = 50): Promise<DatabaseMessage[]> {
		const cachedRecords = await this.getCachedRecords();
		if (!cachedRecords) return [];

		// Convert cache records to full database message format for API compatibility
		return cachedRecords
			.slice(0, Math.min(limit, cachedRecords.length))
			.map((record, index) => ({
				id: `cache-${index}`, // Temporary ID for cache records
				...record,
				createdAt: new Date(), // Temporary timestamp
				updatedAt: new Date(), // Temporary timestamp
				deletedAt: null,
			}));
	}

	private async getCachedRecords(): Promise<Array<
		Omit<DatabaseMessage, "id" | "createdAt" | "updatedAt" | "deletedAt"> & {
			reactions: string;
		}
	> | null> {
		const kv = this.driver as KVNamespace;
		const cached = await kv.get(CacheDriver.CACHE_KEY);

		if (!cached) {
			return null;
		}

		try {
			return JSON.parse(cached);
		} catch {
			return null;
		}
	}

	async clear(): Promise<void> {
		const kv = this.driver as KVNamespace;
		await kv.delete(CacheDriver.CACHE_KEY);
	}
}
