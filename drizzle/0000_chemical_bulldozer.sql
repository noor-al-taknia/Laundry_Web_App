CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#0c5551' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_uq` ON `categories` (`name`);--> statement-breakpoint
CREATE INDEX `categories_active_sort_idx` ON `categories` (`is_active`,`sort_order`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`vat_number` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`name`);--> statement-breakpoint
CREATE INDEX `customers_phone_idx` ON `customers` (`phone`);--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`actor_user_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `order_events_order_idx` ON `order_events` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`service_id` integer,
	`category_name` text NOT NULL,
	`service_name` text NOT NULL,
	`unit_price` real NOT NULL,
	`quantity` real NOT NULL,
	`taxable_amount` real NOT NULL,
	`vat_amount` real NOT NULL,
	`total_amount` real NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "order_items_values_check" CHECK("order_items"."unit_price" > 0 AND "order_items"."quantity" > 0 AND "order_items"."taxable_amount" >= 0 AND "order_items"."vat_amount" >= 0 AND "order_items"."total_amount" >= 0)
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`customer_id` integer,
	`customer_name` text NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`customer_email` text DEFAULT '' NOT NULL,
	`customer_address` text DEFAULT '' NOT NULL,
	`created_by` integer NOT NULL,
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
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "orders_payment_method_check" CHECK("orders"."payment_method" IN ('cash', 'card')),
	CONSTRAINT "orders_payment_status_check" CHECK("orders"."payment_status" IN ('paid', 'unpaid', 'partial')),
	CONSTRAINT "orders_amounts_check" CHECK("orders"."subtotal" >= 0 AND "orders"."discount" >= 0 AND "orders"."vat_amount" >= 0 AND "orders"."total_amount" >= 0 AND "orders"."amount_paid" >= 0 AND "orders"."balance" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_invoice_number_uq` ON `orders` (`invoice_number`);--> statement-breakpoint
CREATE INDEX `orders_date_idx` ON `orders` (`order_date`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `orders_status_method_idx` ON `orders` (`payment_status`,`payment_method`);--> statement-breakpoint
CREATE TABLE `permission_grants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_user_id` integer NOT NULL,
	`scope` text NOT NULL,
	`from_date` text NOT NULL,
	`to_date` text NOT NULL,
	`granted_by` integer NOT NULL,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`staff_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "permission_grants_scope_check" CHECK("permission_grants"."scope" IN ('reports_history', 'orders_history_write')),
	CONSTRAINT "permission_grants_date_check" CHECK("permission_grants"."from_date" <= "permission_grants"."to_date")
);
--> statement-breakpoint
CREATE INDEX `permission_staff_scope_idx` ON `permission_grants` (`staff_user_id`,`scope`,`from_date`,`to_date`);--> statement-breakpoint
CREATE TABLE `service_prices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer NOT NULL,
	`price` real NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`created_by` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "service_prices_positive_check" CHECK("service_prices"."price" > 0)
);
--> statement-breakpoint
CREATE INDEX `service_prices_current_idx` ON `service_prices` (`service_id`,`effective_from`,`effective_to`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`name` text NOT NULL,
	`name_ar` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `services_category_name_uq` ON `services` (`category_id`,`name`);--> statement-breakpoint
CREATE INDEX `services_category_active_idx` ON `services` (`category_id`,`is_active`,`sort_order`);--> statement-breakpoint
CREATE TABLE `shop_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`shop_name` text NOT NULL,
	`shop_name_ar` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`vat_number` text DEFAULT '' NOT NULL,
	`commercial_number` text DEFAULT '' NOT NULL,
	`invoice_prefix` text DEFAULT 'INV' NOT NULL,
	`next_invoice_number` integer DEFAULT 1 NOT NULL,
	`receipt_footer` text DEFAULT 'Thank you for choosing our laundry service.' NOT NULL,
	`updated_by` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "shop_settings_singleton_check" CHECK("shop_settings"."id" = 1),
	CONSTRAINT "shop_settings_invoice_sequence_check" CHECK("shop_settings"."next_invoice_number" > 0)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`must_change_password` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_role_check" CHECK("users"."role" IN ('admin', 'staff'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_uq` ON `users` (`username`);