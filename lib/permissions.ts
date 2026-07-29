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
  return hasGrant(user.id, "reports_history", fromDate, toDate);
}

export async function canWriteOrderDate(
  user: SessionUser,
  orderDate: string,
) {
  if (user.role === "admin" || orderDate === riyadhDate()) return true;
  return hasGrant(
    user.id,
    "orders_history_write",
    orderDate,
    orderDate,
  );
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
