CREATE TABLE `staff_debts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`staff_user_id` text NOT NULL,
	`order_id` text NOT NULL,
	`original_amount` real NOT NULL,
	`outstanding_amount` real NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`settled_by` text,
	`settled_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "staff_debts_amount_check" CHECK("staff_debts"."original_amount" >= 0 AND "staff_debts"."outstanding_amount" >= 0 AND "staff_debts"."outstanding_amount" <= "staff_debts"."original_amount")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_staff_debts_tenant_order` ON `staff_debts` (`tenant_id`,`order_id`);--> statement-breakpoint
CREATE INDEX `idx_staff_debts_staff_status` ON `staff_debts` (`tenant_id`,`staff_user_id`,`status`);--> statement-breakpoint
ALTER TABLE `orders` ADD `assigned_staff_id` text NOT NULL;