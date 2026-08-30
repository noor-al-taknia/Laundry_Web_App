import { getD1 } from "../db";
import type { SessionUser } from "./auth";
import { daysAgo, riyadhDate } from "./api";
import { canReadRange } from "./permissions";

export type CatalogRow = {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  categorySort: number;
  categoryActive: number;
  serviceId: number | null;
  serviceName: string | null;
  serviceNameAr: string | null;
  serviceSort: number | null;
  serviceActive: number | null;
  priceId: number | null;
  price: number | null;
  effectiveFrom: string | null;
};

export async function getCatalog(includeInactive = false) {
  const where = includeInactive
    ? ""
    : "WHERE c.is_active = 1 AND (s.id IS NULL OR s.is_active = 1)";
  const result = await getD1()
    .prepare(
      `SELECT
         c.id AS categoryId, c.name AS categoryName, c.color AS categoryColor,
         c.sort_order AS categorySort, c.is_active AS categoryActive,
         s.id AS serviceId, s.name AS serviceName, s.name_ar AS serviceNameAr,
         s.sort_order AS serviceSort, s.is_active AS serviceActive,
         p.id AS priceId, p.price AS price, p.effective_from AS effectiveFrom
       FROM categories c
       LEFT JOIN services s ON s.category_id = c.id
       LEFT JOIN service_prices p ON p.id = (
         SELECT sp.id FROM service_prices sp
         WHERE sp.service_id = s.id
           AND datetime(sp.effective_from) <= datetime('now')
           AND (sp.effective_to IS NULL OR datetime(sp.effective_to) > datetime('now'))
         ORDER BY datetime(sp.effective_from) DESC, sp.id DESC LIMIT 1
       )
       ${where}
       ORDER BY c.sort_order, c.name, s.sort_order, s.name`,
    )
    .all<CatalogRow>();

  const map = new Map<
    number,
    {
      id: number;
      name: string;
      color: string;
      sortOrder: number;
      isActive: boolean;
      services: Array<{
        id: number;
        name: string;
        nameAr: string;
        sortOrder: number;
        isActive: boolean;
        priceId: number | null;
        price: number;
        effectiveFrom: string | null;
      }>;
    }
  >();
  for (const row of result.results) {
    if (!map.has(row.categoryId)) {
      map.set(row.categoryId, {
        id: row.categoryId,
        name: row.categoryName,
        color: row.categoryColor,
        sortOrder: row.categorySort,
        isActive: Boolean(row.categoryActive),
        services: [],
      });
    }
    if (row.serviceId && row.serviceName) {
      map.get(row.categoryId)?.services.push({
        id: row.serviceId,
        name: row.serviceName,
        nameAr: row.serviceNameAr ?? "",
        sortOrder: Number(row.serviceSort ?? 0),
        isActive: Boolean(row.serviceActive),
        priceId: row.priceId,
        price: Number(row.price ?? 0),
        effectiveFrom: row.effectiveFrom,
      });
    }
  }
  return [...map.values()];
}

export async function getCustomers(includeInactive = false) {
  const result = await getD1()
    .prepare(
      `SELECT id, name, phone, email, address, vat_number AS vatNumber,
              notes, is_active AS isActive, created_at AS createdAt,
              updated_at AS updatedAt
       FROM customers
       ${includeInactive ? "" : "WHERE is_active = 1"}
       ORDER BY name COLLATE NOCASE
       LIMIT 1000`,
    )
    .all<{
      id: number;
      name: string;
      phone: string;
      email: string;
      address: string;
      vatNumber: string;
      notes: string;
      isActive: number;
      createdAt: string;
      updatedAt: string;
    }>();
  return result.results.map((customer) => ({
    ...customer,
    isActive: Boolean(customer.isActive),
  }));
}

export type OrderFilters = {
  from?: string;
  to?: string;
  status?: string;
  method?: string;
  account?: string;
  customer?: string;
  customerId?: number;
  sort?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
};

