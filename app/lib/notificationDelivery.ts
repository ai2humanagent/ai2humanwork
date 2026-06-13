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
    const href = `https://ai2human.work${notification.taskId ? `/tasks/${notification.taskId}` : "/app/notifications"}`;
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
        text: buildNotificationText({
          title: notification.title,
          body: notification.body,
          href
        }),
        html: renderNotificationEmailHtml({
          title: notification.title,
          body: notification.body,
          href,
          reason
        })
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

function buildNotificationText(input: {
  title: string;
  body: string;
  href: string;
}) {
  return [
    input.title,
    "",
    input.body,
    "",
    `Open AI2Human: ${input.href}`,
    "",
    "AI2Human",
    "The execution network for AI workflows"
  ].join("\n");
}

function renderNotificationEmailHtml(input: {
  title: string;
  body: string;
  href: string;
  reason: NotificationReason;
}) {
  const eyebrow =
    input.reason === "task"
      ? "AI2Human task alert"
      : input.reason === "reward"
        ? "AI2Human payout update"
        : "AI2Human network update";
  const buttonLabel =
    input.reason === "task"
      ? "Open task"
      : input.reason === "reward"
        ? "View payout"
        : "Open AI2Human";
  const summaryLines = input.body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  return `
  <div style="margin:0;padding:32px 16px;background:#060816;background-image:radial-gradient(circle at top left, rgba(84,255,216,0.16), transparent 28%),radial-gradient(circle at top right, rgba(131,103,255,0.18), transparent 34%),linear-gradient(180deg,#070b14 0%,#060816 100%);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#edf2ff;">
    <div style="max-width:640px;margin:0 auto;border:1px solid rgba(165,180,252,0.16);background:rgba(10,16,30,0.92);border-radius:24px;overflow:hidden;box-shadow:0 20px 80px rgba(0,0,0,0.45);">
      <div style="padding:24px 28px;border-bottom:1px solid rgba(165,180,252,0.12);background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0));">
        <div style="display:inline-flex;align-items:center;gap:10px;padding:8px 12px;border-radius:999px;background:rgba(92,245,216,0.08);border:1px solid rgba(92,245,216,0.16);font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#7ef7df;">
          ${escapeHtml(eyebrow)}
        </div>
        <h1 style="margin:20px 0 10px;font-size:34px;line-height:1.02;font-weight:700;color:#f8fbff;">${escapeHtml(input.title)}</h1>
        <p style="margin:0;font-size:16px;line-height:1.7;color:rgba(232,238,255,0.78);">A structured task, proof, verification, and settlement loop for AI workflows.</p>
      </div>

      <div style="padding:28px;">
        <div style="padding:20px;border-radius:20px;background:linear-gradient(180deg,rgba(110,123,255,0.12),rgba(110,123,255,0.04));border:1px solid rgba(146,160,255,0.14);">
          <div style="display:grid;gap:12px;">
            ${summaryLines
              .map(
                (line) => `
                <div style="display:flex;gap:12px;align-items:flex-start;">
                  <div style="width:8px;height:8px;margin-top:9px;border-radius:999px;background:linear-gradient(135deg,#64f5dd,#8d7aff);flex:0 0 auto;"></div>
                  <div style="font-size:15px;line-height:1.7;color:#eef2ff;">${escapeHtml(line)}</div>
                </div>`
              )
              .join("")}
          </div>
        </div>

        <div style="margin-top:24px;">
          <a href="${escapeHtml(input.href)}" style="display:inline-block;padding:14px 20px;border-radius:14px;background:linear-gradient(90deg,#68f5de 0%,#7b72ff 100%);color:#041019;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 12px 30px rgba(104,245,222,0.22);">
            ${escapeHtml(buttonLabel)}
          </a>
        </div>

        <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(165,180,252,0.12);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div>
            <div style="font-size:13px;font-weight:700;color:#ffffff;">AI2Human</div>
            <div style="margin-top:6px;font-size:13px;line-height:1.6;color:rgba(232,238,255,0.58);">The execution network for AI workflows</div>
          </div>
          <div style="font-size:12px;line-height:1.7;color:rgba(232,238,255,0.48);text-align:right;">
            task → human execution → proof → verify → settle
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
