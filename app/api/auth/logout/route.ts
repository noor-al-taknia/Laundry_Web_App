import { clearSessionCookie } from "../../../../lib/auth";
import { json, requireSameOrigin } from "../../../../lib/api";

export async function POST(request: Request) {
  requireSameOrigin(request);
  return json(
    { ok: true },
    200,
    { "set-cookie": clearSessionCookie(request) },
  );
}
