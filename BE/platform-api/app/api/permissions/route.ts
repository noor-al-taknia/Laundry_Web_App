import { getD1 } from "../../../db";
import { requireSession } from "../../../lib/auth";
import { json, payload, requireSameOrigin, route, textValue } from "../../../lib/api";
import { ensureDatabase } from "../../../lib/database";
import { numericId } from "../../../lib/id";

const requestSelect = `SELECT p.id, p.staff_user_id AS staffUserId,
  u.display_name AS staffName, p.task, p.resource_type AS resourceType,
  p.resource_id AS resourceId, p.reason, p.status,
  reviewer.display_name AS reviewedByName, p.reviewed_at AS reviewedAt,
  p.expires_at AS expiresAt, p.created_at AS createdAt
  FROM permission_requests p
  JOIN users u ON u.id = p.staff_user_id
  LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by`;

export async function GET(request: Request) {
  return route(async () => {
    await ensureDatabase();
    const user = await requireSession(request);
    const where = user.role === "admin" ? "" : "WHERE p.staff_user_id = ?";
    const statement = getD1().prepare(
      `${requestSelect} ${where}
       ORDER BY CASE p.status WHEN 'pending' THEN 0 ELSE 1 END, p.created_at DESC
       LIMIT 250`,
    );
    const rows = user.role === "admin"
      ? await statement.all()
      : await statement.bind(user.id).all();
    return { requests: rows.results };
  });
}
export async function POST(request: Request) {
  return route(async () => {
    requireSameOrigin(request);
    await ensureDatabase();
    const user = await requireSession(request);
    if (user.role !== "staff") return json({ error: "Only staff need task approval." }, 400);
    const body = await payload<Record<string, unknown>>(request);
    const task = textValue(body.task, 40);
    const resourceType = textValue(body.resourceType, 40);
    const resourceId = textValue(body.resourceId, 80);
    const allowed =
      (task === "collection_read" && resourceType === "collection_date" && /^\d{4}-\d{2}-\d{2}$/.test(resourceId)) ||
      (task === "order_update" && resourceType === "order" && /^\d+$/.test(resourceId)) ||
      (task === "expense_update" && resourceType === "expense" && /^\d+$/.test(resourceId));
    if (!allowed) return json({ error: "Invalid task permission request." }, 400);
    const existing = await getD1().prepare(
      `SELECT id, status FROM permission_requests
       WHERE staff_user_id = ? AND task = ? AND resource_type = ? AND resource_id = ?
         AND status IN ('pending','approved') ORDER BY created_at DESC LIMIT 1`,
    ).bind(user.id, task, resourceType, resourceId).first<{ id: number; status: string }>();
    if (existing) return { ok: true, id: existing.id, status: existing.status };
    const id = numericId();
    await getD1().prepare(
      `INSERT INTO permission_requests
       (id, staff_user_id, task, resource_type, resource_id, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(id, user.id, task, resourceType, resourceId, textValue(body.reason, 300)).run();
    return json({ ok: true, id, status: "pending" }, 201);
  });
}

export async function PATCH(request: Request) {
  return route(async () => {
    requireSameOrigin(request);
    await ensureDatabase();
    const admin = await requireSession(request, "admin");
    const body = await payload<Record<string, unknown>>(request);
    const id = Number(body.id);
    const status = body.status === "approved" ? "approved" : body.status === "denied" ? "denied" : body.status === "revoked" ? "revoked" : "";
    if (!id || !status) return json({ error: "Request and decision are required." }, 400);
    const expiresAt = status === "approved"
      ? textValue(body.expiresAt, 40) || new Date(Date.now() + 24 * 60 * 60_000).toISOString()
      : null;
    const result = await getD1().prepare(
      `UPDATE permission_requests SET status = ?, reviewed_by = ?,
       reviewed_at = CURRENT_TIMESTAMP, expires_at = ? WHERE id = ?`,
    ).bind(status, admin.id, expiresAt, id).run();
    if (!result.meta.changes) return json({ error: "Permission request not found." }, 404);
    return { ok: true };
  });
}
