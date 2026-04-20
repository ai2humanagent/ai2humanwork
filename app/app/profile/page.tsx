"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import styles from "./profile.module.css";
import authStyles from "./auth.module.css";
import { DEFAULT_SETTLEMENT_TOKEN_SYMBOL } from "../../lib/assetLabels.js";

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

function splitList(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

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
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [hourlyRate, setHourlyRate] = useState("30");
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");

  const connectedWallet =
    wallets.find((wallet) => wallet.walletClientType === "privy" && wallet.address)?.address ||
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
      setCity(payload.human?.city || "");
      setCountry(payload.human?.country || "");
      setHourlyRate(String(payload.human?.hourlyRate || 30));
      setSkills((payload.human?.skills || []).join(", "));
      setLanguages((payload.human?.languages || []).join(", "));
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
        city: city.trim(),
        country: country.trim(),
        hourlyRate: Number(hourlyRate || 0),
        skills: splitList(skills),
        languages: splitList(languages)
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
      <div className={authStyles.stage}>
        <div className={authStyles.center}>
          <p className={authStyles.eyebrow}>Operator identity</p>
          <div className={authStyles.heading}>
            <h2>Connect your Privy wallet</h2>
            <p>
              Sign in with Privy so ai2human can use your connected wallet as the payout address
              when you complete fallback tasks.
            </p>
          </div>

          <div className={authStyles.panel}>
            <button className={authStyles.googleButton} type="button" onClick={() => login()}>
              Connect wallet with Privy
            </button>
            <div className={authStyles.divider} />
            <ul className={authStyles.featureList}>
              <li>Your connected wallet becomes your payout destination.</li>
              <li>Reviewer can assign you directly from the operator list.</li>
              <li>Settlement follows proof and verification on the configured chain.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.headerCard}>
        <div>
          <p className={styles.kicker}>Privy operator profile</p>
          <h1>{profile?.human ? "Manage payout-ready identity" : "Create your operator identity"}</h1>
          <p>
            Your Privy wallet is used as the payout destination for reviewer-approved fallback
            work. Update your profile once, then reviewers can dispatch tasks to you directly.
          </p>
        </div>
        <button className={styles.disconnectButton} type="button" onClick={() => logout()}>
          Disconnect
        </button>
      </section>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span>Privy wallet</span>
          <strong>{shortAddress(connectedWallet || profile?.user.walletAddress)}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span>Wallet address</span>
          <strong>{connectedWallet || profile?.user.walletAddress || "Connect wallet first"}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span>Profile status</span>
          <strong>{profile?.human ? "Payout-ready" : "Missing operator profile"}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span>Services</span>
          <strong>{profile?.services.length || 0}</strong>
        </article>
      </section>

      {!walletsReady && (
        <div className={styles.alertInfo}>Privy wallet state is still syncing.</div>
      )}

      {error && <div className={styles.alertError}>{error}</div>}
      {message && <div className={styles.alertInfo}>{message}</div>}

      <section className={styles.formsGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Operator profile</h2>
              <p className={styles.panelHint}>
                Reviewers use this profile plus your connected wallet to route and settle tasks.
              </p>
            </div>
            <span>{profile?.human?.verified ? "Verified" : "Payout identity"}</span>
          </div>

          <div className={styles.form}>
            <label className={styles.label}>
              Name
              <input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <div className={styles.row2}>
              <label className={styles.label}>
                City
                <input className={styles.input} value={city} onChange={(event) => setCity(event.target.value)} />
              </label>
              <label className={styles.label}>
                Country
                <input className={styles.input} value={country} onChange={(event) => setCountry(event.target.value)} />
              </label>
            </div>

            <label className={styles.label}>
              {`Hourly rate (${DEFAULT_SETTLEMENT_TOKEN_SYMBOL})`}
              <input
                className={styles.input}
                type="number"
                min="1"
                value={hourlyRate}
                onChange={(event) => setHourlyRate(event.target.value)}
              />
            </label>

            <label className={styles.label}>
              Skills
              <textarea
                className={styles.textarea}
                value={skills}
                onChange={(event) => setSkills(event.target.value)}
                placeholder="onsite verification, signed receipt capture, pickup handoff"
              />
            </label>

            <label className={styles.label}>
              Languages
              <input
                className={styles.input}
                value={languages}
                onChange={(event) => setLanguages(event.target.value)}
                placeholder="English, Chinese"
              />
            </label>

            <button className={styles.primaryButton} type="button" onClick={saveProfile} disabled={saving}>
              {saving ? "Saving..." : profile?.human ? "Update profile" : "Create profile"}
            </button>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Payout routing</h2>
              <p className={styles.panelHint}>
                This is the exact wallet ai2human will use when your completed task is settled.
              </p>
            </div>
            <span>{connectedWallet || profile?.user.walletAddress ? "Connected" : "Missing"}</span>
          </div>

          <div className={styles.empty}>
            <p>
              Connected wallet:{" "}
              <strong>{connectedWallet || profile?.user.walletAddress || "No wallet connected"}</strong>
            </p>
            <p>
              Session source: <strong>{profile?.user.authProvider || "privy"}</strong>
            </p>
            <p>
              Reviewer assignment will use this wallet automatically once your operator profile is
              selected from the human list.
            </p>
          </div>

          {!!profile?.services.length && (
            <div className={styles.serviceGrid}>
              {profile.services.map((service) => (
                <article key={service.id} className={styles.serviceCard}>
                  <div className={styles.serviceHead}>
                    <div>
                      <h3>{service.title}</h3>
                      <p className={styles.serviceMeta}>{service.shortDescription}</p>
                    </div>
                    <span>{service.category}</span>
                  </div>
                  <p className={styles.serviceMeta}>
                    {service.pricing === "hourly" ? `${service.price}/hr` : `${service.price} fixed`}
                  </p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
