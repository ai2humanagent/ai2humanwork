"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import Link from "next/link";
import styles from "./notifications.module.css";

type Notification = {
  id: string;
  userId: string;
  type: "task_assigned" | "task_reminder" | "task_completed" | "system";
  title: string;
  body: string;
  taskId?: string;
  read: boolean;
  createdAt: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notifIcon(type: Notification["type"]) {
  if (type === "task_assigned") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
  if (type === "task_completed") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function NotificationsPage() {
  const { ready, user } = usePrivy();
  const { wallets } = useWallets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const connectedWallet =
    wallets.find((wallet) => wallet.walletClientType !== "privy" && wallet.address)?.address ||
    user?.wallet?.address ||
    wallets.find((wallet) => wallet.address)?.address ||
    undefined;

  useEffect(() => {
    if (!connectedWallet) return;

    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/notifications?wallet=${connectedWallet}`,
          { cache: "no-store" }
        );
        if (cancelled) return;
        const data = (await res.json().catch(() => ({ notifications: [] as Notification[] }))) as {
          notifications?: Notification[];
        };
        setNotifications(data.notifications || []);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Failed to load notifications.");
          setLoading(false);
        }
      }
    }

    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [connectedWallet]);

  async function markAllRead() {
    if (!connectedWallet) return;
    try {
      await fetch(
        `/api/notifications?wallet=${connectedWallet}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markAllRead: true }),
          cache: "no-store"
        }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silently fail
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!ready || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingPanel}>Loading notifications...</div>
      </div>
    );
  }

  if (!connectedWallet) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyPanel}>
          <h2>Sign in to view notifications</h2>
          <p>Connect your wallet to see your task notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Notifications</h1>
          {unreadCount > 0 && (
            <p className={styles.unreadCount}>{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </header>

      {error && <div className={styles.alertError}>{error}</div>}

      {notifications.length === 0 ? (
        <div className={styles.emptyPanel}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <h2>No notifications yet</h2>
          <p>Complete your profile to receive your first task assignment.</p>
          <Link href="/app/profile" className={styles.profileLink}>Go to Profile</Link>
        </div>
      ) : (
        <div className={styles.notifList}>
          {notifications.map((notif) => (
            <div key={notif.id} className={`${styles.notifCard} ${notif.read ? styles.read : styles.unread}`}>
              <div className={styles.notifIcon}>{notifIcon(notif.type)}</div>
              <div className={styles.notifContent}>
                <div className={styles.notifTitle}>{notif.title}</div>
                <div className={styles.notifBody}>{notif.body}</div>
                <div className={styles.notifTime}>{timeAgo(notif.createdAt)}</div>
              </div>
              {notif.taskId && (
                <button
                  className={styles.viewTaskBtn}
                  onClick={async () => {
                    // Mark as read before navigating
                    if (!notif.read && connectedWallet) {
                      try {
                        await fetch(
                          `/api/notifications?wallet=${connectedWallet}`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: notif.id }),
                            cache: "no-store"
                          }
                        );
                        setNotifications((prev) =>
                          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                        );
                      } catch {}
                    }
                    window.location.href = `/tasks/${notif.taskId}`;
                  }}
                >
                  View Task
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
