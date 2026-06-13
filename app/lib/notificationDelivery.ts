import crypto from "crypto";
import type { Db, Notification, NotificationType, UserAccount } from "./store";
import { getUserContactEmail, hasUsableContactEmail } from "./operatorAccess";

export type NotificationReason = "task" | "reward" | "system";

export type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  taskId?: string;
  createdAt?: string;
};

export function createNotification(input: NotificationInput): Notification {
  return {
    id: `notif_${crypto.randomUUID().slice(0, 12)}`,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    taskId: input.taskId,
    read: false,
    createdAt: input.createdAt || new Date().toISOString()
  };
}

export function addNotification(db: Db, input: NotificationInput): Notification {
  const notification = createNotification(input);
  if (!Array.isArray(db.notifications)) {
    db.notifications = [];
  }
  db.notifications.unshift(notification);
  return notification;
}

export function canSendEmailNotification(user: UserAccount | null, reason: NotificationReason) {
  if (!user || !hasUsableContactEmail(user)) return false;
  if (reason === "task" && user.notificationPreferences?.emailTaskAlerts === false) return false;
  if (reason === "reward" && user.notificationPreferences?.emailRewardAlerts === false) return false;
  return true;
}

export async function sendEmailNotification(input: {
  user: UserAccount | null;
  notification: Notification;
  reason: NotificationReason;
}) {
  const { user, notification, reason } = input;
  if (!canSendEmailNotification(user, reason)) return { skipped: true, reason: "user_not_emailable" };

  const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY || "";
  const from = process.env.EMAIL_FROM || process.env.NOTIFICATION_EMAIL_FROM || "";
  if (!apiKey || !from) return { skipped: true, reason: "email_not_configured" };
  const to = getUserContactEmail(user);
  if (!to) return { skipped: true, reason: "user_not_emailable" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to,
        subject: notification.title,
        text: `${notification.body}\n\nOpen AI2Human: https://ai2human.work${notification.taskId ? `/tasks/${notification.taskId}` : "/app/notifications"}`,
        html: `<p>${escapeHtml(notification.body)}</p><p><a href="https://ai2human.work${notification.taskId ? `/tasks/${notification.taskId}` : "/app/notifications"}">Open AI2Human</a></p>`
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn("[EmailNotification] send_failed", {
        userId: user!.id,
        status: response.status,
        body: body.slice(0, 300)
      });
      return { skipped: false, ok: false, status: response.status };
    }
    return { skipped: false, ok: true };
  } catch (error) {
    console.warn("[EmailNotification] send_error", {
      userId: user!.id,
      error: error instanceof Error ? error.message : "unknown"
    });
    return { skipped: false, ok: false };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
