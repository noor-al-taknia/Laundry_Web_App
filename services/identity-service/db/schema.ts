import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), tenantId: text("tenant_id").notNull(), username: text("username").notNull(), displayName: text("display_name").notNull(),
  portalRole: text("portal_role", { enum: ["super_admin", "admin", "office_staff"] }).notNull(), passwordHash: text("password_hash").notNull(), passwordSalt: text("password_salt").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true), mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_users_tenant_username").on(table.tenantId, table.username), index("idx_users_tenant_role").on(table.tenantId, table.portalRole), check("users_portal_role_check", sql`${table.portalRole} IN ('super_admin','admin','office_staff')`)]);
export const refreshSessions = sqliteTable("refresh_sessions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), tokenHash: text("token_hash").notNull(), expiresAt: text("expires_at").notNull(), revokedAt: text("revoked_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_refresh_token_hash").on(table.tokenHash), index("idx_refresh_user").on(table.userId)]);
export const permissionGrants = sqliteTable("permission_grants", {
  id: text("id").primaryKey(), tenantId: text("tenant_id").notNull(), userId: text("user_id").notNull(), permission: text("permission").notNull(), resourceScope: text("resource_scope").notNull().default("tenant"), grantedBy: text("granted_by").notNull(), expiresAt: text("expires_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_grants_unique").on(table.tenantId, table.userId, table.permission, table.resourceScope)]);
