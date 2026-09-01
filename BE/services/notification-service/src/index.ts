/* eslint-disable import/no-anonymous-default-export */
type Env = { DB: D1Database };

function claims(request: Request) {
  return {
    tenantId: request.headers.get("x-tenant-id") ?? "",
    userId: request.headers.get("x-user-id") ?? "",
    role: request.headers.get("x-portal-role") ?? "",
  };
}

export default { async fetch(request: Request, env: Env) {
  const url = new URL(request.url);
  if (url.pathname === "/health") return Response.json({ service: "notification-service", status: "ok" });
  if (url.pathname === "/ready") { await env.DB.prepare("SELECT 1").first(); return Response.json({ ready: true }); }
  const identity = claims(request);
  if (!identity.tenantId || !identity.userId || !["admin", "super_admin"].includes(identity.role)) {
    return Response.json({ error: "Admin gateway claims required" }, { status: 403 });
  }
  if (url.pathname === "/v1/notifications" && request.method === "GET") {
    const rows = await env.DB.prepare(
      `SELECT * FROM notifications WHERE tenant_id = ? AND recipient_user_id = ?
       ORDER BY is_read ASC, created_at DESC LIMIT 100`,
    ).bind(identity.tenantId, identity.userId).all();
    return Response.json({ notifications: rows.results });
  }
  if (url.pathname === "/v1/notifications/read" && request.method === "PATCH") {
    const body = await request.json<{ id?: string; all?: boolean }>();
    const statement = body.all
      ? env.DB.prepare("UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE tenant_id = ? AND recipient_user_id = ? AND is_read = 0").bind(identity.tenantId, identity.userId)
      : env.DB.prepare("UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ? AND recipient_user_id = ?").bind(body.id ?? "", identity.tenantId, identity.userId);
    await statement.run();
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Route not found" }, { status: 404 });
} };
