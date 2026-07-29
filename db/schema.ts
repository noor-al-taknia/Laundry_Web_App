import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role", { enum: ["admin", "staff"] }).notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    mustChangePassword: integer("must_change_password", { mode: "boolean" })
      .notNull()
      .default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_username_uq").on(table.username),
    check("users_role_check", sql`${table.role} IN ('admin', 'staff')`),
  ],
);

export const shopSettings = sqliteTable(
  "shop_settings",
  {
    id: integer("id").primaryKey(),
    shopName: text("shop_name").notNull(),
    shopNameAr: text("shop_name_ar").notNull().default(""),
    address: text("address").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    vatNumber: text("vat_number").notNull().default(""),
    commercialNumber: text("commercial_number").notNull().default(""),
    invoicePrefix: text("invoice_prefix").notNull().default("INV"),
    nextInvoiceNumber: integer("next_invoice_number").notNull().default(1),
    receiptFooter: text("receipt_footer")
      .notNull()
      .default("Thank you for choosing our laundry service."),
    updatedBy: integer("updated_by").references(() => users.id),
    ...timestamps,
  },
  (table) => [
    check("shop_settings_singleton_check", sql`${table.id} = 1`),
    check(
      "shop_settings_invoice_sequence_check",
      sql`${table.nextInvoiceNumber} > 0`,
    ),
  ],
);

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#0c5551"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("categories_name_uq").on(table.name),
    index("categories_active_sort_idx").on(table.isActive, table.sortOrder),
  ],
);

export const services = sqliteTable(
  "services",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    nameAr: text("name_ar").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("services_category_name_uq").on(table.categoryId, table.name),
    index("services_category_active_idx").on(
      table.categoryId,
      table.isActive,
      table.sortOrder,
    ),
  ],
);

export const servicePrices = sqliteTable(
  "service_prices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    price: real("price").notNull(),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("service_prices_current_idx").on(
      table.serviceId,
      table.effectiveFrom,
      table.effectiveTo,
    ),
    check("service_prices_positive_check", sql`${table.price} > 0`),
  ],
);

export const customers = sqliteTable(
  "customers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    address: text("address").notNull().default(""),
    vatNumber: text("vat_number").notNull().default(""),
    notes: text("notes").notNull().default(""),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdBy: integer("created_by").references(() => users.id),
    ...timestamps,
  },
  (table) => [
    index("customers_name_idx").on(table.name),
    index("customers_phone_idx").on(table.phone),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceNumber: text("invoice_number").notNull(),
    customerId: integer("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull().default(""),
    customerEmail: text("customer_email").notNull().default(""),
    customerAddress: text("customer_address").notNull().default(""),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    orderDate: text("order_date").notNull(),
    supplyDate: text("supply_date").notNull(),
    paymentMethod: text("payment_method", {
      enum: ["cash", "card"],
    }).notNull(),
    paymentStatus: text("payment_status", {
      enum: ["paid", "unpaid", "partial"],
    }).notNull(),
    subtotal: real("subtotal").notNull(),
    discount: real("discount").notNull().default(0),
    vatAmount: real("vat_amount").notNull(),
    totalAmount: real("total_amount").notNull(),
    amountPaid: real("amount_paid").notNull().default(0),
    balance: real("balance").notNull(),
    notes: text("notes").notNull().default(""),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("orders_invoice_number_uq").on(table.invoiceNumber),
    index("orders_date_idx").on(table.orderDate),
    index("orders_customer_idx").on(table.customerId),
    index("orders_status_method_idx").on(
      table.paymentStatus,
      table.paymentMethod,
    ),
    check(
      "orders_payment_method_check",
      sql`${table.paymentMethod} IN ('cash', 'card')`,
    ),
    check(
      "orders_payment_status_check",
      sql`${table.paymentStatus} IN ('paid', 'unpaid', 'partial')`,
    ),
    check(
      "orders_amounts_check",
      sql`${table.subtotal} >= 0 AND ${table.discount} >= 0 AND ${table.vatAmount} >= 0 AND ${table.totalAmount} >= 0 AND ${table.amountPaid} >= 0 AND ${table.balance} >= 0`,
    ),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    serviceId: integer("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    categoryName: text("category_name").notNull(),
    serviceName: text("service_name").notNull(),
    unitPrice: real("unit_price").notNull(),
    quantity: real("quantity").notNull(),
    taxableAmount: real("taxable_amount").notNull(),
    vatAmount: real("vat_amount").notNull(),
    totalAmount: real("total_amount").notNull(),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    check(
      "order_items_values_check",
      sql`${table.unitPrice} > 0 AND ${table.quantity} > 0 AND ${table.taxableAmount} >= 0 AND ${table.vatAmount} >= 0 AND ${table.totalAmount} >= 0`,
    ),
  ],
);

export const orderEvents = sqliteTable(
  "order_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    actorUserId: integer("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("order_events_order_idx").on(table.orderId)],
);

export const permissionGrants = sqliteTable(
  "permission_grants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    staffUserId: integer("staff_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: text("scope", {
      enum: ["reports_history", "orders_history_write"],
    }).notNull(),
    fromDate: text("from_date").notNull(),
    toDate: text("to_date").notNull(),
    grantedBy: integer("granted_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    expiresAt: text("expires_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("permission_staff_scope_idx").on(
      table.staffUserId,
      table.scope,
      table.fromDate,
      table.toDate,
    ),
    check(
      "permission_grants_scope_check",
      sql`${table.scope} IN ('reports_history', 'orders_history_write')`,
    ),
    check(
      "permission_grants_date_check",
      sql`${table.fromDate} <= ${table.toDate}`,
    ),
  ],
);
