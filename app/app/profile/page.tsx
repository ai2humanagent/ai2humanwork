"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import styles from "./profile.module.css";

type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
  humanId?: string;
  walletAddress?: string;
  authProvider?: string;
};

type HumanProfile = {
  id: string;
  name: string;
  handle: string;
  role: string;
  location: string;
  city: string;
  country: string;
  verified: boolean;
  rating: number;
  completedJobs: number;
  hourlyRate: number;
  skills: string[];
  languages: string[];
};

type ServiceSummary = {
  id: string;
  title: string;
  shortDescription: string;
  category: string;
  price: number;
  pricing: "fixed" | "hourly";
};

type AuthPayload = {
  user: SessionUser;
  human: HumanProfile | null;
  services: ServiceSummary[];
};

function shortAddress(address?: string) {
  if (!address) return "No wallet connected";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getFallbackName(email?: string) {
  const local = String(email || "").split("@")[0].trim();
  return local || "Operator";
}

export default function ProfilePage() {
  const { ready, authenticated, login, logout, getAccessToken, user } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const [profile, setProfile] = useState<AuthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");

  const connectedWallet =
    wallets.find((wallet) => wallet.walletClientType !== "privy" && wallet.address)?.address ||
    user?.wallet?.address ||
    wallets.find((wallet) => wallet.address)?.address ||
    undefined;

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError("");

      async function fetchProfile() {
        return fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "same-origin"
        });
      }

      let response = await fetchProfile();

      if (response.status === 401) {
        try {
          const accessToken = await getAccessToken();
          if (accessToken) {
            await fetch("/api/auth/privy/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accessToken })
            });
            response = await fetchProfile();
          }
        } catch {
          // Fall through to the normal error path below.
        }
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!cancelled) {
          setError(payload.error || "Unable to load operator profile.");
          setLoading(false);
        }
        return;
      }

      const payload = (await response.json()) as AuthPayload;
      if (cancelled) return;

      setProfile(payload);
      setName(payload.human?.name || getFallbackName(payload.user.email));
      setEmail(payload.user.email || "");
      setRole(payload.human?.role || "");
      setLocation(payload.human?.location || "");
      setLoading(false);
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [authenticated, getAccessToken, ready]);

  async function saveProfile() {
    if (!profile?.user) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        name: name.trim(),
        role: role.trim(),
        location: location.trim()
      };

      const endpoint = profile.human ? `/api/humans/${profile.human.id}` : "/api/humans";
      const method = profile.human ? "PUT" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        human?: HumanProfile;
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to save operator profile.");
      }

      const nextHuman = result.human || profile.human;
      setProfile((current) =>
        current
          ? {
              ...current,
              human: nextHuman || null
            }
          : current
      );
      setMessage(profile.human ? "Operator profile updated." : "Operator profile created.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save operator profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingPanel}>Loading operator identity...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.profileCard}>
          <div className={styles.profileInfo}>
            <h1>Connect your wallet</h1>
            <p>Sign in to claim tasks and receive onchain settlements.</p>
          </div>
          <button className={styles.saveBtn} type="button" onClick={() => login()}>
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.profileHeader}>
        <img className={styles.avatar} src="/icon.png" alt="" />
        <div className={styles.profileInfo}>
          <h1>Edit Profile</h1>
          <p>{profile?.human?.verified ? "Verified operator" : "Set up your identity"}</p>
        </div>
        <button className={styles.disconnectBtn} type="button" onClick={() => logout()}>
          Disconnect
        </button>
      </header>

      {error && <div className={styles.alertError}>{error}</div>}
      {message && <div className={styles.alertSuccess}>{message}</div>}

      <div className={styles.profileCard}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Display Name</label>
          <input
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Role</label>
          <input
            className={styles.input}
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="e.g. Growth Operator, Field Agent"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Location</label>
          <input
            className={styles.input}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g. Austin, TX"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Email</label>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Wallet Address</label>
          <input
            className={styles.input}
            value={shortAddress(connectedWallet || profile?.user.walletAddress)}
            readOnly
          />
        </div>

        <button className={styles.saveBtn} type="button" onClick={saveProfile} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
