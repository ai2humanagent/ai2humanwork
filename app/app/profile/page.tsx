"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFundWallet, usePrivy, useSigners, useWallets } from "@privy-io/react-auth";
import Link from "next/link";
import { base } from "viem/chains";
import { refreshPrivyServerSession } from "../../lib/clientPrivySession";
import styles from "./profile.module.css";

const privySignerId = process.env.NEXT_PUBLIC_PRIVY_SIGNER_ID || "";
const privyPolicyId = process.env.NEXT_PUBLIC_PRIVY_POLICY_ID || "";

type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
  humanId?: string;
  walletAddress?: string;
  authProvider?: string;
  contactEmail?: string;
  notificationPreferences?: {
    emailTaskAlerts?: boolean;
    emailRewardAlerts?: boolean;
  };
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

type XRequest = {
  id: string;
  title: string;
  budget: string;
  deadline: string;
  state: string;
  createdAt: string;
  updatedAt: string;
};

type XWalletSnapshot = {
  ready: boolean;
  address: string;
  usdcBalance: string;
  a2hBalance: string;
  nativeBalance: string;
  delegated: boolean;
  automationConfigured: boolean;
  network: string;
  chainId: number;
  tokenSymbol: string;
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

function getSuggestedContactEmail(email?: string) {
  if (!email || email.endsWith("@privy.local")) return "";
  return email;
}

function isUsableContactEmail(email?: string) {
  const value = String(email || "").trim().toLowerCase();
  if (!value || value.endsWith("@privy.local")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

function xRequestStateLabel(state: string) {
  const labels: Record<string, string> = {
    draft: "Ready",
    awaiting_funding: "Needs funding",
    live: "Live",
    in_progress: "Live",
    proof_review: "Proof ready",
    revision_required: "Action required",
    verified: "Proof ready",
    settlement_submitted: "Proof ready",
    settled: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
    refund_pending: "Refund pending",
    partially_refunded: "Partially refunded",
    refunded: "Refunded",
    disputed: "Disputed",
    needs_review: "Needs review"
  };
  return labels[state] || "Needs review";
}

function formatXRequestDeadline(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value || "TBD";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function ProfileSkeleton() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.profileHeader}>
        <div>
          <p className={styles.eyebrow}>Profile</p>
          <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
          <div className={`${styles.skeletonLine} ${styles.skeletonCopy}`} />
        </div>
        <div className={`${styles.skeletonLine} ${styles.skeletonButton}`} />
      </header>

      <div className={styles.loadingStatus}>
        <span className={styles.spinner} />
        <strong>Loading your profile</strong>
        <span>Fetching wallet, email, X binding, and task readiness.</span>
      </div>

      <div className={styles.readinessBand}>
        <div className={styles.readinessMain}>
          <div className={`${styles.skeletonLine} ${styles.skeletonPill}`} />
          <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
        </div>
        <div className={styles.loop}>
          <span>Pick a task</span>
          <span>Submit proof</span>
          <span>We check it</span>
          <span>Reward paid</span>
        </div>
      </div>

      <section className={styles.identityPanel}>
        {["Contact email", "X account"].map((label) => (
          <div className={styles.identityCard} key={label}>
            <div className={styles.identityHeader}>
              <span className={styles.identityMissing}>Loading</span>
              <div>
                <h2>{label}</h2>
                <p>
                  <span className={styles.inlineSpinner}><span className={styles.spinner} /></span>
                  Checking saved details...
                </p>
              </div>
            </div>
            <div className={`${styles.skeletonLine} ${styles.skeletonInput}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonButtonWide}`} />
          </div>
        ))}
      </section>

      <div className={styles.profileGrid}>
        <aside className={styles.operatorPanel}>
          <div className={styles.operatorTop}>
            <div className={`${styles.avatarWrap} ${styles.skeletonAvatar}`} />
            <div className={styles.profileInfo}>
              <div className={`${styles.skeletonLine} ${styles.skeletonName}`} />
              <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
            </div>
          </div>
          <div className={styles.metricGrid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index}>
                <span><span className={styles.spinner} /></span>
                <strong><span className={`${styles.skeletonLine} ${styles.skeletonMetric}`} /></strong>
              </div>
            ))}
          </div>
          <div className={styles.checkList}>
            {Array.from({ length: 5 }).map((_, index) => (
              <div className={styles.checkRow} key={index}>
                <span className={styles.checkMissing} />
                <span><span className={`${styles.skeletonLine} ${styles.skeletonCheck}`} /></span>
                <strong>...</strong>
              </div>
            ))}
          </div>
        </aside>

        <section className={styles.formPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>About you</h2>
              <p>Loading saved profile fields...</p>
            </div>
            <span><span className={styles.spinner} /></span>
          </div>
          <div className={styles.formGrid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div className={styles.field} key={index}>
                <div className={`${styles.skeletonLine} ${styles.skeletonLabel}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonInput}`} />
              </div>
            ))}
          </div>
          <div className={`${styles.skeletonLine} ${styles.skeletonTextarea}`} />
          <div className={`${styles.skeletonLine} ${styles.skeletonButtonWide}`} />
        </section>
      </div>
    </div>
  );
}

