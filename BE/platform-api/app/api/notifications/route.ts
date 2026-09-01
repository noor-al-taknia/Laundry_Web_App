import { getD1 } from "../../../db";
import { requireSession } from "../../../lib/auth";
import { json, payload, requireSameOrigin, route } from "../../../lib/api";
import { ensureDatabase } from "../../../lib/database";

export async function GET(request: Request) {
  return route(async () => {
    await ensureDatabase();
    const admin = await requireSession(request, "admin");
    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 30)));
    const rows = await getD1().prepare(
      `SELECT n.id, n.actor_user_id AS actorUserId, actor.display_name AS actorName,
              n.event_type AS eventType, n.title, n.message,
              n.resource_type AS resourceType, n.resource_id AS resourceId,
              n.is_read AS isRead, n.read_at AS readAt, n.created_at AS createdAt
       FROM admin_notifications n
       JOIN users actor ON actor.id = n.actor_user_id
       WHERE n.recipient_user_id = ?
       ORDER BY n.is_read ASC, n.created_at DESC
       LIMIT ?`,
    ).bind(admin.id, limit).all<{ isRead: number }>();
    const unread = await getD1().prepare(
      "SELECT COUNT(*) AS count FROM admin_notifications WHERE recipient_user_id = ? AND is_read = 0",
    ).bind(admin.id).first<{ count: number }>();
    return {
      notifications: rows.results.map((item) => ({ ...item, isRead: Boolean(item.isRead) })),
      unreadCount: Number(unread?.count ?? 0),
    };
  });
}

export async function PATCH(request: Request) {
  return route(async () => {
    requireSameOrigin(request);
    await ensureDatabase();
    const admin = await requireSession(request, "admin");
    const body = await payload<{ id?: number; all?: boolean }>(request);
    if (body.all) {
      await getD1().prepare(
        `UPDATE admin_notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP
         WHERE recipient_user_id = ? AND is_read = 0`,
      ).bind(admin.id).run();
      return { ok: true };
    }
    const id = Number(body.id ?? 0);
    if (!id) return json({ error: "Notification is required." }, 400);
    const result = await getD1().prepare(
      `UPDATE admin_notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE id = ? AND recipient_user_id = ?`,
    ).bind(id, admin.id).run();
    if (!result.meta.changes) return json({ error: "Notification not found." }, 404);
    return { ok: true };
  });
}
