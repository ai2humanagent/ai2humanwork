import { NextResponse } from "next/server";
import { getAuthContext } from "../../lib/auth";
import { readDb, updateDb, type Notification } from "../../lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const walletParam = url.searchParams.get("wallet")?.toLowerCase();

  // If wallet param provided, return notifications for that wallet (public badge API)
  if (walletParam) {
    const db = await readDb();
    // Find user by wallet address
    const user = db.users.find(
      (u) => (u.walletAddress || "").toLowerCase() === walletParam
    );
    if (!user) {
      return NextResponse.json({ notifications: [], wallet: walletParam });
    }
    const notifications = db.notifications
      .filter((n) => n.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ notifications });
  }

  // Otherwise require auth
  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = await readDb();
  const notifications = db.notifications
    .filter((n) => n.userId === auth.user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ notifications });
}

export async function PATCH(request: Request) {
  const url = new URL(request.url);
  const walletParam = url.searchParams.get("wallet")?.toLowerCase();

  let userId: string | null = null;

  if (walletParam) {
    // Wallet-based auth for PATCH (mark as read)
    const db = await readDb();
    const user = db.users.find(
      (u) => (u.walletAddress || "").toLowerCase() === walletParam
    );
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    userId = user.id;
  } else {
    const auth = await getAuthContext(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    userId = auth.user.id;
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id || "").trim();
  const markAllRead = body.markAllRead === true;

  if (!id && !markAllRead) {
    return NextResponse.json({ error: "Notification id or markAllRead required." }, { status: 400 });
  }

  let updated: Notification[] = [];

  await updateDb((db) => {
    if (markAllRead) {
      db.notifications = db.notifications.map((n) =>
        n.userId === userId ? { ...n, read: true } : n
      );
      updated = db.notifications.filter((n) => n.userId === userId);
      return;
    }

    const notification = db.notifications.find((n) => n.id === id && n.userId === userId);
    if (!notification) return;
    notification.read = true;
    updated = [notification];
  });

  return NextResponse.json({ updated });
}

export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const taskId = String(body.taskId || "").trim();
  const title = String(body.title || "").trim();
  const type = String(body.type || "system").trim() as Notification["type"];
  const bodyText = String(body.body || "").trim();

  if (!title || !bodyText) {
    return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const notification: Notification = {
    id: `notif_${crypto.randomUUID().slice(0, 12)}`,
    userId: auth.user.id,
    type,
    title,
    body: bodyText,
    taskId: taskId || undefined,
    read: false,
    createdAt: now
  };

  await updateDb((db) => {
    db.notifications.unshift(notification);
  });

  return NextResponse.json({ notification }, { status: 201 });
}
