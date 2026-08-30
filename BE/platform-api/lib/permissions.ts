import { getD1 } from "../db";
import type { SessionUser } from "./auth";
import { daysAgo, riyadhDate } from "./api";

export async function canReadRange(
  user: SessionUser,
  fromDate: string,
  toDate: string,
) {
  if (user.role === "admin") return true;
  if (fromDate >= daysAgo(2) && toDate <= riyadhDate()) return true;
  if (fromDate === toDate && (await hasTaskApproval(user.id, "collection_read", "collection_date", fromDate))) return true;
  return hasGrant(user.id, "reports_history", fromDate, toDate);
}

export async function canWriteOrderDate(
  user: SessionUser,
  orderDate: string,
  orderId?: number,
) {
  if (user.role === "admin" || orderDate === riyadhDate()) return true;
  if (orderId && (await hasTaskApproval(user.id, "order_update", "order", String(orderId)))) return true;
  return hasGrant(
    user.id,
    "orders_history_write",
    orderDate,
    orderDate,
  );
}

export async function canWriteExpense(
  user: SessionUser,
  expenseDate: string,
  expenseId: number,
) {
  if (user.role === "admin" || expenseDate === riyadhDate()) return true;
  return hasTaskApproval(user.id, "expense_update", "expense", String(expenseId));
}

async function hasTaskApproval(
  userId: number,
  task: "collection_read" | "order_update" | "expense_update",
  resourceType: "collection_date" | "order" | "expense",
  resourceId: string,
) {
  const row = await getD1()
    .prepare(
      `SELECT id FROM permission_requests
       WHERE staff_user_id = ? AND task = ? AND resource_type = ?
         AND resource_id = ? AND status = 'approved'
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       LIMIT 1`,
    )
    .bind(userId, task, resourceType, resourceId)
    .first();
  return Boolean(row);
}

async function hasGrant(
  userId: number,
  scope: "reports_history" | "orders_history_write",
  fromDate: string,
  toDate: string,
) {
  const row = await getD1()
    .prepare(
      `SELECT id FROM permission_grants
       WHERE staff_user_id = ? AND scope = ?
         AND from_date <= ? AND to_date >= ?
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       LIMIT 1`,
    )
    .bind(userId, scope, fromDate, toDate)
    .first();
  return Boolean(row);
}
