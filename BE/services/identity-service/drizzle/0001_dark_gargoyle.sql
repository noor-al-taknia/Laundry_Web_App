CREATE TABLE `password_reset_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_by` text,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_password_resets_status` ON `password_reset_requests` (`tenant_id`,`status`,`requested_at`);--> statement-breakpoint
CREATE TABLE `permission_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`task` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_permission_requests_user_status` ON `permission_requests` (`tenant_id`,`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_permission_requests_resource` ON `permission_requests` (`tenant_id`,`task`,`resource_type`,`resource_id`,`status`);