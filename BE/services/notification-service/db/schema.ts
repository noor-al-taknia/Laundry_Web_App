import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  recipientUserId: text("recipient_user_id").notNull(),
  actorUserId: text("actor_user_id").notNull(),
  actorName: text("actor_name").notNull(),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  resourceType: text("resource_type").notNull().default(""),
  resourceId: text("resource_id").notNull().default(""),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_notifications_recipient_read").on(table.tenantId, table.recipientUserId, table.isRead, table.createdAt),
  index("idx_notifications_resource").on(table.tenantId, table.resourceType, table.resourceId),
]);

export const eventInbox = sqliteTable("event_inbox", {
  eventId: text("event_id").primaryKey(),
  sourceService: text("source_service").notNull(),
  eventType: text("event_type").notNull(),
  receivedAt: text("received_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  processedAt: text("processed_at"),
});
