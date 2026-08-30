PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`token_number` text NOT NULL,
	`customer_id` text,
	`customer_name` text NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`customer_email` text DEFAULT '' NOT NULL,
	`customer_address` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
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
	CONSTRAINT "orders_payment_method_check" CHECK("__new_orders"."payment_method" IN ('cash','card')),
	CONSTRAINT "orders_card_account_check" CHECK("__new_orders"."card_account" IS NULL OR "__new_orders"."card_account" IN ('stc','anb')),
	CONSTRAINT "orders_status_check" CHECK("__new_orders"."payment_status" IN ('paid','unpaid','partial')),
	CONSTRAINT "orders_amounts_check" CHECK("__new_orders"."subtotal" >= 0 AND "__new_orders"."discount" >= 0 AND "__new_orders"."vat_amount" >= 0 AND "__new_orders"."total_amount" >= 0 AND "__new_orders"."amount_paid" >= 0 AND "__new_orders"."balance" >= 0 AND "__new_orders"."cash_received" >= 0 AND "__new_orders"."settled_from_staff" >= 0 AND "__new_orders"."settled_from_drawer" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_orders`("id", "tenant_id", "invoice_number", "token_number", "customer_id", "customer_name", "customer_phone", "customer_email", "customer_address", "created_by", "order_date", "supply_date", "payment_method", "card_account", "cash_received", "balance_settled_by_staff", "settled_from_staff", "settled_from_drawer", "payment_status", "subtotal", "discount", "vat_amount", "total_amount", "amount_paid", "balance", "notes", "version", "created_at", "updated_at") SELECT "id", "tenant_id", "invoice_number", "token_number", "customer_id", "customer_name", "customer_phone", "customer_email", "customer_address", "created_by", "order_date", "supply_date", "payment_method", "card_account", "cash_received", "balance_settled_by_staff", "settled_from_staff", "settled_from_drawer", "payment_status", "subtotal", "discount", "vat_amount", "total_amount", "amount_paid", "balance", "notes", "version", "created_at", "updated_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_tenant_invoice` ON `orders` (`tenant_id`,`invoice_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_tenant_token` ON `orders` (`tenant_id`,`token_number`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_date` ON `orders` (`tenant_id`,`order_date`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_customer` ON `orders` (`tenant_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_payment` ON `orders` (`tenant_id`,`payment_status`,`payment_method`);