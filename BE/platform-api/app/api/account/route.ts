import { getD1 } from "../../../db";
import { createSessionToken, requireSession, sessionCookie } from "../../../lib/auth";
import { json, payload, requireSameOrigin, route } from "../../../lib/api";
import { hashPassword, verifyPassword } from "../../../lib/crypto";

export async function PATCH(request: Request) {
  return route(async () => {
    requireSameOrigin(request);
    const user = await requireSession(request);
    const body = await payload<{
      currentPassword?: string;
      newPassword?: string;
    }>(request);
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");
    if (newPassword.length < 8) {
      return json(
        { error: "New password must be at least 8 characters." },
        400,
      );
    }
    const db = getD1();
    const row = await db
      .prepare(
        "SELECT password_hash AS hash, password_salt AS salt FROM users WHERE id = ?",
      )
      .bind(user.id)
      .first<{ hash: string; salt: string }>();
    if (
      !row ||
      !(await verifyPassword(currentPassword, row.salt, row.hash))
    ) {
      return json({ error: "Current password is incorrect." }, 400);
    }
    const next = await hashPassword(newPassword);
    await db
      .prepare(
        `UPDATE users SET password_hash = ?, password_salt = ?,
         must_change_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .bind(next.hash, next.salt, user.id)
      .run();
    const nextUser = { ...user, mustChangePassword: false };
    const token = await createSessionToken(nextUser);
    return json(
      { user: nextUser },
      200,
      { "set-cookie": sessionCookie(token, request) },
    );
  });
}
