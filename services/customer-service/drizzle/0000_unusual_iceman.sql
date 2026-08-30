CREATE TABLE `customer_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_customer_events_customer` ON `customer_events` (`tenant_id`,`customer_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`vat_number` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_customers_tenant_name` ON `customers` (`tenant_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_customers_tenant_phone` ON `customers` (`tenant_id`,`phone`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_customers_tenant_email` ON `customers` (`tenant_id`,`email`);