import { getD1 } from "../db";

type AdminNotificationInput = {
  actorUserId: number;
  eventType: string;
  title: string;
  message: string;
  resourceType?: "order" | "expense" | "permission" | "password_request";
  resourceId?: string | number;
};

export async function notifyAdmins(input: AdminNotificationInput) {
  await getD1().prepare(
    `INSERT INTO admin_notifications
     (recipient_user_id, actor_user_id, event_type, title, message, resource_type, resource_id)
     SELECT id, ?, ?, ?, ?, ?, ?
     FROM users
     WHERE role = 'admin' AND is_active = 1 AND id <> ?`,
  ).bind(
    input.actorUserId,
    input.eventType.slice(0, 60),
    input.title.slice(0, 160),
    input.message.slice(0, 500),
    input.resourceType ?? "",
    String(input.resourceId ?? "").slice(0, 80),
    input.actorUserId,
  ).run();
}
