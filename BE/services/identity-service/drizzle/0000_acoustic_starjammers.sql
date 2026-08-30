CREATE TABLE `permission_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`permission` text NOT NULL,
	`resource_scope` text DEFAULT 'tenant' NOT NULL,
	`granted_by` text NOT NULL,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_grants_unique` ON `permission_grants` (`tenant_id`,`user_id`,`permission`,`resource_scope`);--> statement-breakpoint
CREATE TABLE `refresh_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_refresh_token_hash` ON `refresh_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_refresh_user` ON `refresh_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`portal_role` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`must_change_password` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_portal_role_check" CHECK("users"."portal_role" IN ('super_admin','admin','office_staff'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_tenant_username` ON `users` (`tenant_id`,`username`);--> statement-breakpoint
CREATE INDEX `idx_users_tenant_role` ON `users` (`tenant_id`,`portal_role`);