CREATE TABLE `daily_metrics` (
	`tenant_id` text NOT NULL,
	`business_date` text NOT NULL,
	`order_count` integer DEFAULT 0 NOT NULL,
	`gross_sales` real DEFAULT 0 NOT NULL,
	`collected` real DEFAULT 0 NOT NULL,
	`outstanding` real DEFAULT 0 NOT NULL,
	`cash_collected` real DEFAULT 0 NOT NULL,
	`card_collected` real DEFAULT 0 NOT NULL,
	`posted_expenses` real DEFAULT 0 NOT NULL,
	`net_operating` real DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_daily_metrics_tenant_date` ON `daily_metrics` (`tenant_id`,`business_date`);--> statement-breakpoint
CREATE TABLE `event_inbox` (
	`event_id` text PRIMARY KEY NOT NULL,
	`source_service` text NOT NULL,
	`event_type` text NOT NULL,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_event_inbox_unprocessed` ON `event_inbox` (`processed_at`);--> statement-breakpoint
CREATE TABLE `expense_projection` (
	`expense_id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`expense_date` text NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`payment_method` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_expense_projection_date` ON `expense_projection` (`tenant_id`,`expense_date`,`category`);--> statement-breakpoint
CREATE TABLE `sales_projection` (
	`order_id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`token_number` text NOT NULL,
	`invoice_number` text NOT NULL,
	`order_date` text NOT NULL,
	`customer_id` text,
	`customer_name` text NOT NULL,
	`payment_method` text NOT NULL,
	`payment_status` text NOT NULL,
	`subtotal` real NOT NULL,
	`vat_amount` real NOT NULL,
	`total_amount` real NOT NULL,
	`amount_paid` real NOT NULL,
	`balance` real NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sales_tenant_token` ON `sales_projection` (`tenant_id`,`token_number`);--> statement-breakpoint
CREATE INDEX `idx_sales_tenant_date_status` ON `sales_projection` (`tenant_id`,`order_date`,`payment_status`);--> statement-breakpoint
CREATE INDEX `idx_sales_tenant_customer` ON `sales_projection` (`tenant_id`,`customer_id`);