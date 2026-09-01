import { getD1 } from "../../../db";
import { requireSession } from "../../../lib/auth";
import { json, payload, requireSameOrigin, route, textValue } from "../../../lib/api";
import { hashPassword } from "../../../lib/crypto";
import { ensureDatabase } from "../../../lib/database";
import { numericId } from "../../../lib/id";
import { notifyAdmins } from "../../../lib/notifications";

export async function GET(request: Request) {
  return route(async () => {
    await ensureDatabase();
    await requireSession(request, "admin");
    const rows = await getD1().prepare(
      `SELECT r.id, r.user_id AS userId, u.username, u.display_name AS displayName,
              r.status, r.requested_at AS requestedAt, r.completed_at AS completedAt
       FROM password_reset_requests r JOIN users u ON u.id = r.user_id
       ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.requested_at DESC
       LIMIT 100`,
    ).all();
    return { requests: rows.results };
  });
}

export async function POST(request: Request) {
  return route(async () => {
    requireSameOrigin(request);
    await ensureDatabase();
    const body = await payload<Record<string, unknown>>(request);
    const username = textValue(body.username, 80).toLowerCase();
    if (username) {
      const user = await getD1().prepare(
        "SELECT id, display_name AS displayName, role FROM users WHERE username = ? AND is_active = 1",
      ).bind(username).first<{ id: number; displayName: string; role: string }>();
      if (user?.role === "staff") {
        const pending = await getD1().prepare(
          "SELECT id FROM password_reset_requests WHERE user_id = ? AND status = 'pending' LIMIT 1",
        ).bind(user.id).first();
        if (!pending) {
          const requestId = numericId();
          await getD1().prepare(
            "INSERT INTO password_reset_requests (id, user_id) VALUES (?, ?)",
          ).bind(requestId, user.id).run();
          await notifyAdmins({
            actorUserId: user.id,
            eventType: "password_reset_requested",
            title: "Staff password reset requested",
            message: `${user.displayName} requested a new Office portal password. Review the request in Approval inbox.`,
            resourceType: "password_request",
            resourceId: requestId,
          });
        }
      }
    }
    return { ok: true, message: "If this is an active staff account, the administrator will receive the password request." };
  });
}

export async function PATCH(request: Request) {
  return route(async () => {
    requireSameOrigin(request);
    await ensureDatabase();
    const admin = await requireSession(request, "admin");
    const body = await payload<Record<string, unknown>>(request);
    const id = Number(body.id);
    const requestRow = await getD1().prepare(
      `SELECT r.id, r.user_id AS userId, r.status, u.role
       FROM password_reset_requests r JOIN users u ON u.id = r.user_id
       WHERE r.id = ?`,
    ).bind(id).first<{ id: number; userId: number; status: string; role: string }>();
    if (!requestRow || requestRow.role !== "staff" || requestRow.status !== "pending") {
      return json({ error: "Pending staff reset request not found." }, 404);
    }
    if (body.status === "denied") {
      await getD1().prepare(
        "UPDATE password_reset_requests SET status = 'denied', completed_by = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).bind(admin.id, id).run();
      return { ok: true };
    }
    const password = String(body.password ?? "");
    if (password.length < 8) return json({ error: "Temporary password must be at least 8 characters." }, 400);
    const passwordData = await hashPassword(password);
    await getD1().batch([
      getD1().prepare(
        `UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 1,
         updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).bind(passwordData.hash, passwordData.salt, requestRow.userId),
      getD1().prepare(
        `UPDATE password_reset_requests SET status = 'completed', completed_by = ?,
         completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).bind(admin.id, id),
    ]);
    return { ok: true };
  });
}
