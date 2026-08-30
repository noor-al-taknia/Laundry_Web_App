CREATE TABLE `branches` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`shop_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_branches_tenant_code` ON `branches` (`tenant_id`,`code`);--> statement-breakpoint
CREATE INDEX `idx_branches_shop` ON `branches` (`tenant_id`,`shop_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `shops` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`shop_name` text NOT NULL,
	`shop_name_ar` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`vat_number` text DEFAULT '' NOT NULL,
	`commercial_number` text DEFAULT '' NOT NULL,
	`invoice_prefix` text DEFAULT 'INV' NOT NULL,
	`receipt_footer` text DEFAULT '' NOT NULL,
	`timezone` text DEFAULT 'Asia/Riyadh' NOT NULL,
	`currency` text DEFAULT 'SAR' NOT NULL,
	`vat_rate_basis_points` integer DEFAULT 1500 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shops_tenant_name` ON `shops` (`tenant_id`,`shop_name`);--> statement-breakpoint
CREATE INDEX `idx_shops_tenant_active` ON `shops` (`tenant_id`,`is_active`);