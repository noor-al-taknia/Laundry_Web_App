/* eslint-disable import/no-anonymous-default-export */
type Env = { DB: D1Database };
export default { async fetch(request: Request, env: Env) {
  const url = new URL(request.url);
  if (url.pathname === "/health") return Response.json({ service: "identity-service", status: "ok" });
  if (url.pathname === "/ready") { await env.DB.prepare("SELECT 1").first(); return Response.json({ ready: true }); }
  return Response.json({ error: "Route not found" }, { status: 404 });
} };
