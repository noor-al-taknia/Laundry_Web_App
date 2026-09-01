CREATE TABLE `event_inbox` (
	`event_id` text PRIMARY KEY NOT NULL,
	`source_service` text NOT NULL,
	`event_type` text NOT NULL,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`recipient_user_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`resource_type` text DEFAULT '' NOT NULL,
	`resource_id` text DEFAULT '' NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_recipient_read` ON `notifications` (`tenant_id`,`recipient_user_id`,`is_read`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_notifications_resource` ON `notifications` (`tenant_id`,`resource_type`,`resource_id`);