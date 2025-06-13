PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` text PRIMARY KEY DEFAULT 'o9zk4e9lonjoh7blpzftvihr' NOT NULL,
	`refrence_id` text NOT NULL,
	`kind` text NOT NULL,
	`reaction_kind` text,
	`message` text NOT NULL,
	`reactions` text DEFAULT '[]' NOT NULL,
	`sent_by` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`sent_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "refrence_id", "kind", "reaction_kind", "message", "reactions", "sent_by", "created_at", "updated_at", "deleted_at") SELECT "id", "refrence_id", "kind", "reaction_kind", "message", "reactions", "sent_by", "created_at", "updated_at", "deleted_at" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `messages_refrence_id_unique` ON `messages` (`refrence_id`);