CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY NOT NULL,
	`expense_number` text NOT NULL,
	`expense_date` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`payment_method` text NOT NULL,
	`vendor` text DEFAULT '' NOT NULL,
	`receipt_reference` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'posted' NOT NULL,
	`created_by` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "expenses_amount_check" CHECK("expenses"."amount" > 0),
	CONSTRAINT "expenses_payment_method_check" CHECK("expenses"."payment_method" IN ('cash', 'card', 'bank')),
	CONSTRAINT "expenses_status_check" CHECK("expenses"."status" IN ('posted', 'void'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expenses_number_uq` ON `expenses` (`expense_number`);--> statement-breakpoint
CREATE INDEX `expenses_date_category_idx` ON `expenses` (`expense_date`,`category`);--> statement-breakpoint
CREATE TABLE `order_sequences` (
	`business_date` text PRIMARY KEY NOT NULL,
	`next_value` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `token_number` text;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_token_number_uq` ON `orders` (`token_number`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`portal_role` text DEFAULT 'office_staff' NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`must_change_password` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_role_check" CHECK("__new_users"."role" IN ('admin', 'staff')),
	CONSTRAINT "users_portal_role_check" CHECK("__new_users"."portal_role" IN ('super_admin', 'admin', 'office_staff'))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "username", "display_name", "role", "portal_role", "password_hash", "password_salt", "is_active", "must_change_password", "created_at", "updated_at") SELECT "id", "username", "display_name", "role", "portal_role", "password_hash", "password_salt", "is_active", "must_change_password", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_uq` ON `users` (`username`);