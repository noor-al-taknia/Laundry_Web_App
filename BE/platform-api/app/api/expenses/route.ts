import { getD1 } from "../../../db";
import { requireSession } from "../../../lib/auth";
import {
  daysAgo,
  isIsoDate,
  json,
  money,
  payload,
  requireSameOrigin,
  riyadhDate,
  route,
  textValue,
} from "../../../lib/api";
import { ensureDatabase } from "../../../lib/database";
import { numericId } from "../../../lib/id";
import { notifyAdmins } from "../../../lib/notifications";
import { canReadRange, canWriteExpense } from "../../../lib/permissions";

const selectExpense = `SELECT e.id, e.expense_number AS expenseNumber,
  e.expense_date AS expenseDate, e.category, e.description, e.amount,
  e.payment_method AS paymentMethod, e.vendor,
  e.receipt_reference AS receiptReference, e.notes, e.status, e.version,
  e.created_at AS createdAt, e.updated_at AS updatedAt,
  u.display_name AS createdByName
  FROM expenses e JOIN users u ON u.id = e.created_by`;

export async function GET(request: Request) {
  return route(async () => {
    await ensureDatabase();
    const user = await requireSession(request);
    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? (user.role === "admin" ? daysAgo(30) : daysAgo(2));
    const to = url.searchParams.get("to") ?? riyadhDate();
    if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
      return json({ error: "Invalid expense date range" }, 400);
    }
    if (!(await canReadRange(user, from, to))) {
      return json({ error: "Admin permission is required for older expenses." }, 403);
    }
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 25)));
    const category = textValue(url.searchParams.get("category"), 80);
    const search = textValue(url.searchParams.get("search"), 100);
    const conditions = ["e.expense_date >= ?", "e.expense_date <= ?"];
    const values: Array<string | number> = [from, to];
    if (category) {
      conditions.push("e.category = ?");
      values.push(category);
    }
    if (search) {
      conditions.push("(e.description LIKE ? OR e.vendor LIKE ? OR e.expense_number LIKE ?)");
      const like = `%${search}%`;
      values.push(like, like, like);
    }
    const where = conditions.join(" AND ");
    const db = getD1();
    const [rows, aggregate] = await Promise.all([
      db.prepare(`${selectExpense} WHERE ${where} ORDER BY e.expense_date DESC, e.created_at DESC LIMIT ? OFFSET ?`)
        .bind(...values, pageSize, (page - 1) * pageSize)
        .all(),
      db.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN status = 'posted' THEN amount ELSE 0 END), 0) AS totalAmount FROM expenses e WHERE ${where}`)
        .bind(...values)
        .first<{ total: number; totalAmount: number }>(),
    ]);
    return {
      expenses: rows.results,
      total: Number(aggregate?.total ?? 0),
      totalAmount: Number(aggregate?.totalAmount ?? 0),
      page,
      pageSize,
      from,
      to,
    };
  });
}

export async function POST(request: Request) {
  return route(async () => {
    requireSameOrigin(request);
    await ensureDatabase();
    const user = await requireSession(request);
    const body = await payload<Record<string, unknown>>(request);
    const expenseDate = textValue(body.expenseDate, 10) || riyadhDate();
    const category = textValue(body.category, 80);
    const description = textValue(body.description, 240);
    const amount = money(Number(body.amount));
    if (!isIsoDate(expenseDate) || !category || !description || amount <= 0) {
      return json({ error: "Date, category, description and a positive amount are required." }, 400);
    }
    if (user.role === "staff" && expenseDate !== riyadhDate()) {
      return json({ error: "Staff can add expenses only for today." }, 403);
    }
    const id = numericId();
    const expenseNumber = `EXP-${expenseDate.replaceAll("-", "")}-${String(id).slice(-6)}`;
    await getD1().prepare(
      `INSERT INTO expenses
       (id, expense_number, expense_date, category, description, amount,
        payment_method, vendor, receipt_reference, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      expenseNumber,
      expenseDate,
      category,
      description,
      amount,
      ["card", "bank"].includes(String(body.paymentMethod)) ? body.paymentMethod : "cash",
      textValue(body.vendor, 160),
      textValue(body.receiptReference, 120),
      textValue(body.notes, 500),
      user.id,
    ).run();
    const expense = await getD1().prepare(`${selectExpense} WHERE e.id = ?`).bind(id).first();
    if (user.role === "staff") {
      await notifyAdmins({
        actorUserId: user.id,
        eventType: "expense_created",
        title: `Expense added · ${expenseNumber}`,
        message: `${user.displayName} recorded SAR ${amount.toFixed(2)} for ${category}: ${description}. Payment method: ${String(body.paymentMethod ?? "cash")}.`,
        resourceType: "expense",
        resourceId: id,
      });
    }
    return json({ expense }, 201);
  });
}

export async function PATCH(request: Request) {
  return route(async () => {
    requireSameOrigin(request);
    await ensureDatabase();
    const user = await requireSession(request);
    const body = await payload<Record<string, unknown>>(request);
    const id = Number(body.id);
    const current = await getD1().prepare("SELECT expense_number AS expenseNumber, expense_date AS expenseDate, amount, description, version FROM expenses WHERE id = ?").bind(id).first<{ expenseNumber: string; expenseDate: string; amount: number; description: string; version: number }>();
    if (!current) return json({ error: "Expense not found" }, 404);
    if (!(await canWriteExpense(user, current.expenseDate, id))) {
      return json({ error: "Admin approval is required to edit this historical expense." }, 403);
    }
    const amount = money(Number(body.amount));
    const category = textValue(body.category, 80);
    const description = textValue(body.description, 240);
    if (!category || !description || amount <= 0) {
      return json({ error: "Category, description and a positive amount are required." }, 400);
    }
    const result = await getD1().prepare(
      `UPDATE expenses SET category = ?, description = ?, amount = ?,
       payment_method = ?, vendor = ?, receipt_reference = ?, notes = ?,
       status = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND version = ?`,
    ).bind(
      category,
      description,
      amount,
      ["card", "bank"].includes(String(body.paymentMethod)) ? body.paymentMethod : "cash",
      textValue(body.vendor, 160),
      textValue(body.receiptReference, 120),
      textValue(body.notes, 500),
      user.role === "admin" && body.status === "void" ? "void" : "posted",
      id,
      Number(body.version),
    ).run();
    if (!result.meta.changes) return json({ error: "Expense changed elsewhere. Reload and retry." }, 409);
    const expense = await getD1().prepare(`${selectExpense} WHERE e.id = ?`).bind(id).first();
    if (user.role === "staff") {
      await notifyAdmins({
        actorUserId: user.id,
        eventType: "expense_updated",
        title: `Expense updated · ${current.expenseNumber}`,
        message: `${user.displayName} changed ${current.description} (SAR ${Number(current.amount).toFixed(2)}) to ${description} (SAR ${amount.toFixed(2)}).`,
        resourceType: "expense",
        resourceId: id,
      });
    }
    return { expense };
  });
}
