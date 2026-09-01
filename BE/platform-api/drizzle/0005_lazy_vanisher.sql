CREATE TABLE `admin_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipient_user_id` integer NOT NULL,
	`actor_user_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`resource_type` text DEFAULT '' NOT NULL,
	`resource_id` text DEFAULT '' NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "admin_notifications_read_check" CHECK("admin_notifications"."is_read" IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `admin_notifications_recipient_read_idx` ON `admin_notifications` (`recipient_user_id`,`is_read`,`created_at`);--> statement-breakpoint
CREATE INDEX `admin_notifications_resource_idx` ON `admin_notifications` (`resource_type`,`resource_id`);