function getXOAuthStatusMessage(code: string) {
  const messages: Record<string, string> = {
    connect_wallet_first: "Sign in first, then bind your X account.",
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
  const { fundWallet } = useFundWallet();
  const { addSigners } = useSigners();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const profileLoadRef = useRef<Promise<void> | null>(null);
  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  const [profile, setProfile] = useState<AuthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkingX, setLinkingX] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [xRequests, setXRequests] = useState<XRequest[]>([]);
  const [xRequestsLoading, setXRequestsLoading] = useState(false);
  const [xWallet, setXWallet] = useState<XWalletSnapshot | null>(null);
  const [xWalletLoading, setXWalletLoading] = useState(false);
  const [fundingWallet, setFundingWallet] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAsset, setWithdrawAsset] = useState<"eth" | "a2h" | "usdc">("a2h");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<{
    txHash?: string;
    explorerUrl?: string;
    amount?: string;
    asset?: string;
  } | null>(null);
  const [enablingAutomation, setEnablingAutomation] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [emailTaskAlerts, setEmailTaskAlerts] = useState(true);
  const [emailRewardAlerts, setEmailRewardAlerts] = useState(true);
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [hourlyRate, setHourlyRate] = useState("30");
  const [avatarUrl, setAvatarUrl] = useState("");

  const connectedWallet =
    wallets.find((wallet) => wallet.walletClientType === "privy" && wallet.address)?.address ||
    (user?.wallet?.walletClientType === "privy" ? user.wallet.address : undefined) ||
    wallets.find((wallet) => wallet.address)?.address ||
    undefined;

  const loadXWallet = useCallback(async () => {
    setXWalletLoading(true);
    try {
      const response = await fetch("/api/x-wallet", { cache: "no-store", credentials: "same-origin" });
      const payload = (await response.json().catch(() => ({}))) as { wallet?: XWalletSnapshot };
      setXWallet(response.ok && payload.wallet ? payload.wallet : null);
    } catch {
      setXWallet(null);
    } finally {
      setXWalletLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    if (profileLoadRef.current) return profileLoadRef.current;
    const request = (async () => {
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
    if (response.status === 401) {
      try {
        const accessToken = await getAccessTokenRef.current();
        if (accessToken) {
          const syncResponse = await fetch("/api/auth/privy/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(
              connectedWallet
                ? { accessToken, embeddedWalletAddress: connectedWallet }
                : { accessToken }
            )
          });
          if (syncResponse.ok) response = await fetchProfile();
        }
      } catch {
        // The error response below provides the canonical session recovery message.
      }
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error || "Unable to load your profile.");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as AuthPayload;

    setError("");
    setProfile(payload);
    setName(getSuggestedName(payload, connectedWallet));
    setEmail(getDisplayEmail(payload.user.email));
    setContactEmail(payload.user.contactEmail || getSuggestedContactEmail(payload.user.email));
    setEmailTaskAlerts(payload.user.notificationPreferences?.emailTaskAlerts !== false);
    setEmailRewardAlerts(payload.user.notificationPreferences?.emailRewardAlerts !== false);
    setRole(payload.human?.role || "");
    setLocation(payload.human?.location || "");
    setSkills(joinList(payload.human?.skills));
    setLanguages(joinList(payload.human?.languages));
    setHourlyRate(String(payload.human?.hourlyRate || 30));
    setAvatarUrl(payload.human?.avatarUrl || "");
    setLoading(false);
    void loadXWallet();
    setXRequestsLoading(true);
    try {
      const xTasksResponse = await fetch("/api/x-tasks/mine", {
        cache: "no-store",
        credentials: "same-origin"
      });
      const xTasksPayload = (await xTasksResponse.json().catch(() => ({}))) as {
        tasks?: XRequest[];
      };
      setXRequests(xTasksResponse.ok && Array.isArray(xTasksPayload.tasks) ? xTasksPayload.tasks : []);
    } catch {
      setXRequests([]);
    } finally {
      setXRequestsLoading(false);
    }
    })();
    profileLoadRef.current = request;
    try {
      await request;
    } finally {
      profileLoadRef.current = null;
    }
  }, [authenticated, connectedWallet, loadXWallet, ready]);

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
        contactEmail: contactEmail.trim(),
        notificationPreferences: {
          emailTaskAlerts,
          emailRewardAlerts
        },
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
              user: {
                ...current.user,
                contactEmail: contactEmail.trim(),
                notificationPreferences: {
                  emailTaskAlerts,
                  emailRewardAlerts
                }
              },
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

  async function connectOrRefreshX() {
    setMessage("");
    setError("");
    try {
      if (profile?.user.xAccount?.username) {
        await loadProfile();
        setMessage("X account status refreshed.");
      } else {
        setLinkingX(true);
        const sessionReady = await refreshPrivyServerSession({
          authenticated,
          getAccessToken
        });
        if (!sessionReady) {
          throw new Error("Your session expired. Sign in again, then connect X.");
        }
        window.location.assign("/api/auth/x/start");
      }
    } catch (linkError) {
      setLinkingX(false);
      setError(linkError instanceof Error ? linkError.message : "Unable to open X login.");
    }
  }

  async function copyRewardWallet(address?: string) {
    if (!address) return;
    setError("");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = address;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedWallet(true);
      setMessage("Reward wallet address copied.");
      window.setTimeout(() => setCopiedWallet(false), 1800);
    } catch {
      setError("Unable to copy wallet address. Long press or select the address manually.");
    }
  }

  async function fundRequesterWallet() {
    if (!xWallet?.address) return;
    setFundingWallet(true);
    setError("");
    setMessage("");
    try {
      await fundWallet({
        address: xWallet.address,
        options: { chain: base, amount: "5", asset: "USDC" }
      });
      setMessage("Funding submitted. Balance can take a few moments to update.");
      await loadXWallet();
    } catch (fundError) {
      setError(fundError instanceof Error ? fundError.message : "Unable to open wallet funding.");
    } finally {
      setFundingWallet(false);
    }
  }

  async function submitWithdraw() {
    setError("");
    setMessage("");
    setWithdrawResult(null);
    if (!withdrawAddress.trim() || !withdrawAmount.trim()) {
      setError("Enter a withdrawal address and amount.");
      return;
    }
    setWithdrawing(true);
    try {
      const response = await fetch("/api/x-wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          asset: withdrawAsset,
          recipient: withdrawAddress.trim(),
          amount: withdrawAmount.trim()
        })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
        txHash?: string;
        explorerUrl?: string;
        amount?: string;
        asset?: string;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Withdrawal failed.");
      }
      setWithdrawResult({
        txHash: payload.txHash,
        explorerUrl: payload.explorerUrl,
        amount: payload.amount,
        asset: payload.asset
      });
      setMessage(`Withdrawal submitted. ${payload.amount || ""} ${String(payload.asset || "").toUpperCase()} sent to your address.`);
      setWithdrawAddress("");
      setWithdrawAmount("");
      setWithdrawOpen(false);
      await loadXWallet();
    } catch (withdrawError) {
      setError(withdrawError instanceof Error ? withdrawError.message : "Withdrawal failed.");
    } finally {
      setWithdrawing(false);
    }
  }

  async function enableXAutomation() {
    if (!xWallet?.address || !privySignerId || !privyPolicyId) return;
    setEnablingAutomation(true);
    setError("");
    setMessage("");
    try {
      await addSigners({
        address: xWallet.address,
        signers: [{ signerId: privySignerId, policyIds: [privyPolicyId] }]
      });
      setMessage("AI2Human task funding enabled for this embedded wallet.");
      await loadXWallet();
    } catch (automationError) {
      setError(automationError instanceof Error ? automationError.message : "Unable to enable task funding.");
    } finally {
      setEnablingAutomation(false);
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
    return <ProfileSkeleton />;
  }

  if (!authenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.authPanel}>
          <div className={styles.authMark}>a2h</div>
          <div className={styles.profileInfo}>
            <h1>Sign in to AI2Human</h1>
            <p>Continue with X, email, or a wallet. Your AI2Human embedded wallet is created automatically.</p>
          </div>
          <button className={styles.saveBtn} type="button" onClick={() => login()}>
            Continue
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
  const hasContactEmail = isUsableContactEmail(contactEmail) || isUsableContactEmail(profile?.user.email);
  const readinessItems = [
    { label: "Basic info", ready: Boolean(name.trim() && role.trim()) },
    { label: "X connected", ready: Boolean(xAccount?.username) },
    { label: "Contact email", ready: hasContactEmail },
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
            Set up who you are, add a contact email, connect your X account, and choose the kinds of tasks you can do.
            Email and X binding are required before task rewards can be paid.
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

      <section className={styles.identityPanel}>
        <div className={styles.identityCard}>
          <div className={styles.identityHeader}>
            <span className={hasContactEmail ? styles.identityReady : styles.identityMissing}>
              {hasContactEmail ? "Ready" : "Required"}
            </span>
            <div>
              <h2>Contact email</h2>
              <p>Used for task alerts, winner notices, and payout updates. Not shown publicly.</p>
            </div>
          </div>
          <input
            className={styles.input}
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <div className={styles.identityToggles}>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={emailTaskAlerts}
                onChange={(event) => setEmailTaskAlerts(event.target.checked)}
              />
              <span>New task alerts</span>
            </label>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={emailRewardAlerts}
                onChange={(event) => setEmailRewardAlerts(event.target.checked)}
              />
              <span>Winner and payout updates</span>
            </label>
          </div>
          <button className={styles.saveBtn} type="button" onClick={saveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save email"}
          </button>
        </div>

        <div className={styles.identityCard}>
          <div className={styles.identityHeader}>
            <span className={xAccount?.username ? styles.identityReady : styles.identityMissing}>
              {xAccount?.username ? "Connected" : "Required for rewards"}
            </span>
            <div>
              <h2>X account</h2>
              <p>Required for normal tasks and reward campaigns. Test article contests only require email.</p>
            </div>
          </div>
          <div className={styles.xAccountPreview}>
            <strong>{xAccount?.username ? `@${xAccount.username}` : "Not connected"}</strong>
            {xAccount?.name && <span>{xAccount.name}</span>}
          </div>
          <button
            className={styles.saveBtn}
            type="button"
            onClick={connectOrRefreshX}
            disabled={linkingX}
          >
            {linkingX ? "Opening X..." : xAccount?.username ? "Refresh X account" : "Connect X account"}
          </button>
          {!xAccount?.username && (
            <details className={styles.xOAuthHelp}>
              <summary>X says “Something went wrong”?</summary>
              <p>Sign in to the intended X account in this browser, then retry. If AI2Human is already authorized, revoke it once and reconnect.</p>
              <div className={styles.xOAuthHelpLinks}>
                <a href="https://x.com/login" target="_blank" rel="noreferrer">Sign in to X</a>
                <a href="https://x.com/settings/connected_apps" target="_blank" rel="noreferrer">Connected apps</a>
              </div>
            </details>
          )}
        </div>

        <div className={styles.identityCard}>
          <div className={styles.identityHeader}>
            <span className={xWallet?.ready ? styles.identityReady : styles.identityMissing}>
              {xWallet?.ready ? "Created" : "Creating"}
            </span>
            <div>
              <h2>AI2Human wallet</h2>
              <p>Your Privy embedded wallet funds X tasks. USDC is used first; A2H can cover the equivalent task budget.</p>
            </div>
          </div>
          {xWalletLoading ? (
            <div className={styles.loadingStatus}><span className={styles.spinner} /><strong>Loading wallet</strong></div>
          ) : xWallet?.ready ? (
            <>
              <div className={styles.xAccountPreview}>
                <strong>{Number(xWallet.usdcBalance).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC</strong>
                <span>{Number(xWallet.a2hBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} A2H · {shortAddress(xWallet.address)} · Base</span>
              </div>
              <div className={styles.identityToggles}>
                <button className={styles.saveBtn} type="button" onClick={fundRequesterWallet} disabled={fundingWallet}>
                  {fundingWallet ? "Opening..." : "Fund wallet"}
                </button>
                <button className={styles.saveBtn} type="button" onClick={() => { setWithdrawOpen((open) => !open); setWithdrawResult(null); }} disabled={withdrawing}>
                  {withdrawOpen ? "Close withdraw" : "Withdraw"}
                </button>
                <button className={styles.saveBtn} type="button" onClick={() => copyRewardWallet(xWallet.address)}>
                  {copiedWallet ? "Copied" : "Copy address"}
                </button>
              </div>
              {withdrawOpen ? (
                <div className={styles.withdrawPanel}>
                  <strong>Withdraw from AI2Human wallet</strong>
                  <p>Send ETH, A2H, or USDC from your embedded wallet to an external address on Base.</p>
                  <div className={styles.withdrawRow}>
                    <select
                      className={styles.withdrawInput}
                      value={withdrawAsset}
                      onChange={(event) => setWithdrawAsset(event.target.value as "eth" | "a2h" | "usdc")}
                      aria-label="Asset to withdraw"
                    >
                      <option value="a2h">A2H</option>
                      <option value="eth">ETH</option>
                      <option value="usdc">USDC</option>
                    </select>
                    <input
                      className={styles.withdrawInput}
                      type="text"
                      placeholder="0x recipient address"
                      value={withdrawAddress}
                      onChange={(event) => setWithdrawAddress(event.target.value)}
                    />
                  </div>
                  <div className={styles.withdrawRow}>
                    <input
                      className={styles.withdrawInput}
                      type="text"
                      inputMode="decimal"
                      placeholder="Amount"
                      value={withdrawAmount}
                      onChange={(event) => setWithdrawAmount(event.target.value)}
                    />
                    <button className={styles.saveBtn} type="button" onClick={() => void submitWithdraw()} disabled={withdrawing}>
                      {withdrawing ? "Withdrawing..." : "Submit withdrawal"}
                    </button>
                  </div>
                  {withdrawResult?.txHash ? (
                    <p className={styles.withdrawReceipt}>
                      {withdrawResult.amount} {String(withdrawResult.asset || "").toUpperCase()} withdrawn.{" "}
                      <a href={withdrawResult.explorerUrl} target="_blank" rel="noreferrer">View on Basescan</a>
                    </p>
                  ) : null}
                </div>
              ) : null}
              {xWallet.automationConfigured && !xWallet.delegated ? (
                <button className={styles.saveBtn} type="button" onClick={enableXAutomation} disabled={enablingAutomation}>
                  {enablingAutomation ? "Enabling..." : "Enable task funding"}
                </button>
              ) : xWallet.delegated ? (
                <p>Automation enabled. AI2Human can use policy-approved USDC or equivalent A2H for task funding.</p>
              ) : (
                <p>Wallet funding is ready. X automation policy is being configured.</p>
              )}
            </>
          ) : (
            <p>Sign out and sign in again to finish creating your embedded wallet.</p>
          )}
        </div>
      </section>

      <section className={styles.xRequestsPanel}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>My X requests</h2>
            <p>Tasks created from your connected X account, from draft through proof-gated settlement.</p>
          </div>
          <span>{xRequests.length} requests</span>
        </div>

        {!xAccount?.username ? (
          <div className={styles.emptyServices}>
            <strong>Connect X to recover your requests</strong>
            <p>Once connected, drafts created by that X account appear here automatically.</p>
          </div>
        ) : xRequestsLoading ? (
          <div className={styles.loadingStatus}>
            <span className={styles.spinner} />
            <strong>Loading X requests</strong>
          </div>
        ) : xRequests.length ? (
          <div className={styles.xRequestList}>
            {xRequests.map((request) => (
              <Link className={styles.xRequestCard} href={`/tasks/${request.id}`} key={request.id}>
                <div>
                  <span className={styles.xRequestState}>{xRequestStateLabel(request.state)}</span>
                  <h3>{request.title}</h3>
                  <small>{request.id}</small>
                </div>
                <dl>
                  <div><dt>Budget</dt><dd>{request.budget}</dd></div>
                  <div><dt>Deadline</dt><dd>{formatXRequestDeadline(request.deadline)}</dd></div>
                </dl>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyServices}>
            <strong>No X requests yet</strong>
            <p>Mention @ai2humanbot once to create a request, then continue inside that X thread.</p>
          </div>
        )}
      </section>

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
            <button
              className={styles.walletCopyButton}
              type="button"
              onClick={() => copyRewardWallet(walletAddress)}
              disabled={!walletAddress}
              title={walletAddress || "No wallet connected"}
              aria-label={walletAddress ? "Copy full reward wallet address" : "No reward wallet connected"}
            >
              <strong>{shortAddress(walletAddress)}</strong>
              <small>{copiedWallet ? "Copied full address" : "Click to copy full address"}</small>
            </button>
          </div>

          <div className={styles.walletBox}>
            <span>X account</span>
            <strong>{xAccount?.username ? `@${xAccount.username}` : "Not connected"}</strong>
            {xAccount?.name && <small>{xAccount.name}</small>}
            <button
              className={styles.secondaryBtn}
              type="button"
              onClick={connectOrRefreshX}
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

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Languages</label>
            <input
              className={styles.input}
              value={languages}
              onChange={(event) => setLanguages(event.target.value)}
              placeholder="English, Mandarin"
            />
          </div>

          <div className={styles.formGrid}>
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
