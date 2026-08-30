CREATE TABLE `order_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`order_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_order_events_order` ON `order_events` (`tenant_id`,`order_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`order_id` text NOT NULL,
	`service_id` text NOT NULL,
	`category_name` text NOT NULL,
	`service_name` text NOT NULL,
	`unit_price` real NOT NULL,
	`quantity` real NOT NULL,
	`taxable_amount` real NOT NULL,
	`vat_amount` real NOT NULL,
	`total_amount` real NOT NULL,
	CONSTRAINT "order_items_positive" CHECK("order_items"."unit_price" > 0 AND "order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_order_items_order` ON `order_items` (`tenant_id`,`order_id`);--> statement-breakpoint
CREATE TABLE `order_sequences` (
	`tenant_id` text NOT NULL,
	`business_date` text NOT NULL,
	`next_token` integer DEFAULT 1 NOT NULL,
	`next_invoice` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_order_sequence_tenant_date` ON `order_sequences` (`tenant_id`,`business_date`);--> statement-breakpoint
CREATE TABLE `orders` (
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
	CONSTRAINT "orders_payment_method_check" CHECK("orders"."payment_method" IN ('cash','card')),
	CONSTRAINT "orders_status_check" CHECK("orders"."payment_status" IN ('paid','unpaid','partial')),
	CONSTRAINT "orders_amounts_check" CHECK("orders"."subtotal" >= 0 AND "orders"."discount" >= 0 AND "orders"."vat_amount" >= 0 AND "orders"."total_amount" >= 0 AND "orders"."amount_paid" >= 0 AND "orders"."balance" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_tenant_invoice` ON `orders` (`tenant_id`,`invoice_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_tenant_token` ON `orders` (`tenant_id`,`token_number`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_date` ON `orders` (`tenant_id`,`order_date`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_customer` ON `orders` (`tenant_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_payment` ON `orders` (`tenant_id`,`payment_status`,`payment_method`);--> statement-breakpoint
CREATE TABLE `outbox_events` (
	`id` text PRIMARY KEY NOT NULL,
	`aggregate_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_order_outbox_unpublished` ON `outbox_events` (`published_at`);