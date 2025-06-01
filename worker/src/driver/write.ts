import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { createDb } from "~/db";
import { messages } from "~/db/schema/messages";
import { desc, asc, isNull, lt, and } from "drizzle-orm";

abstract class StorageDriver {
    protected driver: D1Database | KVNamespace;
    
    constructor(driver: D1Database | KVNamespace) {
        this.driver = driver;
    }

    abstract write(value: any): Promise<void>;
    abstract read(): Promise<any>;
}

export class DatabaseDriver extends StorageDriver {
    private db: ReturnType<typeof createDb>;

    constructor(driver: D1Database) {
        super(driver);
        this.db = createDb(driver);
    }

    async write(value: any): Promise<void> {
        // Insert message into the database using drizzle
        await this.db.insert(messages).values({
            kind: value.kind,
            reactionKind: value.reactionKind,
            message: value.message,
            sentBy: value.sentBy,
        });
    }

    async read(): Promise<any> {
        // Fetch all messages from the database
        return await this.db
            .select()
            .from(messages)
            .where(isNull(messages.deletedAt))
            .orderBy(asc(messages.createdAt));
    }

    async getMessages(limit: number = 50, cursor?: string): Promise<any> {
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

    async write(value: any): Promise<void> {
        const kv = this.driver as KVNamespace;
        
        // Get current messages from cache
        const existingMessages = await this.read() || [];
        
        // Add new message to the top of the stack (LIFO)
        const updatedMessages = [value, ...existingMessages];
        
        // Keep only the last 100 messages (stack style)
        if (updatedMessages.length > CacheDriver.MAX_ITEMS) {
            updatedMessages.splice(CacheDriver.MAX_ITEMS);
        }
        
        // Store back to KV
        await kv.put(CacheDriver.CACHE_KEY, JSON.stringify(updatedMessages));
    }

    async read(): Promise<any> {
        const kv = this.driver as KVNamespace;
        const cached = await kv.get(CacheDriver.CACHE_KEY);
        
        if (!cached) {
            return [];
        }
        
        try {
            return JSON.parse(cached);
        } catch {
            return [];
        }
    }

    async getMessages(limit: number = 50): Promise<any> {
        const allMessages = await this.read();
        return allMessages.slice(0, Math.min(limit, allMessages.length));
    }

    async clear(): Promise<void> {
        const kv = this.driver as KVNamespace;
        await kv.delete(CacheDriver.CACHE_KEY);
    }
}