import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from '@paralleldrive/cuid2';
import { user } from './auth-schema'
import { sql } from "drizzle-orm";
import { ReactionKind, PacketKind } from "@/wasm/wasmchannel";

export const messages = sqliteTable('messages', {
    id: text('id').primaryKey().default(createId()),
    
    kind: text('kind', {enum: Object.values(PacketKind) as [string, ...string[]]}).notNull(),
    reactionKind: text('reaction_kind', {enum: Object.values(ReactionKind) as [string, ...string[]]}),
    message: text('message').notNull(),
    sentBy: text('sent_by').references(() => user.id, {onDelete: 'cascade'}).notNull(),

    createdAt: integer('created_at', {mode: 'timestamp'}).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: integer('updated_at', {mode: 'timestamp'}).default(sql`CURRENT_TIMESTAMP`).notNull(),
    deletedAt: integer('deleted_at', {mode: 'timestamp'}),
});