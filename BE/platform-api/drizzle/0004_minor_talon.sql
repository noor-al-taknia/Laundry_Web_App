CREATE TABLE `staff_debts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_user_id` integer NOT NULL,
	`order_id` integer NOT NULL,
	`original_amount` real NOT NULL,
	`outstanding_amount` real NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`settled_by` integer,
	`settled_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`staff_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`settled_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "staff_debts_amount_check" CHECK("staff_debts"."original_amount" >= 0 AND "staff_debts"."outstanding_amount" >= 0 AND "staff_debts"."outstanding_amount" <= "staff_debts"."original_amount"),
	CONSTRAINT "staff_debts_status_check" CHECK("staff_debts"."status" IN ('open', 'settled', 'void'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_debts_order_uq` ON `staff_debts` (`order_id`);--> statement-breakpoint
CREATE INDEX `staff_debts_staff_status_idx` ON `staff_debts` (`staff_user_id`,`status`);--> statement-breakpoint
ALTER TABLE `orders` ADD `assigned_staff_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passport_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passport_expiry` text;--> statement-breakpoint
ALTER TABLE `users` ADD `visa_status` text DEFAULT 'not_recorded' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `visa_expiry` text;--> statement-breakpoint
ALTER TABLE `users` ADD `iqama_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `iqama_expiry` text;