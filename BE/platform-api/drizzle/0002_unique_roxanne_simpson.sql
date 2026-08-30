CREATE TABLE `password_reset_requests` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_by` integer,
	`completed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `password_resets_status_idx` ON `password_reset_requests` (`status`,`requested_at`);--> statement-breakpoint
CREATE TABLE `permission_requests` (
	`id` integer PRIMARY KEY NOT NULL,
	`staff_user_id` integer NOT NULL,
	`task` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` integer,
	`reviewed_at` text,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`staff_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `permission_requests_staff_status_idx` ON `permission_requests` (`staff_user_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `permission_requests_task_resource_idx` ON `permission_requests` (`task`,`resource_type`,`resource_id`,`status`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`token_number` text,
	`customer_id` integer,
	`customer_name` text NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`customer_email` text DEFAULT '' NOT NULL,
	`customer_address` text DEFAULT '' NOT NULL,
	`created_by` integer NOT NULL,
	`order_date` text NOT NULL,
	`supply_date` text NOT NULL,
	`payment_method` text NOT NULL,
	`card_account` text,
	`cash_received` real DEFAULT 0 NOT NULL,
	`balance_settled_by_staff` integer DEFAULT false NOT NULL,
	`settled_from_staff` real DEFAULT 0 NOT NULL,
	`settled_from_drawer` real DEFAULT 0 NOT NULL,
	`payment_status` text NOT NULL,
	`subtotal` real NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`vat_amount` real NOT NULL,
	`total_amount` real NOT NULL,
	`amount_paid` real DEFAULT 0 NOT NULL,
	`balance` real NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "orders_payment_method_check" CHECK("__new_orders"."payment_method" IN ('cash', 'card')),
	CONSTRAINT "orders_card_account_check" CHECK("__new_orders"."card_account" IS NULL OR "__new_orders"."card_account" IN ('stc', 'anb')),
	CONSTRAINT "orders_payment_status_check" CHECK("__new_orders"."payment_status" IN ('paid', 'unpaid', 'partial')),
	CONSTRAINT "orders_amounts_check" CHECK("__new_orders"."subtotal" >= 0 AND "__new_orders"."discount" >= 0 AND "__new_orders"."vat_amount" >= 0 AND "__new_orders"."total_amount" >= 0 AND "__new_orders"."amount_paid" >= 0 AND "__new_orders"."balance" >= 0 AND "__new_orders"."cash_received" >= 0 AND "__new_orders"."settled_from_staff" >= 0 AND "__new_orders"."settled_from_drawer" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_orders`("id", "invoice_number", "token_number", "customer_id", "customer_name", "customer_phone", "customer_email", "customer_address", "created_by", "order_date", "supply_date", "payment_method", "card_account", "cash_received", "balance_settled_by_staff", "settled_from_staff", "settled_from_drawer", "payment_status", "subtotal", "discount", "vat_amount", "total_amount", "amount_paid", "balance", "notes", "version", "created_at", "updated_at") SELECT "id", "invoice_number", "token_number", "customer_id", "customer_name", "customer_phone", "customer_email", "customer_address", "created_by", "order_date", "supply_date", "payment_method", "card_account", "cash_received", "balance_settled_by_staff", "settled_from_staff", "settled_from_drawer", "payment_status", "subtotal", "discount", "vat_amount", "total_amount", "amount_paid", "balance", "notes", "version", "created_at", "updated_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_invoice_number_uq` ON `orders` (`invoice_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_token_number_uq` ON `orders` (`token_number`);--> statement-breakpoint
CREATE INDEX `orders_date_idx` ON `orders` (`order_date`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `orders_status_method_idx` ON `orders` (`payment_status`,`payment_method`);