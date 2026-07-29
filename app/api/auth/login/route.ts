import { getD1 } from "../../../../db";
import {
  createSessionToken,
  sessionCookie,
  type SessionUser,
} from "../../../../lib/auth";
import {
  json,
  payload,
  requireSameOrigin,
  route,
  textValue,
} from "../../../../lib/api";
import { verifyPassword } from "../../../../lib/crypto";
import { ensureDatabase } from "../../../../lib/database";

export async function POST(request: Request) {
  return route(async () => {
    requireSameOrigin(request);
    await ensureDatabase();
    const body = await payload<{ username?: string; password?: string }>(request);
    const username = textValue(body.username, 80).toLowerCase();
    const password = String(body.password ?? "");
    if (!username || !password) {
      return json({ error: "Username and password are required" }, 400);
    }

    const user = await getD1()
      .prepare(
        `SELECT id, username, display_name AS displayName, role,
                password_hash AS passwordHash, password_salt AS passwordSalt,
                must_change_password AS mustChangePassword
         FROM users WHERE username = ? AND is_active = 1`,
      )
      .bind(username)
      .first<
        SessionUser & {
          passwordHash: string;
          passwordSalt: string;
        }
      >();
    const valid =
      user &&
      (await verifyPassword(password, user.passwordSalt, user.passwordHash));
    if (!valid || !user) {
      return json({ error: "Invalid username or password" }, 401);
    }

    const session: SessionUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      mustChangePassword: Boolean(user.mustChangePassword),
    };
    const token = await createSessionToken(session);
    return json(
      { user: session },
      200,
      { "set-cookie": sessionCookie(token, request) },
    );
  });
}
