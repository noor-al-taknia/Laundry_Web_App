import { getD1 } from "../../../db";
import { requireSession } from "../../../lib/auth";
import {
  isIsoDate,
  json,
  money,
  payload,
  positiveNumber,
  riyadhDate,
  riyadhIso,
  requireSameOrigin,
  route,
  textValue,
} from "../../../lib/api";
import { ensureDatabase } from "../../../lib/database";
import { getOrderDetail, getOrders } from "../../../lib/data";
import { numericId } from "../../../lib/id";
import { formatOrderToken } from "../../../lib/token";
import {
  canReadRange,
  canWriteOrderDate,
} from "../../../lib/permissions";

type NewOrderPayload = {
  customerId?: number | null;
  saveCustomer?: boolean;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  items?: Array<{ serviceId?: number; quantity?: number }>;
  discount?: number;
  amountPaid?: number;
  paymentMethod?: "cash" | "card";
  supplyDate?: string;
  notes?: string;
};

type AvailableService = {
  id: number;
  name: string;
  categoryName: string;
  price: number | null;
};

export async function GET(request: Request) {
  return route(async () => {
    await ensureDatabase();
    const user = await requireSession(request);
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id") ?? 0);
    if (id) {
      const detail = await getOrderDetail(id);
      if (!detail) return json({ error: "Order not found" }, 404);
      const order = detail.order as { orderDate: string };
      if (!(await canReadRange(user, order.orderDate, order.orderDate))) {
        return json(
          { error: "Admin permission is required for this order." },
          403,
        );
      }
      return { detail };
    }

    const filters = {
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      method: url.searchParams.get("method") ?? undefined,
      customer: url.searchParams.get("customer") ?? undefined,
      customerId: Number(url.searchParams.get("customerId") ?? 0) || undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Number(
        url.searchParams.get("pageSize") ??
          url.searchParams.get("limit") ??
          25,
      ),
    };
    if (
      (filters.from && !isIsoDate(filters.from)) ||
      (filters.to && !isIsoDate(filters.to))
    ) {
      return json({ error: "Invalid report date" }, 400);
    }
    return getOrders(user, filters);
  });
}

