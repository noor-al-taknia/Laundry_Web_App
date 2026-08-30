CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`expense_number` text NOT NULL,
	`expense_date` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`payment_method` text NOT NULL,
	`vendor` text DEFAULT '' NOT NULL,
	`receipt_reference` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'posted' NOT NULL,
	`created_by` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "expenses_amount_positive" CHECK("expenses"."amount" > 0),
	CONSTRAINT "expenses_method_check" CHECK("expenses"."payment_method" IN ('cash','card','bank')),
	CONSTRAINT "expenses_status_check" CHECK("expenses"."status" IN ('posted','void'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_expenses_tenant_number` ON `expenses` (`tenant_id`,`expense_number`);--> statement-breakpoint
CREATE INDEX `idx_expenses_tenant_date_category` ON `expenses` (`tenant_id`,`expense_date`,`category`);--> statement-breakpoint
CREATE TABLE `outbox_events` (
	`id` text PRIMARY KEY NOT NULL,
	`aggregate_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_expense_outbox_unpublished` ON `outbox_events` (`published_at`);