import { getD1, getJwtSecret } from "../db";
import {
  decodeBase64Url,
  encodeBase64Url,
  signHmac,
  verifyHmac,
} from "./crypto";
import { ensureDatabase } from "./database";

export type Role = "admin" | "staff";

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
};

type JwtPayload = SessionUser & {
  iat: number;
  exp: number;
};

export const SESSION_COOKIE = "laundry_session";
const SESSION_SECONDS = 8 * 60 * 60;

export async function createSessionToken(user: SessionUser) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  );
  const payload = encodeBase64Url(
    JSON.stringify({ ...user, iat: now, exp: now + SESSION_SECONDS }),
  );
  const body = `${header}.${payload}`;
  const signature = await signHmac(body, getJwtSecret());
  return `${body}.${signature}`;
}

export async function verifySessionToken(token: string) {
  const [header, payload, signature, extra] = token.split(".");
  if (!header || !payload || !signature || extra) return null;
  const valid = await verifyHmac(
    `${header}.${payload}`,
    signature,
    getJwtSecret(),
  );
  if (!valid) return null;
  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as JwtPayload;
    if (
      parsed.exp <= Math.floor(Date.now() / 1000) ||
      !["admin", "staff"].includes(parsed.role)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  const match = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export async function getSession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  return token ? verifySessionToken(token) : null;
}

export async function requireSession(request: Request, role?: Role) {
  const session = await getSession(request);
  if (!session) {
    throw new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  await ensureDatabase();
  const current = await getD1()
    .prepare(
      `SELECT id, username, display_name AS displayName, role,
              must_change_password AS mustChangePassword
       FROM users WHERE id = ? AND is_active = 1`,
    )
    .bind(session.id)
    .first<SessionUser>();
  if (!current) {
    throw new Response(JSON.stringify({ error: "Session is no longer active" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const activeSession = {
    ...current,
    mustChangePassword: Boolean(current.mustChangePassword),
  };
  if (role && activeSession.role !== role) {
    throw new Response(JSON.stringify({ error: "Permission denied" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return activeSession;
}

export function sessionCookie(token: string, request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${SESSION_SECONDS}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}
