CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#2563eb' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_categories_tenant_name` ON `categories` (`tenant_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_categories_active_sort` ON `categories` (`tenant_id`,`is_active`,`sort_order`);--> statement-breakpoint
CREATE TABLE `item_prices` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`item_id` text NOT NULL,
	`price` real NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "item_prices_positive" CHECK("item_prices"."price" > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_prices_item_effective` ON `item_prices` (`tenant_id`,`item_id`,`effective_from`,`effective_to`);--> statement-breakpoint
CREATE TABLE `service_items` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`name_ar` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_items_category_name` ON `service_items` (`tenant_id`,`category_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_items_category_active` ON `service_items` (`tenant_id`,`category_id`,`is_active`,`sort_order`);