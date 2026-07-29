import { getD1 } from "../../../db";
import { requireSession } from "../../../lib/auth";
import {
  json,
  payload,
  positiveNumber,
  riyadhIso,
  requireSameOrigin,
  route,
  textValue,
} from "../../../lib/api";
import { hashPassword } from "../../../lib/crypto";
import { ensureDatabase } from "../../../lib/database";
import { numericId } from "../../../lib/id";

type AdminAction =
  | "settings.update"
  | "category.create"
  | "category.update"
  | "service.create"
  | "service.update"
  | "price.create"
  | "customer.create"
  | "customer.update"
  | "import.customers"
  | "import.catalog"
  | "user.create"
  | "user.update"
  | "grant.create"
  | "grant.delete";

function importRows(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 1000) {
    throw new Response(
      JSON.stringify({ error: "Import must contain 1 to 1,000 rows." }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  return value as Array<Record<string, unknown>>;
}

export async function POST(request: Request) {
  return route(async () => {
    requireSameOrigin(request);
    await ensureDatabase();
    const admin = await requireSession(request, "admin");
    const body = await payload<Record<string, unknown> & { action?: AdminAction }>(
      request,
    );
    const db = getD1();

    switch (body.action) {
      case "settings.update": {
        const shopName = textValue(body.shopName, 160);
        const vatNumber = textValue(body.vatNumber, 30);
        if (!shopName) return json({ error: "Shop name is required." }, 400);
        if (vatNumber && !/^\d{15}$/.test(vatNumber)) {
          return json({ error: "VAT number must contain 15 digits." }, 400);
        }
        await db
          .prepare(
            `UPDATE shop_settings SET
             shop_name = ?, shop_name_ar = ?, address = ?, phone = ?,
             email = ?, vat_number = ?, commercial_number = ?,
             invoice_prefix = ?, receipt_footer = ?, updated_by = ?,
             updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
          )
          .bind(
            shopName,
            textValue(body.shopNameAr, 160),
            textValue(body.address, 300),
            textValue(body.phone, 40),
            textValue(body.email, 160),
            vatNumber,
            textValue(body.commercialNumber, 80),
            textValue(body.invoicePrefix, 12).toUpperCase() || "INV",
            textValue(body.receiptFooter, 300),
            admin.id,
          )
          .run();
        return { ok: true };
      }
      case "category.create": {
        const name = textValue(body.name, 100);
        if (!name) return json({ error: "Category name is required." }, 400);
        const color = /^#[0-9a-f]{6}$/i.test(String(body.color))
          ? String(body.color)
          : "#0c5551";
        await db
          .prepare(
            `INSERT INTO categories (name, color, sort_order)
             VALUES (?, ?, ?)`,
          )
          .bind(name, color, Number(body.sortOrder ?? 0))
          .run();
        return { ok: true };
      }
      case "category.update": {
        const id = Number(body.id);
        const name = textValue(body.name, 100);
        if (!id || !name) {
          return json({ error: "Category name is required." }, 400);
        }
        const color = /^#[0-9a-f]{6}$/i.test(String(body.color))
          ? String(body.color)
          : "#0c5551";
        await db
          .prepare(
            `UPDATE categories SET name = ?, color = ?, sort_order = ?,
             is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .bind(
            name,
            color,
            Number(body.sortOrder ?? 0),
            body.isActive === false ? 0 : 1,
            id,
          )
          .run();
        return { ok: true };
      }
      case "service.create": {
        const categoryId = Number(body.categoryId);
        const name = textValue(body.name, 120);
        if (!categoryId || !name) {
          return json({ error: "Category and item name are required." }, 400);
        }
        const created = await db
          .prepare(
            `INSERT INTO services
             (category_id, name, name_ar, sort_order)
             VALUES (?, ?, ?, ?)
             RETURNING id`,
          )
          .bind(
            categoryId,
            name,
            textValue(body.nameAr, 120),
            Number(body.sortOrder ?? 0),
          )
          .first<{ id: number }>();
        if (created && Number(body.price) > 0) {
          await db
            .prepare(
              `INSERT INTO service_prices
               (service_id, price, effective_from, created_by)
               VALUES (?, ?, ?, ?)`,
            )
            .bind(
              created.id,
              positiveNumber(body.price, "Price"),
              riyadhIso(),
              admin.id,
            )
            .run();
        }
        return { ok: true, id: created?.id };
      }
      case "service.update": {
        if (
          !Number(body.id) ||
          !Number(body.categoryId) ||
          !textValue(body.name, 120)
        ) {
          return json(
            { error: "Category and item name are required." },
            400,
          );
        }
        await db
          .prepare(
            `UPDATE services SET category_id = ?, name = ?, name_ar = ?,
             sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
          )
          .bind(
            Number(body.categoryId),
            textValue(body.name, 120),
            textValue(body.nameAr, 120),
            Number(body.sortOrder ?? 0),
            body.isActive === false ? 0 : 1,
            Number(body.id),
          )
          .run();
        return { ok: true };
      }
      case "price.create": {
        const serviceId = Number(body.serviceId);
        const price = positiveNumber(body.price, "Price");
        const effectiveFrom =
          textValue(body.effectiveFrom, 40) || riyadhIso();
        await db.batch([
          db
            .prepare(
              `UPDATE service_prices SET effective_to = ?
               WHERE service_id = ? AND effective_to IS NULL`,
            )
            .bind(effectiveFrom, serviceId),
          db
            .prepare(
              `INSERT INTO service_prices
               (service_id, price, effective_from, created_by)
               VALUES (?, ?, ?, ?)`,
            )
            .bind(serviceId, price, effectiveFrom, admin.id),
        ]);
        return { ok: true };
      }
      case "customer.create": {
        const name = textValue(body.name, 160);
        if (!name) return json({ error: "Customer name is required." }, 400);
        await db
          .prepare(
            `INSERT INTO customers
             (name, phone, email, address, vat_number, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            name,
            textValue(body.phone, 40),
            textValue(body.email, 160),
            textValue(body.address, 300),
            textValue(body.vatNumber, 30),
            textValue(body.notes, 500),
            admin.id,
          )
          .run();
        return { ok: true };
      }
      case "customer.update": {
        if (!Number(body.id) || !textValue(body.name, 160)) {
          return json({ error: "Customer name is required." }, 400);
        }
        await db
          .prepare(
            `UPDATE customers SET name = ?, phone = ?, email = ?, address = ?,
             vat_number = ?, notes = ?, is_active = ?,
             updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .bind(
            textValue(body.name, 160),
            textValue(body.phone, 40),
            textValue(body.email, 160),
            textValue(body.address, 300),
            textValue(body.vatNumber, 30),
            textValue(body.notes, 500),
            body.isActive === false ? 0 : 1,
            Number(body.id),
          )
          .run();
        return { ok: true };
      }
      case "import.customers": {
        const rows = importRows(body.rows);
        const existing = await db
          .prepare(
            `SELECT lower(phone) AS phone, lower(email) AS email
             FROM customers WHERE phone <> '' OR email <> ''`,
          )
          .all<{ phone: string; email: string }>();
        const phones = new Set(existing.results.map((row) => row.phone).filter(Boolean));
        const emails = new Set(existing.results.map((row) => row.email).filter(Boolean));
        const statements = rows.map((row, index) => {
          const name = textValue(row.name, 160);
          const phone = textValue(row.phone, 40);
          const email = textValue(row.email, 160).toLowerCase();
          if (!name) {
            throw new Response(
              JSON.stringify({ error: `Row ${index + 2}: name is required.` }),
              { status: 400, headers: { "content-type": "application/json" } },
            );
          }
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Response(
              JSON.stringify({ error: `Row ${index + 2}: invalid email.` }),
              { status: 400, headers: { "content-type": "application/json" } },
            );
          }
          if ((phone && phones.has(phone.toLowerCase())) || (email && emails.has(email))) {
            throw new Response(
              JSON.stringify({
                error: `Row ${index + 2}: customer phone or email already exists.`,
              }),
              { status: 409, headers: { "content-type": "application/json" } },
            );
          }
          if (phone) phones.add(phone.toLowerCase());
          if (email) emails.add(email);
          return db
            .prepare(
              `INSERT INTO customers
               (id, name, phone, email, address, vat_number, notes, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              numericId(),
              name,
              phone,
              email,
              textValue(row.address, 300),
              textValue(row.vat_number, 30),
              textValue(row.notes, 500),
              admin.id,
            );
        });
        await db.batch(statements);
        return { ok: true, imported: rows.length };
      }
      case "import.catalog": {
        const rows = importRows(body.rows);
        const [categoryResult, serviceResult] = await Promise.all([
          db
            .prepare("SELECT id, name FROM categories")
            .all<{ id: number; name: string }>(),
          db
            .prepare(
              `SELECT s.category_id AS categoryId, s.name
               FROM services s`,
            )
            .all<{ categoryId: number; name: string }>(),
        ]);
        const categoryIds = new Map(
          categoryResult.results.map((row) => [row.name.toLowerCase(), row.id]),
        );
        const serviceKeys = new Set(
          serviceResult.results.map(
            (row) => `${row.categoryId}:${row.name.toLowerCase()}`,
          ),
        );
        const categoryStatements = new Map<string, ReturnType<typeof db.prepare>>();
        const statements: ReturnType<typeof db.prepare>[] = [];
        for (const [index, row] of rows.entries()) {
          const categoryName = textValue(row.category_name, 100);
          const itemName = textValue(row.item_name, 120);
          const price = Number(row.price);
          const color = String(row.category_color ?? "");
          if (!categoryName || !itemName || !Number.isFinite(price) || price <= 0) {
            return json(
              {
                error: `Row ${index + 2}: category_name, item_name and a positive price are required.`,
              },
              400,
            );
          }
          if (color && !/^#[0-9a-f]{6}$/i.test(color)) {
            return json(
              { error: `Row ${index + 2}: category_color must be a hex color.` },
              400,
            );
          }
          const categoryKey = categoryName.toLowerCase();
          let categoryId = categoryIds.get(categoryKey);
          if (!categoryId) {
            categoryId = numericId();
            categoryIds.set(categoryKey, categoryId);
            categoryStatements.set(
              categoryKey,
              db
                .prepare(
                  `INSERT INTO categories (id, name, color, sort_order)
                   VALUES (?, ?, ?, ?)`,
                )
                .bind(
                  categoryId,
                  categoryName,
                  color || "#00695c",
                  Number(row.sort_order ?? 0) || 0,
                ),
            );
          }
          const serviceKey = `${categoryId}:${itemName.toLowerCase()}`;
          if (serviceKeys.has(serviceKey)) {
            return json(
              { error: `Row ${index + 2}: item already exists in this category.` },
              409,
            );
          }
          serviceKeys.add(serviceKey);
          const serviceId = numericId();
          statements.push(
            db
              .prepare(
                `INSERT INTO services
                 (id, category_id, name, name_ar, sort_order)
                 VALUES (?, ?, ?, ?, ?)`,
              )
              .bind(
                serviceId,
                categoryId,
                itemName,
                textValue(row.item_name_ar, 120),
                Number(row.sort_order ?? 0) || 0,
              ),
            db
              .prepare(
                `INSERT INTO service_prices
                 (service_id, price, effective_from, created_by)
                 VALUES (?, ?, ?, ?)`,
              )
              .bind(serviceId, price, riyadhIso(), admin.id),
          );
        }
        await db.batch([...categoryStatements.values(), ...statements]);
        return { ok: true, imported: rows.length };
      }
      case "user.create": {
        const username = textValue(body.username, 80).toLowerCase();
        const password = String(body.password ?? "");
        if (!username || password.length < 8) {
          return json(
            { error: "Username and an 8-character password are required." },
            400,
          );
        }
        const passwordData = await hashPassword(password);
        await db
          .prepare(
            `INSERT INTO users
             (username, display_name, role, password_hash, password_salt)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .bind(
            username,
            textValue(body.displayName, 120) || username,
            body.role === "admin" ? "admin" : "staff",
            passwordData.hash,
            passwordData.salt,
          )
          .run();
        return { ok: true };
      }
      case "user.update": {
        const id = Number(body.id);
        if (id === admin.id && body.isActive === false) {
          return json({ error: "You cannot deactivate your own account." }, 400);
        }
        const role = body.role === "admin" ? "admin" : "staff";
        if (id === admin.id && role !== "admin") {
          return json({ error: "You cannot remove your own admin role." }, 400);
        }
        const currentUser = await db
          .prepare("SELECT role, is_active AS isActive FROM users WHERE id = ?")
          .bind(id)
          .first<{ role: string; isActive: number }>();
        if (!currentUser) return json({ error: "User not found." }, 404);
        if (
          currentUser.role === "admin" &&
          (role !== "admin" || body.isActive === false)
        ) {
          const adminCount = await db
            .prepare(
              "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1",
            )
            .first<{ count: number }>();
          if (Number(adminCount?.count ?? 0) <= 1) {
            return json(
              { error: "At least one active administrator is required." },
              400,
            );
          }
        }
        const statements = [
          db
            .prepare(
              `UPDATE users SET display_name = ?, role = ?, is_active = ?,
               updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            )
            .bind(
              textValue(body.displayName, 120),
              role,
              body.isActive === false ? 0 : 1,
              id,
            ),
        ];
        const password = String(body.password ?? "");
        if (password) {
          if (password.length < 8) {
            return json(
              { error: "Password must be at least 8 characters." },
              400,
            );
          }
          const passwordData = await hashPassword(password);
          statements.push(
            db
              .prepare(
                `UPDATE users SET password_hash = ?, password_salt = ?,
                 must_change_password = 1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
              )
              .bind(passwordData.hash, passwordData.salt, id),
          );
        }
        await db.batch(statements);
        return { ok: true };
      }
      case "grant.create": {
        const staffUserId = Number(body.staffUserId);
        const scope =
          body.scope === "orders_history_write"
            ? "orders_history_write"
            : "reports_history";
        const staff = await db
          .prepare(
            "SELECT id FROM users WHERE id = ? AND role = 'staff' AND is_active = 1",
          )
          .bind(staffUserId)
          .first();
        if (!staff) return json({ error: "Active staff user not found." }, 400);
        const fromDate = textValue(body.fromDate, 10);
        const toDate = textValue(body.toDate, 10);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(toDate) ||
          fromDate > toDate
        ) {
          return json({ error: "Enter a valid permission date range." }, 400);
        }
        await db
          .prepare(
            `INSERT INTO permission_grants
             (staff_user_id, scope, from_date, to_date, granted_by, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            staffUserId,
            scope,
            fromDate,
            toDate,
            admin.id,
            textValue(body.expiresAt, 40) || null,
          )
          .run();
        return { ok: true };
      }
      case "grant.delete": {
        await db
          .prepare("DELETE FROM permission_grants WHERE id = ?")
          .bind(Number(body.id))
          .run();
        return { ok: true };
      }
      default:
        return json({ error: "Unknown admin action." }, 400);
    }
  });
}
