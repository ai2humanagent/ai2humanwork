"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import Link from "next/link";
import styles from "./profile.module.css";

type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
  humanId?: string;
  walletAddress?: string;
  authProvider?: string;
  xAccount?: {
    subject: string;
    username: string;
    name?: string;
    profilePictureUrl?: string;
  };
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
  avatarUrl?: string;
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
  if (String(email || "").endsWith("@privy.local")) return "";
  const local = String(email || "").split("@")[0].trim();
  return local || "Your name";
}

function getSuggestedName(payload: AuthPayload, walletAddress?: string) {
  if (payload.human?.name) return payload.human.name;
  if (payload.user.xAccount?.name) return payload.user.xAccount.name;
  if (payload.user.xAccount?.username) return `@${payload.user.xAccount.username}`;
  return getFallbackName(payload.user.email) || shortAddress(walletAddress || payload.user.walletAddress);
}

function getDisplayEmail(email?: string) {
  if (!email) return "";
  return email.endsWith("@privy.local") ? "Wallet login" : email;
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value?: string[]) {
  return (value || []).join(", ");
}

function priceLabel(service: ServiceSummary) {
  return `$${service.price}${service.pricing === "hourly" ? "/hr" : ""}`;
}

function getXOAuthStatusMessage(code: string) {
  const messages: Record<string, string> = {
    connect_wallet_first: "Connect your wallet first, then bind your X account.",
    x_oauth_not_configured: "X login is not configured yet.",
    invalid_x_oauth_state: "The X login window expired. Please try again.",
    session_changed: "Your wallet session changed. Please reconnect and try again.",
    x_account_already_bound: "This X account is already bound to another wallet. Use the original wallet or bind a different X account.",
    x_api_not_enrolled: "X login worked, but this X Developer Project cannot access user profile data. Enable X API v2 access or upgrade the Project plan.",
    x_oauth_failed: "X login failed. Please try again."
  };
  return messages[code] || "Unable to connect X account.";
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

async function resizeAvatarFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Choose an image under 5 MB.");
  }

  const dataUrl = await fileToDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image."));
    img.src = dataUrl;
  });

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare image.");
  }

  const scale = Math.max(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (size - width) / 2;
  const y = (size - height) / 2;
  context.drawImage(image, x, y, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function ProfilePage() {
  const { ready, authenticated, login, logout, getAccessToken, user } = usePrivy();
  const { wallets } = useWallets();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<AuthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkingX, setLinkingX] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [hourlyRate, setHourlyRate] = useState("30");
  const [avatarUrl, setAvatarUrl] = useState("");

  const connectedWallet =
    wallets.find((wallet) => wallet.walletClientType !== "privy" && wallet.address)?.address ||
    user?.wallet?.address ||
    wallets.find((wallet) => wallet.address)?.address ||
    undefined;

  const loadProfile = useCallback(async () => {
    if (!ready) return;
    if (!authenticated) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    async function fetchProfile() {
      return fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "same-origin"
      });
    }

    let response = await fetchProfile();

    try {
      const accessToken = await getAccessToken();
      if (accessToken) {
        await fetch("/api/auth/privy/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ accessToken, walletAddress: connectedWallet })
        });
        response = await fetchProfile();
      }
    } catch {
      // Fall through to the normal error path below.
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error || "Unable to load your profile.");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as AuthPayload;

    setProfile(payload);
    setName(getSuggestedName(payload, connectedWallet));
    setEmail(getDisplayEmail(payload.user.email));
    setRole(payload.human?.role || "");
    setLocation(payload.human?.location || "");
    setSkills(joinList(payload.human?.skills));
    setLanguages(joinList(payload.human?.languages));
    setHourlyRate(String(payload.human?.hourlyRate || 30));
    setAvatarUrl(payload.human?.avatarUrl || "");
    setLoading(false);
  }, [authenticated, connectedWallet, getAccessToken, ready]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const linked = url.searchParams.get("x_linked");
    const xError = url.searchParams.get("x_error");
    if (!linked && !xError) return;

    setLinkingX(false);
    if (linked) {
      setMessage("X account linked.");
      loadProfile();
    }
    if (xError) {
      setError(getXOAuthStatusMessage(xError));
    }

    url.searchParams.delete("x_linked");
    url.searchParams.delete("x_error");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [loadProfile]);

  async function saveProfile() {
    if (!profile?.user) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        name: name.trim(),
        role: role.trim(),
        location: location.trim(),
        hourlyRate: Number(hourlyRate) || 30,
        skills: splitList(skills),
        languages: splitList(languages),
        avatarUrl
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
      } & Partial<HumanProfile>;

      if (!response.ok) {
        throw new Error(result.error || "Unable to save your profile.");
      }

      const nextHuman = result.human || (result.id ? (result as HumanProfile) : profile.human);
      setProfile((current) =>
        current
          ? {
              ...current,
              human: nextHuman || null
            }
          : current
      );
      setMessage(profile.human ? "Profile updated." : "Profile created.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarFile(file?: File) {
    if (!file) return;
    setError("");
    setMessage("");
    try {
      setAvatarUrl(await resizeAvatarFile(file));
      setMessage("Photo added. Save your profile to keep it.");
    } catch (avatarError) {
      setError(avatarError instanceof Error ? avatarError.message : "Unable to use this image.");
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  if (!ready || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingPanel}>Loading your profile...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.authPanel}>
          <div className={styles.authMark}>a2h</div>
          <div className={styles.profileInfo}>
            <h1>Connect your wallet</h1>
            <p>Sign in to save your profile, connect X, complete tasks, and receive rewards.</p>
          </div>
          <button className={styles.saveBtn} type="button" onClick={() => login()}>
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  const human = profile?.human;
  const walletAddress = connectedWallet || profile?.user.walletAddress;
  const serviceCount = profile?.services.length || 0;
  const skillCount = splitList(skills).length;
  const xAccount = profile?.user.xAccount;
  const avatarSrc = avatarUrl || xAccount?.profilePictureUrl || "/icon.png";
  const displayName = name.trim() || xAccount?.name || (xAccount?.username ? `@${xAccount.username}` : shortAddress(walletAddress));
  const displayRole = role.trim() || (xAccount?.username ? `@${xAccount.username}` : "Tell people what you do");
  const readinessItems = [
    { label: "Basic info", ready: Boolean(name.trim() && role.trim()) },
    { label: "X connected", ready: Boolean(xAccount?.username) },
    { label: "Where you can help", ready: Boolean(location.trim() && skillCount > 0) },
    { label: "Wallet", ready: Boolean(walletAddress) },
    { label: "Task types", ready: serviceCount > 0 }
  ];
  const readyCount = readinessItems.filter((item) => item.ready).length;
  const readiness = Math.round((readyCount / readinessItems.length) * 100);
  const dispatchReady = readinessItems.slice(0, 3).every((item) => item.ready);

  return (
    <div className={styles.page}>
      <header className={styles.profileHeader}>
        <div>
          <p className={styles.eyebrow}>Profile</p>
          <h1>Your profile</h1>
          <p className={styles.headerCopy}>
            Set up who you are, connect your X account, and choose the kinds of tasks you can do.
            Completed tasks are checked before rewards are paid.
          </p>
        </div>
        <button className={styles.disconnectBtn} type="button" onClick={() => logout()}>
          Disconnect
        </button>
      </header>

      {error && <div className={styles.alertError}>{error}</div>}
      {message && <div className={styles.alertSuccess}>{message}</div>}

      <div className={styles.readinessBand}>
        <div className={styles.readinessMain}>
          <span className={dispatchReady ? styles.statusLive : styles.statusSetup}>
            {dispatchReady ? "Ready to take tasks" : "Finish setup"}
          </span>
          <strong>{readiness}% setup complete</strong>
        </div>
        <div className={styles.loop}>
          <span>Pick a task</span>
          <span>Submit proof</span>
          <span>We check it</span>
          <span>Reward paid</span>
        </div>
      </div>

      <div className={styles.profileGrid}>
        <aside className={styles.operatorPanel}>
          <div className={styles.operatorTop}>
            <div className={styles.avatarWrap}>
              <img className={styles.avatar} src={avatarSrc} alt="" />
            </div>
            <div>
              <h2>{displayName}</h2>
              <p>{displayRole}</p>
            </div>
          </div>

          <div className={styles.avatarActions}>
            <input
              ref={avatarInputRef}
              className={styles.avatarInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => handleAvatarFile(event.target.files?.[0])}
              aria-label="Upload profile photo"
            />
            <button
              className={`${styles.secondaryBtn} ${styles.avatarBtn}`}
              type="button"
              onClick={() => avatarInputRef.current?.click()}
            >
              Upload photo
            </button>
            {avatarUrl && (
              <button
                className={`${styles.secondaryBtn} ${styles.avatarBtn}`}
                type="button"
                onClick={() => {
                  setAvatarUrl("");
                  setMessage("Photo removed. Save your profile to keep the change.");
                }}
              >
                Remove
              </button>
            )}
          </div>

          <div className={styles.metricGrid}>
            <div>
              <span>Rating</span>
              <strong>{human ? human.rating.toFixed(1) : "New"}</strong>
            </div>
            <div>
              <span>Tasks</span>
              <strong>{human?.completedJobs || 0}</strong>
            </div>
            <div>
              <span>Task types</span>
              <strong>{serviceCount}</strong>
            </div>
            <div>
              <span>Expected rate</span>
              <strong>{`$${Number(hourlyRate) || 30}/hr`}</strong>
            </div>
          </div>

          <div className={styles.checkList}>
            {readinessItems.map((item) => (
              <div key={item.label} className={styles.checkRow}>
                <span className={item.ready ? styles.checkReady : styles.checkMissing} />
                <span>{item.label}</span>
                <strong>{item.ready ? "Ready" : "Missing"}</strong>
              </div>
            ))}
          </div>

          <div className={styles.walletBox}>
            <span>Reward wallet</span>
            <strong>{shortAddress(walletAddress)}</strong>
          </div>

          <div className={styles.walletBox}>
            <span>X account</span>
            <strong>{xAccount?.username ? `@${xAccount.username}` : "Not connected"}</strong>
            {xAccount?.name && <small>{xAccount.name}</small>}
            <button
              className={styles.secondaryBtn}
              type="button"
              onClick={async () => {
                setMessage("");
                setError("");
                try {
                  if (xAccount?.username) {
                    await loadProfile();
                    setMessage("X account status refreshed.");
                  } else {
                    setLinkingX(true);
                    const params = new URLSearchParams();
                    if (walletAddress) params.set("wallet", walletAddress);
                    window.location.assign(`/api/auth/x/start?${params.toString()}`);
                  }
                } catch (linkError) {
                  setLinkingX(false);
                  setError(linkError instanceof Error ? linkError.message : "Unable to open X login.");
                }
              }}
              disabled={linkingX}
            >
              {linkingX ? "Opening X..." : xAccount?.username ? "Refresh X" : "Connect X"}
            </button>
          </div>
        </aside>

        <section className={styles.formPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>About you</h2>
              <p>This helps task creators understand who is doing the work.</p>
            </div>
            <span>{human?.verified ? "Verified" : "Unverified"}</span>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Name</label>
              <input
                className={styles.input}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={xAccount?.name || "Your name"}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>What do you do?</label>
              <input
                className={styles.input}
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="Growth helper, community checker, wallet tester"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Where can you help?</label>
              <input
                className={styles.input}
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Austin, TX or Remote"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Expected hourly rate</label>
              <input
                className={styles.input}
                inputMode="decimal"
                value={hourlyRate}
                onChange={(event) => setHourlyRate(event.target.value)}
                placeholder="30"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tasks you can do</label>
            <textarea
              className={styles.textarea}
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
              placeholder="Follow on X, retweet, photo proof, local checks, wallet testing"
            />
            <p className={styles.helpText}>Use commas to separate each task type.</p>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Languages</label>
              <input
                className={styles.input}
                value={languages}
                onChange={(event) => setLanguages(event.target.value)}
                placeholder="English, Mandarin"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Login</label>
              <input className={styles.input} value={email || shortAddress(walletAddress)} readOnly />
            </div>
          </div>

          <button className={styles.saveBtn} type="button" onClick={saveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>
        </section>
      </div>

      <section className={styles.servicesPanel}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Task types</h2>
            <p>Add the kinds of work you are willing to accept.</p>
          </div>
          <Link className={styles.secondaryBtn} href="/app/services">
            Manage task types
          </Link>
        </div>

        {profile?.services.length ? (
          <div className={styles.serviceList}>
            {profile.services.slice(0, 3).map((service) => (
              <div className={styles.serviceItem} key={service.id}>
                <div>
                  <span>{service.category}</span>
                  <strong>{service.title}</strong>
                  <p>{service.shortDescription}</p>
                </div>
                <b>{priceLabel(service)}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyServices}>
            <strong>No task types added yet</strong>
            <p>Add at least one task type so people know what work they can send you.</p>
          </div>
        )}
      </section>
    </div>
  );
}
