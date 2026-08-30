ALTER TABLE `users` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passport_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passport_expiry` text;--> statement-breakpoint
ALTER TABLE `users` ADD `visa_status` text DEFAULT 'not_recorded' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `visa_expiry` text;--> statement-breakpoint
ALTER TABLE `users` ADD `iqama_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `iqama_expiry` text;