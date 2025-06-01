import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { createDb } from "~/db";
import { messages } from "~/db/schema/messages";
import { desc, asc, isNull, lt, and } from "drizzle-orm";
import { WasmPacket } from "@/wasm/wasmchannel";
import { PacketKind, ReactionKind } from "@/wasm/wasmchannel";

// Infer the database record type from the messages table schema (internal use only)
type DatabaseMessage = typeof messages.$inferSelect;
type DatabaseMessageInsert = typeof messages.$inferInsert;

abstract class StorageDriver {
	protected driver: D1Database | KVNamespace;

	constructor(driver: D1Database | KVNamespace) {
		this.driver = driver;
	}

	abstract write(packets: WasmPacket[], sentBy: string): Promise<void>;
	abstract read(): Promise<WasmPacket[]>;
}

export class DatabaseDriver extends StorageDriver {
	private db: ReturnType<typeof createDb>;

	constructor(driver: D1Database) {
		super(driver);
		this.db = createDb(driver);
	}

	async write(packets: WasmPacket[], sentBy: string): Promise<void> {
		// Convert all packets to database records
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

		// Insert all messages into the database using drizzle
		if (insertData.length > 0) {
			await this.db.insert(messages).values(insertData);
		}
	}

	async read(): Promise<WasmPacket[]> {
		// Fetch all messages from the database
		const msgs = await this.db
			.select()
			.from(messages)
			.where(isNull(messages.deletedAt))
			.orderBy(asc(messages.createdAt));

		return msgs.map((msg) => {
			// Convert string enum values to numeric enum values
			const packetKind = parseInt(msg.kind) as PacketKind;
			const reactionKind = msg.reactionKind
				? (parseInt(msg.reactionKind) as ReactionKind)
				: null;

			// Convert message string to Uint8Array
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

	async getMessages(
		limit: number = 50,
		cursor?: string,
	): Promise<DatabaseMessage[]> {
		const conditions = [isNull(messages.deletedAt)];

		if (cursor) {
			conditions.push(lt(messages.createdAt, new Date(cursor)));
		}

		return await this.db
			.select()
			.from(messages)
			.where(and(...conditions))
			.limit(limit)
			.orderBy(desc(messages.createdAt));
	}
}

export class CacheDriver extends StorageDriver {
	private static readonly CACHE_KEY = "messages";
	private static readonly MAX_ITEMS = 100;

	constructor(driver: KVNamespace) {
		super(driver);
	}

	async write(packets: WasmPacket[], sentBy: string): Promise<void> {
		const kv = this.driver as KVNamespace;

		// Convert WasmPackets to cache records
		const cacheRecords = packets.map((packet) => {
			const payloadBytes = packet.payload();
			const message = new TextDecoder().decode(payloadBytes);

			return {
				kind: packet.kind().toString(),
				reactionKind: packet.reaction_kind()?.toString() || null,
				message,
				sentBy,
			};
		});

		// Get current messages from cache
		const existingMessages = (await this.getCachedRecords()) || [];

		// Add new messages to the top of the stack (LIFO)
		const updatedMessages = [...cacheRecords, ...existingMessages];

		// Keep only the last 100 messages (stack style)
		if (updatedMessages.length > CacheDriver.MAX_ITEMS) {
			updatedMessages.splice(CacheDriver.MAX_ITEMS);
		}

		// Store back to KV
		await kv.put(CacheDriver.CACHE_KEY, JSON.stringify(updatedMessages));
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
		Omit<DatabaseMessage, "id" | "createdAt" | "updatedAt" | "deletedAt">
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