export async function POST(request: Request) {
  return route(async () => {
    requireSameOrigin(request);
    await ensureDatabase();
    const user = await requireSession(request);
    const body = await payload<NewOrderPayload>(request);
    const itemInput = Array.isArray(body.items) ? body.items.slice(0, 100) : [];
    if (!itemInput.length) return json({ error: "Add at least one item" }, 400);
    const ids = [...new Set(itemInput.map((item) => Number(item.serviceId)))];
    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
      return json({ error: "Invalid service item" }, 400);
    }

    const db = getD1();
    const placeholders = ids.map(() => "?").join(",");
    const serviceResult = await db
      .prepare(
        `SELECT s.id, s.name, c.name AS categoryName, p.price
         FROM services s
         JOIN categories c ON c.id = s.category_id
         LEFT JOIN service_prices p ON p.id = (
           SELECT sp.id FROM service_prices sp
           WHERE sp.service_id = s.id
             AND datetime(sp.effective_from) <= datetime('now')
             AND (sp.effective_to IS NULL OR datetime(sp.effective_to) > datetime('now'))
           ORDER BY datetime(sp.effective_from) DESC, sp.id DESC LIMIT 1
         )
         WHERE s.id IN (${placeholders})
           AND s.is_active = 1 AND c.is_active = 1`,
      )
      .bind(...ids)
      .all<AvailableService>();
    if (serviceResult.results.length !== ids.length) {
      return json(
        { error: "One or more services are inactive or unavailable" },
        400,
      );
    }
    const services = new Map<number, AvailableService>(
      serviceResult.results.map((service) => [service.id, service]),
    );
    const lines = itemInput.map((input) => {
      const service = services.get(Number(input.serviceId));
      if (!service || !service.price || Number(service.price) <= 0) {
        throw new Response(
          JSON.stringify({ error: "Every service needs an active price" }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }
      const quantity = positiveNumber(input.quantity, "Quantity");
      const taxableAmount = money(Number(service.price) * quantity);
      const vatAmount = money(taxableAmount * 0.15);
      return {
        service,
        quantity,
        unitPrice: money(Number(service.price)),
        taxableAmount,
        vatAmount,
        totalAmount: money(taxableAmount + vatAmount),
      };
    });
    const subtotal = money(
      lines.reduce((sum, line) => sum + line.taxableAmount, 0),
    );
    const discount = money(Math.max(0, Number(body.discount ?? 0)));
    if (discount > subtotal) {
      return json({ error: "Discount cannot exceed subtotal" }, 400);
    }
    const taxableAfterDiscount = money(subtotal - discount);
    const vatAmount = money(taxableAfterDiscount * 0.15);
    const totalAmount = money(taxableAfterDiscount + vatAmount);
    const amountPaid = money(
      Math.min(Math.max(0, Number(body.amountPaid ?? 0)), totalAmount),
    );
    const balance = money(totalAmount - amountPaid);
    const paymentStatus =
      amountPaid <= 0 ? "unpaid" : balance <= 0 ? "paid" : "partial";
    const paymentMethod =
      body.paymentMethod === "card" ? "card" : ("cash" as const);
    const supplyDate =
      body.supplyDate && isIsoDate(body.supplyDate)
        ? body.supplyDate
        : riyadhDate();

    let customerId = Number(body.customerId ?? 0) || null;
    let customer = {
      name: textValue(body.customer?.name, 160),
      phone: textValue(body.customer?.phone, 40),
      email: textValue(body.customer?.email, 160),
      address: textValue(body.customer?.address, 300),
    };
    if (customerId) {
      const saved = await db
        .prepare(
          `SELECT id, name, phone, email, address
           FROM customers WHERE id = ? AND is_active = 1`,
        )
        .bind(customerId)
        .first<typeof customer & { id: number }>();
      if (!saved) return json({ error: "Selected customer was not found" }, 400);
      customer = saved;
    }
    if (!customer.name) customer.name = "Walk-in Customer";

    const newCustomer =
      !customerId && body.saveCustomer && customer.name !== "Walk-in Customer";
    if (newCustomer) customerId = numericId();
    const invoiceSequence = await db
      .prepare(
        `UPDATE shop_settings
         SET next_invoice_number = next_invoice_number + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = 1
         RETURNING invoice_prefix AS prefix,
                   next_invoice_number - 1 AS number`,
      )
      .first<{ prefix: string; number: number }>();
    if (!invoiceSequence) {
      return json({ error: "Shop settings are not configured" }, 500);
    }
    const invoiceNumber = `${invoiceSequence.prefix}-${String(invoiceSequence.number).padStart(6, "0")}`;
    const tokenSequence = await db
      .prepare(
        `INSERT INTO order_sequences (business_date, next_value, updated_at)
         VALUES (?, 2, CURRENT_TIMESTAMP)
         ON CONFLICT(business_date) DO UPDATE SET
           next_value = next_value + 1,
           updated_at = CURRENT_TIMESTAMP
         RETURNING next_value - 1 AS tokenValue`,
      )
      .bind(riyadhDate())
      .first<{ tokenValue: number }>();
    if (!tokenSequence) {
      return json({ error: "Unable to allocate order token" }, 500);
    }
    const tokenNumber = formatOrderToken(riyadhDate(), tokenSequence.tokenValue);
    const orderId = numericId();
    const now = riyadhIso();

    const statements = [];
    if (newCustomer && customerId) {
      statements.push(
        db
          .prepare(
            `INSERT INTO customers
             (id, name, phone, email, address, created_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            customerId,
            customer.name,
            customer.phone,
            customer.email,
            customer.address,
            user.id,
          ),
      );
    }
    statements.push(
      db
        .prepare(
          `INSERT INTO orders
           (id, invoice_number, token_number, customer_id, customer_name, customer_phone,
            customer_email, customer_address, created_by, order_date,
            supply_date, payment_method, payment_status, subtotal, discount,
            vat_amount, total_amount, amount_paid, balance, notes, created_at,
            updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          orderId,
          invoiceNumber,
          tokenNumber,
          customerId,
          customer.name,
          customer.phone,
          customer.email,
          customer.address,
          user.id,
          riyadhDate(),
          supplyDate,
          paymentMethod,
          paymentStatus,
          subtotal,
          discount,
          vatAmount,
          totalAmount,
          amountPaid,
          balance,
          textValue(body.notes, 500),
          now,
          now,
        ),
      ...lines.map((line) =>
        db
          .prepare(
            `INSERT INTO order_items
             (order_id, service_id, category_name, service_name, unit_price,
              quantity, taxable_amount, vat_amount, total_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            orderId,
            line.service.id,
            line.service.categoryName,
            line.service.name,
            line.unitPrice,
            line.quantity,
            line.taxableAmount,
            line.vatAmount,
            line.totalAmount,
          ),
      ),
      db
        .prepare(
          `INSERT INTO order_events
           (order_id, actor_user_id, event_type, new_value)
           VALUES (?, ?, 'created', ?)`,
        )
        .bind(
          orderId,
          user.id,
          JSON.stringify({ paymentStatus, paymentMethod, amountPaid }),
        ),
    );
    await db.batch(statements);
    const detail = await getOrderDetail(orderId);
    return json({ order: detail }, 201);
  });
}

export async function PATCH(request: Request) {
  return route(async () => {
    requireSameOrigin(request);
    await ensureDatabase();
    const user = await requireSession(request);
    const body = await payload<{
      id?: number;
      version?: number;
      paymentStatus?: "paid" | "unpaid" | "partial";
      paymentMethod?: "cash" | "card";
      amountPaid?: number;
      notes?: string;
    }>(request);
    const id = Number(body.id ?? 0);
    const version = Number(body.version ?? 0);
    const db = getD1();
    const current = await db
      .prepare(
        `SELECT id, order_date AS orderDate, payment_status AS paymentStatus,
                payment_method AS paymentMethod, amount_paid AS amountPaid,
                total_amount AS totalAmount, notes, version
         FROM orders WHERE id = ?`,
      )
      .bind(id)
      .first<{
        id: number;
        orderDate: string;
        paymentStatus: string;
        paymentMethod: string;
        amountPaid: number;
        totalAmount: number;
        notes: string;
        version: number;
      }>();
    if (!current) return json({ error: "Order not found" }, 404);
    if (!(await canWriteOrderDate(user, current.orderDate))) {
      return json(
        {
          error:
            "Admin permission is required to change orders outside today.",
        },
        403,
      );
    }
    if (version && version !== current.version) {
      return json(
        { error: "This order changed elsewhere. Refresh and try again." },
        409,
      );
    }

    const paymentMethod =
      body.paymentMethod === "card" || body.paymentMethod === "cash"
        ? body.paymentMethod
        : current.paymentMethod;
    let amountPaid = money(
      Math.min(
        Math.max(0, Number(body.amountPaid ?? current.amountPaid)),
        current.totalAmount,
      ),
    );
    if (body.paymentStatus === "paid") amountPaid = current.totalAmount;
    if (body.paymentStatus === "unpaid") amountPaid = 0;
    const balance = money(current.totalAmount - amountPaid);
    const paymentStatus =
      amountPaid <= 0 ? "unpaid" : balance <= 0 ? "paid" : "partial";
    const notes =
      body.notes === undefined ? current.notes : textValue(body.notes, 500);

    const result = await db
      .prepare(
        `UPDATE orders
         SET payment_method = ?, payment_status = ?, amount_paid = ?,
             balance = ?, notes = ?, version = version + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND version = ?`,
      )
      .bind(
        paymentMethod,
        paymentStatus,
        amountPaid,
        balance,
        notes,
        id,
        current.version,
      )
      .run();
    if (!result.meta.changes) {
      return json(
        { error: "This order changed elsewhere. Refresh and try again." },
        409,
      );
    }
    await db
      .prepare(
        `INSERT INTO order_events
         (order_id, actor_user_id, event_type, old_value, new_value)
         VALUES (?, ?, 'payment_updated', ?, ?)`,
      )
      .bind(
        id,
        user.id,
        JSON.stringify({
          paymentStatus: current.paymentStatus,
          paymentMethod: current.paymentMethod,
          amountPaid: current.amountPaid,
        }),
        JSON.stringify({ paymentStatus, paymentMethod, amountPaid }),
      )
      .run();
    return { detail: await getOrderDetail(id) };
  });
}