export async function getOrders(
  user: SessionUser,
  filters: OrderFilters = {},
) {
  const from =
    filters.from ?? (user.role === "admin" ? daysAgo(30) : daysAgo(2));
  const to = filters.to ?? riyadhDate();
  if (!(await canReadRange(user, from, to))) {
    throw new Response(
      JSON.stringify({
        error:
          "Admin permission is required to read reports older than three days.",
      }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
  }

  const conditions = ["o.order_date >= ?", "o.order_date <= ?", "o.order_status = 'active'"];
  const values: Array<string | number> = [from, to];
  if (filters.status && ["paid", "unpaid", "partial"].includes(filters.status)) {
    conditions.push("o.payment_status = ?");
    values.push(filters.status);
  }
  if (filters.method && ["cash", "card"].includes(filters.method)) {
    conditions.push("o.payment_method = ?");
    values.push(filters.method);
  }
  if (filters.account && ["stc", "anb"].includes(filters.account)) {
    conditions.push("o.card_account = ?");
    values.push(filters.account);
  }
  if (filters.customer) {
    conditions.push(
      "(o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.invoice_number LIKE ? OR o.token_number LIKE ?)",
    );
    const search = `%${filters.customer.slice(0, 100)}%`;
    values.push(search, search, search, search);
  }
  if (filters.customerId) {
    conditions.push("o.customer_id = ?");
    values.push(filters.customerId);
  }

  const sortMap: Record<string, string> = {
    oldest: "o.created_at ASC",
    total_desc: "o.total_amount DESC",
    total_asc: "o.total_amount ASC",
    customer_asc: "o.customer_name COLLATE NOCASE ASC",
    customer_desc: "o.customer_name COLLATE NOCASE DESC",
  };
  const sort = sortMap[filters.sort ?? ""] ?? "o.created_at DESC";
  const pageSize = Math.min(
    Math.max(Number(filters.pageSize ?? filters.limit ?? 25), 1),
    1000,
  );
  const page = Math.max(Number(filters.page ?? 1), 1);
  const offset = (page - 1) * pageSize;
  const db = getD1();
  const aggregate = await db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(o.total_amount), 0) AS sales,
              COALESCE(SUM(o.amount_paid), 0) AS collected,
              COALESCE(SUM(o.balance), 0) AS balance
       FROM orders o
       WHERE ${conditions.join(" AND ")}`,
    )
    .bind(...values)
    .first<{
      total: number;
      sales: number;
      collected: number;
      balance: number;
    }>();

  const result = await db
    .prepare(
      `SELECT
         o.id, o.invoice_number AS invoiceNumber, COALESCE(o.token_number, '') AS tokenNumber, o.customer_id AS customerId,
         o.customer_name AS customerName, o.customer_phone AS customerPhone,
         o.customer_email AS customerEmail, o.customer_address AS customerAddress,
         o.order_date AS orderDate, o.supply_date AS supplyDate,
         o.payment_method AS paymentMethod, o.payment_status AS paymentStatus,
         o.order_status AS orderStatus,
         o.card_account AS cardAccount, o.cash_received AS cashReceived,
         o.balance_settled_by_staff AS balanceSettledByStaff,
         o.settled_from_staff AS settledFromStaff,
         o.settled_from_drawer AS settledFromDrawer,
         o.subtotal, o.discount, o.vat_amount AS vatAmount,
         o.total_amount AS totalAmount, o.amount_paid AS amountPaid,
         o.balance, o.notes, o.version, o.created_at AS createdAt,
         o.updated_at AS updatedAt, u.display_name AS createdByName,
         o.assigned_staff_id AS assignedStaffId, COALESCE(assigned.display_name, u.display_name) AS assignedStaffName
       FROM orders o JOIN users u ON u.id = o.created_by
       LEFT JOIN users assigned ON assigned.id = o.assigned_staff_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${sort}
       LIMIT ? OFFSET ?`,
    )
    .bind(...values, pageSize, offset)
    .all();
  return {
    from,
    to,
    orders: result.results,
    total: Number(aggregate?.total ?? 0),
    page,
    pageSize,
    summary: {
      orders: Number(aggregate?.total ?? 0),
      sales: Number(aggregate?.sales ?? 0),
      collected: Number(aggregate?.collected ?? 0),
      balance: Number(aggregate?.balance ?? 0),
    },
  };
}

export async function getOrderDetail(orderId: number) {
  const order = await getD1()
    .prepare(
      `SELECT
         o.id, o.invoice_number AS invoiceNumber, COALESCE(o.token_number, '') AS tokenNumber, o.customer_id AS customerId,
         o.customer_name AS customerName, o.customer_phone AS customerPhone,
         o.customer_email AS customerEmail, o.customer_address AS customerAddress,
         o.created_by AS createdBy, o.order_date AS orderDate,
         o.supply_date AS supplyDate, o.payment_method AS paymentMethod,
         o.card_account AS cardAccount, o.cash_received AS cashReceived,
         o.balance_settled_by_staff AS balanceSettledByStaff,
         o.settled_from_staff AS settledFromStaff,
         o.settled_from_drawer AS settledFromDrawer,
         o.payment_status AS paymentStatus, o.subtotal, o.discount,
         o.order_status AS orderStatus,
         o.vat_amount AS vatAmount, o.total_amount AS totalAmount,
         o.amount_paid AS amountPaid, o.balance, o.notes, o.version,
         o.created_at AS createdAt, o.updated_at AS updatedAt,
         u.display_name AS createdByName, o.assigned_staff_id AS assignedStaffId,
         COALESCE(assigned.display_name, u.display_name) AS assignedStaffName
       FROM orders o JOIN users u ON u.id = o.created_by
       LEFT JOIN users assigned ON assigned.id = o.assigned_staff_id WHERE o.id = ?`,
    )
    .bind(orderId)
    .first();
  if (!order) return null;
  const [items, events] = await Promise.all([
    getD1()
      .prepare(
        `SELECT id, service_id AS serviceId, category_name AS categoryName,
                service_name AS serviceName, unit_price AS unitPrice,
                quantity, taxable_amount AS taxableAmount,
                vat_amount AS vatAmount, total_amount AS totalAmount
         FROM order_items WHERE order_id = ? ORDER BY id`,
      )
      .bind(orderId)
      .all(),
    getD1()
      .prepare(
        `SELECT e.id, e.event_type AS eventType, e.old_value AS oldValue,
                e.new_value AS newValue, e.created_at AS createdAt,
                u.display_name AS actorName
         FROM order_events e JOIN users u ON u.id = e.actor_user_id
         WHERE e.order_id = ? ORDER BY e.id DESC`,
      )
      .bind(orderId)
      .all(),
  ]);
  return { order, items: items.results, events: events.results };
}
