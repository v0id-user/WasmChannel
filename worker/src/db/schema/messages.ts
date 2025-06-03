import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { user } from "./auth-schema";
import { sql } from "drizzle-orm";
// import { ReactionKind, PacketKind } from "@/wasm/wasmchannel";
// I must copy them here or drizzle with cry about wasm is unreadable, like bruh... it's an expriment lets not forget that >:(
export enum PacketKind {
	Message = 0,
	Reaction = 1,
	Joined = 2,
	Typing = 3,
}
export enum ReactionKind {
	None = 0,
	Like = 1,
	Dislike = 2,
	Heart = 3,
	Star = 4,
}

export const messages = sqliteTable("messages", {
	id: text("id").primaryKey().default(createId()),
	refrenceId: text("refrence_id").notNull().unique(),
	kind: text("kind", {
		enum: Object.values(PacketKind) as [string, ...string[]],
	}).notNull(),
	reactionKind: text("reaction_kind", {
		enum: Object.values(ReactionKind) as [string, ...string[]],
	}),
	message: text("message").notNull(), // A.K.A payload

	reactions: text("reactions", { mode: "json" })
		.$type<ReactionKind[]>()
		.notNull()
		.default(sql`'[]'`),

	sentBy: text("sent_by")
		.references(() => user.id, { onDelete: "cascade" })
		.notNull(),

	createdAt: integer("created_at", { mode: "timestamp" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	deletedAt: integer("deleted_at", { mode: "timestamp" }),
});
