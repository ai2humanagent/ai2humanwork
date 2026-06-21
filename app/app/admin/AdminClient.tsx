"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTimeUtc8 } from "../../lib/dateTime";
import styles from "./admin.module.css";

type TaskSummary = {
  id: string;
  title: string;
  status: string;
  taskState: string;
  lifecycleStatus?: string;
  mode: string;
  campaign?: {
    action?: string;
    requiresImage?: boolean;
  } | null;
  totalPool: string;
  maxWinners: number;
  claimedCount: number;
  participantCount: number;
  submissionCount?: number;
  createdAt: string;
  deadline: string | null;
  escrowDepositId: string | null;
  reviewAnchor?: {
    chainId: number;
    network: string;
    txHash: string;
    explorerUrl: string;
    anchorHash: string;
    anchoredAt: string;
    signerAddress: string;
    payload: {
      taskId: string;
      reviewedAt: string;
      reviewedCount: number;
      winnerCount: number;
    };
  } | null;
};

type Winner = {
  address: string;
  amount: string;
  claimed: boolean;
  txHash: string | null;
};

type Participant = {
  wallet: string;
  subtaskKey: string;
  status: string;
  verifiedAt: string | null;
  claimed: boolean;
  amount: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  network: string | null;
  xHandle: string | null;
  createdAt: string;
};

type TaskPayment = {
  id: string;
  amount: string;
  receiver: string | null;
  receiverAddress: string | null;
  method: string;
  status: string;
  source: string | null;
  network: string | null;
  tokenSymbol: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  createdAt: string;
};

type EvidenceItem = {
  content?: string;
  createdAt?: string;
};

type ArticleSubmission = {
  id: string;
  taskId: string;
  walletAddress: string;
  xHandle: string;
  articleUrl: string;
  title: string;
  contentSnapshot: string;
  status: string;
  aiScore: number | null;
  aiReview: string | null;
  aiRubric?: {
    relevance?: number;
    originality?: number;
    clarity?: number;
    evidence?: number;
    narrative?: number;
    audit?: {
      contentSource?: string;
      fetchSource?: string;
      fetchAttempts?: string[];
      xFetchError?: string;
      reviewedTextExcerpt?: string;
      reviewedTextLength?: number;
      copyRisk?: "possible" | "high";
      copyRiskReason?: string;
      copyMatchedSubmissionId?: string;
      copySimilarity?: number;
      model?: string;
      provider?: string;
      latencyMs?: number;
      minimumWinnerScore?: number;
      aggregateStrategy?: string;
      activeModelCount?: number;
      skippedModelCount?: number;
      modelReviews?: Array<{
        providerId: string;
        providerLabel: string;
        model?: string;
        weight: number;
        status: "scored" | "failed" | "skipped";
        score?: number;
        review?: string;
        rubric?: {
          relevance?: number;
          originality?: number;
          clarity?: number;
          evidence?: number;
          narrative?: number;
        };
        latencyMs?: number;
        error?: string;
      }>;
    };
  } | null;
  rank: number | null;
  prizeAmount: string | null;
  paymentTxHash: string | null;
  paymentExplorerUrl: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

type ArticleReviewAudit = NonNullable<NonNullable<ArticleSubmission["aiRubric"]>["audit"]>;

type TaskDetail = TaskSummary & {
  participants: Participant[];
  winners: Winner[];
  payments: TaskPayment[];
  articleSubmissions: ArticleSubmission[];
  escrow: object | null;
  campaign: {
    poolAddress?: string;
    [key: string]: unknown;
  } | null;
  reviewAnchor?: TaskSummary["reviewAnchor"];
  evidence: EvidenceItem[];
};

type AdminUser = {
  id: string;
  email: string | null;
  contactEmail: string | null;
  createdAt: string;
  authProvider: string;
  privyUserId: string | null;
  walletAddress: string | null;
  walletDuplicateCount: number;
  human: {
    id: string;
    name: string;
    handle: string;
    role: string;
    location: string;
    verified: boolean;
    hourlyRate: number;
    skills: string[];
    languages: string[];
    avatarUrl: string | null;
  } | null;
  xAccount: {
    subject: string;
    username: string;
    name: string | null;
    profilePictureUrl: string | null;
    linkedAt: string | null;
    duplicateCount: number;
  } | null;
  stats: {
    taskCount: number;
    progressCount: number;
    verifiedCount: number;
    actionDoneCount: number;
    pendingCount: number;
    luckyDrawEntryCount: number;
    paymentCount: number;
    claimedAmount: number;
    lastActivityAt: string | null;
  };
  readiness: {
    hasWallet: boolean;
    hasX: boolean;
    hasContactEmail: boolean;
    hasProfile: boolean;
    profileCompletePercent: number;
  };
  flags: {
    duplicateWallet: boolean;
    duplicateXAccount: boolean;
    missingX: boolean;
    missingContactEmail: boolean;
    missingWallet: boolean;
    missingProfile: boolean;
  };
};

type AdminUsersSummary = {
  totalUsers: number;
  walletUsers: number;
  xLinkedUsers: number;
  profileUsers: number;
  duplicateWalletUsers: number;
  duplicateXUsers: number;
  claimedUsers: number;
};

function shortAddress(addr: string) {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function modeLabel(mode: string, action?: string, requiresImage?: boolean) {
  if (mode === "lucky_draw") return "Lucky Draw";
  if (mode === "equal") return "Equal Split";
  if (mode === "ranked_article_contest") {
    if (action === "banner_image_contest") return "Banner Contest";
    if (requiresImage) return "Image Post Contest";
    return "Ranked Article";
  }
  return "FCFS";
}

function formatLogin(email: string | null) {
  if (!email) return "—";
  if (email.endsWith("@privy.local")) return "Wallet login";
  return email;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return formatDateTimeUtc8(dateStr);
}

function hasTaskEvidence(task: Pick<TaskDetail, "evidence">, prefix: string) {
  return (task.evidence || []).some((item) => String(item.content || "").startsWith(prefix));
}

function lifecycleLabel(status: string | undefined) {
  if (status === "draft") return "Draft";
  if (status === "funded") return "Funded";
  if (status === "open") return "Open";
  if (status === "closed") return "Closed";
  if (status === "reviewed") return "Reviewed";
  if (status === "paying") return "Paying";
  if (status === "completed") return "Completed";
  if (status === "refunded") return "Refunded";
  return "";
}

function statusBadge(status: string, taskState: string, lifecycleStatus?: string) {
  const label = lifecycleLabel(lifecycleStatus) || status;
  const cls =
    lifecycleStatus === "completed" || status === "paid" || taskState === "full"
      ? styles.badgeGreen
      : lifecycleStatus === "open" || status === "created"
      ? styles.badgeBlue
      : lifecycleStatus === "reviewed" || lifecycleStatus === "paying" || status === "human_assigned"
      ? styles.badgeYellow
      : styles.badgeGray;
  return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

function deriveAdminLifecycle(task: TaskDetail, articleSubmissions: ArticleSubmission[]) {
  const mode = task.mode;
  const isArticleContest = mode === "ranked_article_contest";
  const finalReviewed = isArticleContest && hasTaskEvidence(task, "article_review:");
  const publicWinnerCount = isArticleContest
    ? articleSubmissions.filter((submission) => submission.rank && submission.prizeAmount && (submission.aiScore || 0) >= 25).length
    : task.winners.length;
  const paidCount = isArticleContest
    ? articleSubmissions.filter((submission) => submission.status === "paid").length
    : task.payments.length;
  const deadlinePassed = task.deadline ? Date.now() > +new Date(task.deadline) : false;
  const funded = Boolean(task.totalPool || task.escrowDepositId);
  const completed = publicWinnerCount > 0 && paidCount >= publicWinnerCount;
  const current = task.taskState === "refunded"
    ? "Refunded"
    : completed
      ? "Completed"
      : paidCount > 0
        ? "Paying"
        : finalReviewed
          ? "Reviewed"
          : task.taskState === "closed" || deadlinePassed
            ? "Closed"
            : task.participantCount > 0 || task.taskState === "open"
              ? "Open"
              : funded
                ? "Funded"
                : "Draft";
  const order = ["Draft", "Funded", "Open", "Closed", "Reviewed", "Paying", "Completed", "Refunded"];
  const currentIndex = order.indexOf(current);
  return order.map((label, index) => ({
    label,
    state: index < currentIndex ? "done" : index === currentIndex ? "current" : "pending"
  }));
}

export default function AdminPage() {
  const router = useRouter();
  const [view, setView] = useState<"users" | "tasks">("users");
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersSummary, setUsersSummary] = useState<AdminUsersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selected, setSelected] = useState<TaskDetail | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [query, setQuery] = useState("");

  const loadTasks = useCallback(async () => {
    const response = await fetch(`/api/admin/tasks?ts=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin"
    });
    if (response.status === 401) {
      router.push("/admin/login");
      return;
    }
    const data = await response.json();
    setTasks(data.tasks || []);
    setLoading(false);
  }, [router]);

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/admin/users", {
      cache: "no-store",
      credentials: "same-origin"
    });
    if (response.status === 401) {
      router.push("/admin/login");
      return;
    }
    const data = await response.json();
    const nextUsers: AdminUser[] = data.users || [];
    setUsers(nextUsers);
    setUsersSummary(data.summary || null);
    setSelectedUserId((current) => current || nextUsers[0]?.id || null);
    setUsersLoading(false);
  }, [router]);

  const openTask = useCallback((id: string, options: { clear?: boolean } = {}) => {
    setDetailLoading(true);
    if (options.clear !== false) {
      setSelected(null);
    }
    fetch(`/api/admin/tasks/${id}?ts=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin"
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setSelected({
          ...(d.task || d),
          participants: d.participants || d.task?.participants || [],
          winners: d.winners || d.task?.winners || [],
          payments: d.payments || d.task?.payments || [],
          articleSubmissions: d.articleSubmissions || d.task?.articleSubmissions || [],
          escrow: d.task?.escrow || d.escrow || null,
          campaign: d.task?.campaign || d.campaign || null,
          evidence: d.task?.evidence || d.evidence || []
        });
        setDetailLoading(false);
      })
      .catch(() => setDetailLoading(false));
  }, []);

  useEffect(() => {
    loadTasks().catch(() => setLoading(false));
  }, [loadTasks]);

  useEffect(() => {
    loadUsers().catch(() => setUsersLoading(false));
  }, [loadUsers]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadTasks().catch(() => null);
      if (selected?.id) {
        openTask(selected.id, { clear: false });
      }
    }, 15000);
    return () => window.clearInterval(interval);
  }, [loadTasks, openTask, selected?.id]);

  function refreshAdminData() {
    loadTasks().catch(() => null);
    loadUsers().catch(() => null);
    if (selected?.id) {
      openTask(selected.id, { clear: false });
    }
  }

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => {
      const fields = [
        user.walletAddress,
        user.xAccount?.username,
        user.xAccount?.name,
        user.email,
        user.human?.name,
        user.human?.role,
        user.human?.location,
        user.id
      ];
      return fields.some((field) => field?.toLowerCase().includes(needle));
    });
  }, [query, users]);

  const selectedUser =
    filteredUsers.find((user) => user.id === selectedUserId) || filteredUsers[0] || null;

  async function logoutAdmin() {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => null);
    router.push("/admin/login");
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Admin</h1>
          <span className={styles.subtitle}>Users, identity, task progress, and payouts</span>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.viewSwitch}>
            <button
              className={`${styles.viewButton} ${view === "users" ? styles.viewButtonActive : ""}`}
              onClick={() => setView("users")}
            >
              Users
            </button>
            <button
              className={`${styles.viewButton} ${view === "tasks" ? styles.viewButtonActive : ""}`}
              onClick={() => setView("tasks")}
            >
              Tasks
            </button>
          </div>
          <button className={styles.backBtn} onClick={() => router.push("/tasks")}>
            Task Board
          </button>
          <button className={styles.backBtn} onClick={refreshAdminData}>
            Refresh
          </button>
          <button className={styles.backBtn} onClick={logoutAdmin}>
            Sign out
          </button>
        </div>
      </header>

      {view === "users" ? (
        <UserManagement
          users={filteredUsers}
          allUsers={users}
          summary={usersSummary}
          loading={usersLoading}
          query={query}
          onQueryChange={setQuery}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUserId}
        />
      ) : (
      <div className={styles.layout}>
        {/* Left: task list */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span>Tasks ({tasks.length})</span>
          </div>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : tasks.length === 0 ? (
            <div className={styles.empty}>No tasks</div>
          ) : (
            tasks.map((task) => (
              <button
                key={task.id}
                className={`${styles.taskCard} ${selected?.id === task.id ? styles.taskCardActive : ""}`}
                onClick={() => openTask(task.id)}
              >
                <div className={styles.taskCardTop}>
                  <span className={styles.taskTitle}>{task.title}</span>
                  {statusBadge(task.status, task.taskState, task.lifecycleStatus)}
                </div>
                <div className={styles.taskCardMeta}>
                  <span>{modeLabel(task.mode, task.campaign?.action, task.campaign?.requiresImage)}</span>
                  <span>{task.totalPool}</span>
                  <span>{task.claimedCount}/{task.maxWinners} claimed</span>
                </div>
                <div className={styles.taskCardMeta}>
                  <span>{task.participantCount} participants</span>
                  <span>{formatDate(task.createdAt)}</span>
                </div>
              </button>
            ))
          )}
        </aside>

        {/* Right: detail panel */}
        <main className={styles.main}>
          {!selected && !detailLoading && (
            <div className={styles.placeholder}>
              <p>Select a task to view details</p>
            </div>
          )}
          {detailLoading && (
            <div className={styles.loading}>Loading task details...</div>
          )}
          {selected && <TaskDetailPanel task={selected} />}
        </main>
      </div>
      )}
    </div>
  );
}

function UserManagement({
  users,
  allUsers,
  summary,
  loading,
  query,
  onQueryChange,
  selectedUser,
  onSelectUser
}: {
  users: AdminUser[];
  allUsers: AdminUser[];
  summary: AdminUsersSummary | null;
  loading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  selectedUser: AdminUser | null;
  onSelectUser: (id: string) => void;
}) {
  const missingX = allUsers.filter((user) => user.flags.missingX).length;
  const readyUsers = allUsers.filter(
    (user) => user.readiness.hasWallet && user.readiness.hasX && user.readiness.hasProfile
  ).length;

  return (
    <main className={styles.usersPage}>
      <section className={styles.summaryGrid}>
        <SummaryCard label="Total users" value={summary?.totalUsers ?? allUsers.length} hint={`${summary?.walletUsers ?? 0} wallets`} />
        <SummaryCard label="X linked" value={summary?.xLinkedUsers ?? 0} hint={`${missingX} missing`} tone="green" />
        <SummaryCard label="Profiles" value={summary?.profileUsers ?? 0} hint={`${readyUsers} ready`} tone="blue" />
        <SummaryCard label="Claimed" value={summary?.claimedUsers ?? 0} hint="users paid" tone="yellow" />
        <SummaryCard label="Risk flags" value={(summary?.duplicateWalletUsers ?? 0) + (summary?.duplicateXUsers ?? 0)} hint="duplicate wallet/X" tone="red" />
      </section>

      <section className={styles.userTools}>
        <div>
          <h2>User Management</h2>
          <p>Track wallets, X identity binding, operator profile state, task progress, and rewards.</p>
        </div>
        <input
          className={styles.searchInput}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search wallet, X handle, name, email..."
        />
      </section>

      <div className={styles.userLayout}>
        <section className={styles.userTablePanel}>
          {loading ? (
            <div className={styles.loading}>Loading users...</div>
          ) : users.length === 0 ? (
            <div className={styles.empty}>No users found</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Wallet</th>
                    <th>X Account</th>
                    <th>Profile</th>
                    <th>Task Progress</th>
                    <th>Claimed</th>
                    <th>Flags</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={selectedUser?.id === user.id ? styles.tableRowActive : ""}
                      onClick={() => onSelectUser(user.id)}
                    >
                      <td>
                        <div className={styles.userCell}>
                          <span className={styles.userName}>{user.human?.name || user.xAccount?.name || "Unnamed user"}</span>
                          <span className={styles.userSub}>{formatLogin(user.email)}</span>
                        </div>
                      </td>
                      <td>
                        {user.walletAddress ? (
                          <span className={styles.addr}>{shortAddress(user.walletAddress)}</span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeGray}`}>Missing</span>
                        )}
                      </td>
                      <td>
                        {user.xAccount ? (
                          <div className={styles.userCell}>
                            <span className={styles.xHandle}>@{user.xAccount.username}</span>
                            <span className={styles.userSub}>{user.xAccount.name || "X linked"}</span>
                          </div>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeYellow}`}>Not linked</span>
                        )}
                      </td>
                      <td>
                        {user.human ? (
                          <div className={styles.profileMeter}>
                            <span>{user.readiness.profileCompletePercent}%</span>
                            <span className={styles.meterTrack}>
                              <span style={{ width: `${user.readiness.profileCompletePercent}%` }} />
                            </span>
                          </div>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeGray}`}>No profile</span>
                        )}
                      </td>
                      <td>
                        <span>{user.stats.verifiedCount}/{user.stats.progressCount}</span>
                        <span className={styles.userSub}>{user.stats.taskCount} tasks</span>
                      </td>
                      <td>
                        <span>{user.stats.claimedAmount} USDC</span>
                        <span className={styles.userSub}>{user.stats.paymentCount} payments</span>
                      </td>
                      <td>
                        <FlagList user={user} compact />
                      </td>
                      <td>{user.stats.lastActivityAt ? timeAgo(user.stats.lastActivityAt) : timeAgo(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <UserDetail user={selectedUser} />
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "default"
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "green" | "blue" | "yellow" | "red";
}) {
  return (
    <div className={`${styles.summaryCard} ${styles[`summaryCard_${tone}`]}`}>
      <span className={styles.summaryLabel}>{label}</span>
      <strong>{value}</strong>
      <span className={styles.summaryHint}>{hint}</span>
    </div>
  );
}

function FlagList({ user, compact = false }: { user: AdminUser; compact?: boolean }) {
  const flags = [
    user.flags.duplicateWallet ? `Wallet x${user.walletDuplicateCount}` : "",
    user.flags.duplicateXAccount ? `X x${user.xAccount?.duplicateCount || 0}` : "",
    user.flags.missingWallet ? "No wallet" : "",
    user.flags.missingContactEmail ? "No email" : "",
    user.flags.missingX ? "No X" : "",
    user.flags.missingProfile ? "No profile" : ""
  ].filter(Boolean);

  if (flags.length === 0) {
    return <span className={`${styles.badge} ${styles.badgeGreen}`}>Clean</span>;
  }

  if (compact) {
    return (
      <div className={styles.flagWrap}>
        {flags.slice(0, 2).map((flag) => (
          <span key={flag} className={`${styles.badge} ${styles.badgeYellow}`}>{flag}</span>
        ))}
        {flags.length > 2 && <span className={`${styles.badge} ${styles.badgeGray}`}>+{flags.length - 2}</span>}
      </div>
    );
  }

  return (
    <div className={styles.flagWrap}>
      {flags.map((flag) => (
        <span key={flag} className={`${styles.badge} ${styles.badgeYellow}`}>{flag}</span>
      ))}
    </div>
  );
}

function UserDetail({ user }: { user: AdminUser | null }) {
  if (!user) {
    return (
      <aside className={styles.userDetail}>
        <div className={styles.placeholder}>Select a user</div>
      </aside>
    );
  }

  return (
    <aside className={styles.userDetail}>
      <div className={styles.userDetailHeader}>
        {user.human?.avatarUrl || user.xAccount?.profilePictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.human?.avatarUrl || user.xAccount?.profilePictureUrl || ""}
            alt=""
            className={styles.userAvatar}
          />
        ) : (
          <div className={styles.userAvatarFallback}>
            {(user.human?.name || user.xAccount?.username || "U").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <h3>{user.human?.name || user.xAccount?.name || "Unnamed user"}</h3>
          <p>{user.human?.role || user.xAccount ? `@${user.xAccount?.username}` : formatLogin(user.email)}</p>
        </div>
      </div>

      <div className={styles.detailBlock}>
        <h4>Identity</h4>
        <InfoLine label="Wallet" value={user.walletAddress || "Missing"} mono />
        <InfoLine label="X handle" value={user.xAccount ? `@${user.xAccount.username}` : "Not linked"} />
        <InfoLine label="X id" value={user.xAccount?.subject || "—"} mono />
        <InfoLine label="X linked" value={formatDate(user.xAccount?.linkedAt || null)} />
        <InfoLine label="Contact email" value={user.contactEmail || "Missing"} />
        <InfoLine label="Login" value={formatLogin(user.email)} />
        <InfoLine label="Auth" value={user.authProvider} />
      </div>

      <div className={styles.detailBlock}>
        <h4>Operator Profile</h4>
        <InfoLine label="Profile" value={user.human ? user.human.id : "Missing"} mono={Boolean(user.human)} />
        <InfoLine label="Location" value={user.human?.location || "—"} />
        <InfoLine label="Rate" value={user.human ? `$${user.human.hourlyRate}/hr` : "—"} />
        <InfoLine label="Skills" value={user.human?.skills?.join(", ") || "—"} />
        <InfoLine label="Languages" value={user.human?.languages?.join(", ") || "—"} />
      </div>

      <div className={styles.detailBlock}>
        <h4>Task Activity</h4>
        <InfoLine label="Tasks touched" value={String(user.stats.taskCount)} />
        <InfoLine label="Verified subtasks" value={`${user.stats.verifiedCount}/${user.stats.progressCount}`} />
        <InfoLine label="Lucky draw entries" value={String(user.stats.luckyDrawEntryCount)} />
        <InfoLine label="Rewards claimed" value={`${user.stats.claimedAmount} USDC`} />
        <InfoLine label="Payments" value={String(user.stats.paymentCount)} />
        <InfoLine label="Last activity" value={formatDate(user.stats.lastActivityAt)} />
      </div>

      <div className={styles.detailBlock}>
        <h4>Risk Checks</h4>
        <FlagList user={user} />
      </div>
    </aside>
  );
}

function InfoLine({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.infoLine}>
      <span>{label}</span>
      <strong className={mono ? styles.monoValue : undefined}>{value}</strong>
    </div>
  );
}

function prizeLabel(rank: number | null) {
  if (rank === 1) return "First Prize";
  if (rank === 2) return "Second Prize";
  if (rank === 3) return "Third Prize";
  return "Finalist";
}

function sourceAndReason(review: string | null) {
  if (!review) return { source: "Not reviewed", reason: "" };
  const prefix = "Source: ";
  if (!review.startsWith(prefix)) return { source: "AI review", reason: review };

  const body = review.slice(prefix.length);
  const fallbackMarker = "). ";
  if (body.includes("live X fetch failed (")) {
    const fallbackIndex = body.indexOf(fallbackMarker);
    if (fallbackIndex >= 0) {
      return {
        source: body.slice(0, fallbackIndex + 1),
        reason: body.slice(fallbackIndex + fallbackMarker.length)
      };
    }
  }

  const separator = body.indexOf(". ");
  if (separator < 0) return { source: body, reason: "" };
  return {
    source: body.slice(0, separator),
    reason: body.slice(separator + 2)
  };
}

function rubricEntries(rubric?: ArticleSubmission["aiRubric"]) {
  if (!rubric) return [];
  return (["relevance", "originality", "clarity", "evidence", "narrative"] as const)
    .flatMap((key) => {
      const value = rubric[key];
      return typeof value === "number" ? [[key, value] as const] : [];
    });
}

function auditLabel(audit?: ArticleReviewAudit) {
  if (!audit) return "Review source unknown";
  if (audit.contentSource === "snapshot_fallback") return "Article text fallback";
  if (audit.fetchSource === "oembed") return "Live X embed";
  if (audit.fetchSource === "x_api") return "Live X API";
  if (audit.fetchSource === "syndication") return "Live X syndication";
  return `Live X${audit.fetchSource ? ` · ${audit.fetchSource}` : ""}`;
}

function modelConsensusLabel(audit?: ArticleReviewAudit) {
  if (!audit?.modelReviews?.length) {
    return audit?.model ? `Model: ${audit.model}` : "";
  }
  const active = audit.modelReviews.filter((item) => item.status === "scored").length;
  const total = audit.modelReviews.length;
  if (audit.aggregateStrategy === "weighted_consensus" || active > 1) {
    return `Weighted consensus · ${active}/${total} models`;
  }
  return `${active}/${total} model active`;
}

function modelReviewRows(audit?: ArticleReviewAudit) {
  return audit?.modelReviews || [];
}

function sourceLabelFromReview(submission: ArticleSubmission) {
  const audit = submission.aiRubric?.audit;
  if (audit) return auditLabel(audit);
  const review = sourceAndReason(submission.aiReview);
  if (review.source.toLowerCase().includes("x live content")) return review.source.replace("X live content", "Live X");
  if (review.source.toLowerCase().includes("snapshot")) return review.source;
  return "Legacy review";
}

function articleTextPreview(submission: ArticleSubmission) {
  const text = (submission.contentSnapshot || submission.aiRubric?.audit?.reviewedTextExcerpt || "").replace(/\s+/g, " ").trim();
  if (!text) return "—";
  return text.length > 320 ? `${text.slice(0, 320)}...` : text;
}

function compactUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function articleAdminStatus(submission: ArticleSubmission, minimumScore: number) {
  if (submission.status === "paid") return "paid";
  if (submission.status === "winner") return "winner";
  if (submission.status === "invalid" || submission.status === "rejected") return submission.status;
  if (submission.rank && submission.prizeAmount) return "winner";
  if (submission.aiScore != null && submission.aiScore >= minimumScore) return "qualified";
  if (submission.aiScore != null) return "reviewed";
  return "submitted";
}

function PrizeCard({ submission, featured = false }: { submission: ArticleSubmission; featured?: boolean }) {
  const review = sourceAndReason(submission.aiReview);
  const entries = rubricEntries(submission.aiRubric);
  const audit = submission.aiRubric?.audit;

  return (
    <article className={`${styles.prizeCard} ${featured ? styles.prizeCardFeatured : ""}`}>
      <div className={styles.prizeCardTop}>
        <div>
          <span className={styles.prizeLabel}>{prizeLabel(submission.rank)}</span>
          <h4>@{submission.xHandle}</h4>
        </div>
        <div className={styles.prizeAmount}>{submission.prizeAmount}</div>
      </div>

      <div className={styles.prizeScoreRow}>
        <strong>{submission.aiScore != null ? submission.aiScore.toFixed(1) : "—"}</strong>
        <span>/100</span>
      </div>

      <p className={styles.prizeTitle}>{submission.title}</p>
      <div className={styles.sourceBadge}>{sourceLabelFromReview(submission)}</div>
      {modelConsensusLabel(audit) && <div className={styles.consensusBadge}>{modelConsensusLabel(audit)}</div>}
      <div className={styles.sourceSubline}>{review.source}</div>
      {audit?.copyRisk && (
        <div className={`${styles.copyRiskBadge} ${audit.copyRisk === "high" ? styles.copyRiskHigh : ""}`}>
          Copy risk: {audit.copyRisk}
        </div>
      )}
      {review.reason && <p className={styles.prizeReason}>{review.reason}</p>}
      {audit?.reviewedTextExcerpt && (
        <div className={styles.reviewExcerpt}>
          <span>Audit excerpt</span>
          <p>{audit.reviewedTextExcerpt}</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className={styles.prizeRubric}>
          {entries.map(([key, value]) => (
            <div key={key}>
              <span>{key}</span>
              <strong>{Number(value).toFixed(1)}</strong>
            </div>
          ))}
        </div>
      )}
      {modelReviewRows(audit).length > 0 && (
        <div className={styles.modelReviewList}>
          {modelReviewRows(audit).map((item) => (
            <div key={`${submission.id}-${item.providerId}`} className={styles.modelReviewItem}>
              <span>{item.providerLabel}</span>
              <strong>{item.status === "scored" && item.score != null ? item.score.toFixed(1) : item.status}</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function TaskDetailPanel({ task }: { task: TaskDetail }) {
  const [tab, setTab] = useState<"overview" | "participants" | "submissions" | "winners" | "payments">("overview");
  const [articleSubmissions, setArticleSubmissions] = useState<ArticleSubmission[]>(task.articleSubmissions || []);
  const [actionBusy, setActionBusy] = useState<"" | "review" | "close_review" | "rerun_review" | "payout">("");
  const [actionMessage, setActionMessage] = useState("");
  const [finalReviewLocked, setFinalReviewLocked] = useState(hasTaskEvidence(task, "article_review:"));
  const isArticleContest = task.mode === "ranked_article_contest";
  const reviewedSubmissions = articleSubmissions.filter((submission) => submission.aiScore != null);
  const unscoredSubmissions = articleSubmissions.filter((submission) => submission.aiScore == null);
  const hasAuditResults = reviewedSubmissions.some((submission) => Boolean(submission.aiRubric?.audit));
  const rankedSubmissions = [...reviewedSubmissions].sort((a, b) => {
    const rankDelta = (a.rank || 999) - (b.rank || 999);
    if (rankDelta !== 0) return rankDelta;
    return (b.aiScore || 0) - (a.aiScore || 0);
  });
  const minimumWinnerScore = reviewedSubmissions
    .map((submission) => submission.aiRubric?.audit?.minimumWinnerScore)
    .find((value): value is number => typeof value === "number");
  const displayMinimumWinnerScore = minimumWinnerScore ?? 25;
  const winnerSubmissions = rankedSubmissions.filter(
    (submission) => submission.rank && submission.prizeAmount && (submission.aiScore || 0) >= displayMinimumWinnerScore
  );
  const qualifiedSubmissions = minimumWinnerScore == null
    ? reviewedSubmissions.filter((submission) => (submission.aiScore || 0) >= displayMinimumWinnerScore)
    : reviewedSubmissions.filter((submission) => (submission.aiScore || 0) >= minimumWinnerScore);
  const submitterCount = new Set(articleSubmissions.map((submission) => submission.walletAddress.toLowerCase())).size;
  const validArticleSubmissions = articleSubmissions.filter((submission) => submission.status !== "invalid" && submission.status !== "rejected");
  const paidArticleSubmissions = articleSubmissions.filter((submission) => submission.status === "paid");
  const articlePayoutDisabled = isArticleContest && task.campaign?.poolAddress === "TEST_PAYOUT_DISABLED";
  const unpaidWinnerSubmissions = winnerSubmissions.filter(
    (submission) => submission.status === "winner" && submission.prizeAmount && !submission.paymentTxHash
  );
  const deadlinePassed = task.deadline ? Date.now() > +new Date(task.deadline) : false;
  const canCloseAndReview = isArticleContest && !finalReviewLocked && !deadlinePassed;
  const canRunReview = isArticleContest && !finalReviewLocked && deadlinePassed;
  const canPayWinners = isArticleContest && finalReviewLocked && unpaidWinnerSubmissions.length > 0 && !articlePayoutDisabled;
  const firstPrize = winnerSubmissions.find((submission) => submission.rank === 1);
  const runnerUpPrizes = winnerSubmissions.filter((submission) => submission.rank !== 1);
  const hasReviewResults = reviewedSubmissions.length > 0;
  const averageScore = reviewedSubmissions.length
    ? reviewedSubmissions.reduce((sum, submission) => sum + (submission.aiScore || 0), 0) / reviewedSubmissions.length
    : 0;
  const latestReviewedAt = reviewedSubmissions
    .map((submission) => submission.reviewedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const articleParticipantRows: Participant[] = articleSubmissions.map((submission) => ({
    wallet: submission.walletAddress,
    xHandle: submission.xHandle,
    subtaskKey: "article",
    status: submission.status,
    verifiedAt: submission.reviewedAt || null,
    claimed: submission.status === "paid",
    amount: submission.prizeAmount || null,
    txHash: submission.paymentTxHash || null,
    explorerUrl: submission.paymentExplorerUrl || null,
    network: "base-mainnet",
    createdAt: submission.submittedAt
  }));
  const participantRows = isArticleContest ? articleParticipantRows : task.participants;
  const displayedParticipantCount = isArticleContest ? submitterCount : task.participantCount;
  const lifecycle = deriveAdminLifecycle(task, articleSubmissions);

  useEffect(() => {
    setArticleSubmissions(task.articleSubmissions || []);
    setFinalReviewLocked(hasTaskEvidence(task, "article_review:"));
    setActionMessage("");
    if (!isArticleContest && tab === "submissions") {
      setTab("overview");
    }
  }, [task.id, task.articleSubmissions, isArticleContest, tab]);

  async function refreshArticleSubmissions() {
    const response = await fetch(`/api/admin/tasks/${task.id}?ts=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin"
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to refresh article submissions");
    }
    setArticleSubmissions(data.articleSubmissions || data.task?.articleSubmissions || []);
  }

  async function runArticleAction(action: "review" | "close_review" | "rerun_review" | "payout") {
    if (action === "close_review" && !canCloseAndReview) {
      setActionMessage(finalReviewLocked ? "Final results are already locked for this contest." : "Submission deadline has already passed. Use Lock Final Results.");
      return;
    }
    if (action === "review" && !canRunReview) {
      setActionMessage(finalReviewLocked ? "Final review is already locked for this contest." : "Submission deadline has not passed yet.");
      return;
    }
    if (action === "rerun_review" && (finalReviewLocked || unscoredSubmissions.length === 0)) {
      setActionMessage(finalReviewLocked ? "Final results are already locked for this contest." : "All submissions already have a current score.");
      return;
    }
    if (action === "payout" && !canPayWinners) {
      setActionMessage(
        articlePayoutDisabled
          ? "Payout is disabled for this test contest."
          : !finalReviewLocked
            ? "Lock final results before paying winners."
            : "There are no unpaid winners."
      );
      return;
    }
    setActionBusy(action);
    setActionMessage("");
    try {
      const isReviewAction = action === "review" || action === "close_review" || action === "rerun_review";
      const response = await fetch(`/api/admin/tasks/${task.id}/article-${isReviewAction ? "review" : action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: isReviewAction
          ? JSON.stringify({ closeNow: action === "close_review", force: action === "rerun_review" })
          : JSON.stringify({})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 207) {
        const preflightIssues = Array.isArray(data.preflight?.issues) ? data.preflight.issues.join(" ") : "";
        throw new Error(preflightIssues || data.error || `Article ${action} failed`);
      }
      if (Array.isArray(data.submissions)) {
        setArticleSubmissions(data.submissions);
      } else {
        await refreshArticleSubmissions();
      }
      if (isReviewAction) {
        if (action === "rerun_review") {
          setActionMessage(
            `Missing scores refreshed: ${data.reprocessed || 0} rescored, ${data.reusedPreviews || 0} existing scores kept.`
          );
        } else {
          setFinalReviewLocked(true);
          setActionMessage(
            `${data.closedNow ? "Contest ended and deadline closed. " : ""}Final results locked from current submission scores: ${data.reviewed || 0} submissions, ${data.winners || 0} winners. ${data.reusedPreviews || 0} current scores kept, ${data.reprocessed || 0} rescored. Review anchored on Base${data.reviewAnchor?.txHash ? ` (${shortAddress(data.reviewAnchor.txHash)})` : ""}.`
          );
        }
      } else {
        const preflightLine = data.preflight?.poolBalance
          ? ` Pool ${data.preflight.poolBalance} USDC, ${data.preflight.slotsLeft} slots left.`
          : "";
        setActionMessage(`Payout complete: ${data.paid || 0} paid${data.failed?.length ? `, ${data.failed.length} failed` : ""}.${preflightLine}`);
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : `Article ${action} failed`);
    } finally {
      setActionBusy("");
    }
  }

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <h2>{task.title}</h2>
        <div className={styles.detailMeta}>
          <span className={styles.pool}>{task.totalPool} pool</span>
          <span>{modeLabel(task.mode, task.campaign?.action, task.campaign?.requiresImage)}</span>
          <span>
            {isArticleContest
              ? `${paidArticleSubmissions.length}/${winnerSubmissions.length || task.maxWinners} paid`
              : `${task.claimedCount}/${task.maxWinners} claimed`}
          </span>
          {isArticleContest ? (
            <>
              <span>{submitterCount} submitters</span>
              <span>{articleSubmissions.length} articles</span>
              <span>{validArticleSubmissions.length} valid</span>
            </>
          ) : (
            <span>{displayedParticipantCount} participants</span>
          )}
        </div>
        <div className={styles.detailHeaderActions}>
          <a href={`/tasks/${task.id}/report`} target="_blank" rel="noopener noreferrer" className={styles.reportLink}>
            Public Report
          </a>
        </div>
      </div>

      <div className={styles.tabs}>
        {(["overview", "participants", ...(isArticleContest ? ["submissions" as const] : []), "winners", "payments"] as const).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {isArticleContest && t === "participants" ? "Submitters"
              : isArticleContest && t === "submissions" ? "Articles"
                : isArticleContest && t === "winners" ? "Awards"
                  : isArticleContest && t === "payments" ? "Payouts"
                    : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "participants" && ` (${participantRows.length})`}
            {t === "submissions" && ` (${articleSubmissions.length})`}
            {t === "winners" && ` (${isArticleContest ? winnerSubmissions.length : task.winners.length})`}
            {t === "payments" && ` (${task.payments.length})`}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className={styles.overview}>
          <div className={styles.lifecycleBar}>
            {lifecycle.map((step) => (
              <div key={step.label} className={`${styles.lifecyclePill} ${styles[`lifecycle${step.state}`]}`}>
                {step.label}
              </div>
            ))}
          </div>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Task ID</span>
              <span className={styles.infoValue}>{task.id}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status</span>
              <span className={styles.infoValue}>{lifecycleLabel(task.lifecycleStatus) || task.status}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Raw State</span>
              <span className={styles.infoValue}>{task.status} / {task.taskState || "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Mode</span>
              <span className={styles.infoValue}>{modeLabel(task.mode, task.campaign?.action, task.campaign?.requiresImage)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Total Pool</span>
              <span className={styles.infoValue}>{task.totalPool}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Max Winners</span>
              <span className={styles.infoValue}>{task.maxWinners}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Escrow ID</span>
              <span className={styles.infoValue}>{task.escrowDepositId || "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Deadline</span>
              <span className={styles.infoValue}>{formatDate(task.deadline)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Created</span>
              <span className={styles.infoValue}>{formatDate(task.createdAt)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Review Anchor</span>
              <span className={styles.infoValue}>
                {task.reviewAnchor?.txHash ? (
                  <a href={task.reviewAnchor.explorerUrl} target="_blank" rel="noopener noreferrer" className={styles.txLink}>
                    {shortAddress(task.reviewAnchor.txHash)} · {task.reviewAnchor.network}
                  </a>
                ) : "—"}
              </span>
            </div>
          </div>

          {task.campaign != null && (
            <div className={styles.section}>
              <h3>Campaign</h3>
              <pre className={styles.jsonPre}>{JSON.stringify(task.campaign as object, null, 2)}</pre>
            </div>
          )}

          {task.escrow != null && (
            <div className={styles.section}>
              <h3>Escrow</h3>
              <pre className={styles.jsonPre}>{JSON.stringify(task.escrow as object, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {tab === "participants" && (
        <div className={styles.tableWrap}>
          {participantRows.length === 0 ? (
            <div className={styles.empty}>No participants yet</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>X Handle</th>
                  <th>Subtask</th>
                  <th>Status</th>
                  <th>Verified At</th>
                  <th>Claimed</th>
                  <th>Amount</th>
                  <th>TX</th>
                </tr>
              </thead>
              <tbody>
                {participantRows.map((p) => (
                  <tr key={`${p.wallet}-${p.subtaskKey}`}>
                    <td>
                      <span className={styles.addr}>{shortAddress(p.wallet)}</span>
                    </td>
                    <td>{p.xHandle || "—"}</td>
                    <td>{p.subtaskKey}</td>
                    <td>
                      <span className={`${styles.badge} ${p.status === "verified" ? styles.badgeGreen : p.status === "action_done" ? styles.badgeYellow : styles.badgeGray}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{p.verifiedAt ? timeAgo(p.verifiedAt) : "—"}</td>
                    <td>{p.claimed ? "✅" : "❌"}</td>
                    <td>{p.amount || "—"}</td>
                    <td>
                      {p.txHash ? (
                        <a href={p.explorerUrl || "#"} target="_blank" rel="noopener noreferrer" className={styles.txLink}>
                          {shortAddress(p.txHash)}
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "winners" && (
        <div className={styles.tableWrap}>
          {isArticleContest ? (
            winnerSubmissions.length === 0 ? (
              <div className={styles.empty}>No awards selected yet</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>X</th>
                    <th>Wallet</th>
                    <th>Score</th>
                    <th>Prize</th>
                    <th>Status</th>
                    <th>Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {winnerSubmissions.map((submission) => (
                    <tr key={submission.id}>
                      <td>#{submission.rank}</td>
                      <td className={styles.xHandle}>@{submission.xHandle}</td>
                      <td><span className={styles.addr}>{shortAddress(submission.walletAddress)}</span></td>
                      <td>{submission.aiScore != null ? `${submission.aiScore}/100` : "—"}</td>
                      <td>{submission.prizeAmount || "—"}</td>
                      <td>
                        <span className={`${styles.badge} ${submission.status === "paid" ? styles.badgeGreen : styles.badgeYellow}`}>
                          {submission.status}
                        </span>
                      </td>
                      <td>
                        {submission.paymentTxHash ? (
                          <a href={submission.paymentExplorerUrl || "#"} target="_blank" rel="noopener noreferrer" className={styles.txLink}>
                            {shortAddress(submission.paymentTxHash)}
                          </a>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : task.winners.length === 0 ? (
            <div className={styles.empty}>No winners drawn yet</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Winner Address</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>TX Hash</th>
                </tr>
              </thead>
              <tbody>
                {task.winners.map((w, i) => (
                  <tr key={w.address}>
                    <td>{i + 1}</td>
                    <td><span className={styles.addr}>{shortAddress(w.address)}</span></td>
                    <td>{w.amount}</td>
                    <td>
                      {w.claimed ? (
                        <span className={`${styles.badge} ${styles.badgeGreen}`}>Paid</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeGray}`}>Pending</span>
                      )}
                    </td>
                    <td>
                      {w.txHash ? (
                        <span className={styles.addr}>{shortAddress(w.txHash)}</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "submissions" && (
        <div className={styles.section}>
          <div className={styles.headerActions}>
            <button
              className={styles.backBtn}
              onClick={() => runArticleAction("close_review")}
              disabled={actionBusy !== "" || !canCloseAndReview}
              title={
                finalReviewLocked
                  ? "Final review is already locked for this contest."
                  : deadlinePassed
                    ? "Submission deadline has already passed. Use Lock Final Results."
                    : undefined
              }
            >
              {actionBusy === "close_review"
                ? "Ending contest..."
                : finalReviewLocked ? "Final Results Locked" : "End Contest Now & Lock Final Results"}
            </button>
            <button
              className={styles.backBtn}
              onClick={() => runArticleAction("review")}
              disabled={actionBusy !== "" || !canRunReview}
              title={
                finalReviewLocked
                  ? "Final review is already locked for this contest."
                  : !deadlinePassed
                    ? "Only available after the configured deadline. To end early, use End Contest Now & Lock Final Results."
                    : undefined
              }
            >
              {actionBusy === "review"
                ? "Locking final results..."
                : finalReviewLocked ? "Final Results Locked" : "Lock Final Results After Deadline"}
            </button>
            <button
              className={styles.backBtn}
              onClick={() => runArticleAction("rerun_review")}
              disabled={actionBusy !== "" || finalReviewLocked || unscoredSubmissions.length === 0}
              title={
                finalReviewLocked
                  ? "Final results are already locked for this contest."
                  : "Re-run AI review for current submissions without locking final winners."
              }
            >
              {actionBusy === "rerun_review"
                ? "Refreshing AI Scores..."
                : "Refresh AI Scores"}
            </button>
            <button
              className={styles.backBtn}
              onClick={() => runArticleAction("payout")}
              disabled={actionBusy !== "" || !canPayWinners}
              title={
                articlePayoutDisabled
                  ? "Payout is disabled for this test contest."
                  : !finalReviewLocked
                    ? "Lock final results before paying winners."
                    : unpaidWinnerSubmissions.length === 0
                      ? "There are no unpaid winners."
                      : undefined
              }
            >
              {actionBusy === "payout"
                ? "Paying..."
                : !finalReviewLocked
                  ? "Pay Winners"
                  : unpaidWinnerSubmissions.length === 0
                    ? "Payout Complete"
                    : "Pay Winners"}
            </button>
          </div>
          {articlePayoutDisabled && (
            <div className={styles.reviewWarning}>
              Test payout disabled for this contest. Review, ranking, and public report can be tested, but Pay Winners will not send USDC.
            </div>
          )}
          {actionMessage && <div className={styles.empty}>{actionMessage}</div>}
          {hasReviewResults && !hasAuditResults && (
            <div className={styles.reviewWarning}>
              This is a legacy review without full audit details. New contests lock one final result set with source audit, reviewed text excerpts, and the active winner threshold.
            </div>
          )}
          {reviewedSubmissions.length > 0 && (
            <div className={styles.reviewShowcase}>
              <div className={styles.reviewHero}>
                <div className={styles.reviewHeroCopy}>
                  <span className={styles.reviewKicker}>
                    {finalReviewLocked ? "AI Article Contest Results" : "Current Scores - Not Final"}
                  </span>
                  <h3>{task.title}</h3>
                  <p>
                    {finalReviewLocked
                      ? "Final winners are locked from live X content when available. Submitted article text is only used when live X fetching fails, and the report records exactly what was reviewed."
                      : "These are the current scores saved when each submission was created or updated. They stay unchanged unless the user edits the submission or you explicitly refill a missing score."}
                  </p>
                </div>
                <div className={styles.reviewStatsPanel}>
                  <div>
                    <strong>{reviewedSubmissions.length}</strong>
                    <span>{finalReviewLocked ? "Reviewed" : "Scored"}</span>
                  </div>
                  <div>
                    <strong>{winnerSubmissions.length}</strong>
                    <span>{finalReviewLocked ? "Winners" : "Locked winners"}</span>
                  </div>
                  <div>
                    <strong>{qualifiedSubmissions.length}</strong>
                    <span>Qualified</span>
                  </div>
                  <div>
                    <strong>{averageScore.toFixed(1)}</strong>
                    <span>Avg score</span>
                  </div>
                  <div>
                    <strong>{displayMinimumWinnerScore}</strong>
                    <span>Min score</span>
                  </div>
                </div>
              </div>

              {finalReviewLocked && firstPrize && (
                <PrizeCard submission={firstPrize} featured />
              )}

              {finalReviewLocked && runnerUpPrizes.length > 0 && (
                <div className={styles.prizeGrid}>
                  {runnerUpPrizes.map((submission) => (
                    <PrizeCard key={submission.id} submission={submission} />
                  ))}
                </div>
              )}

              <div className={styles.reviewFootnote}>
                <span>
                  {finalReviewLocked
                    ? "Rubric: relevance, originality, clarity, evidence, narrative. Minimum winner score is intentionally light, but very weak submissions stay unawarded."
                    : "Scores are created on submit or update. To finish this contest, lock final results from the current scores. Until then, users can still update once and the ranking is not final."}
                </span>
                {latestReviewedAt && <span>Last reviewed {timeAgo(latestReviewedAt)}.</span>}
                {task.reviewAnchor?.txHash && (
                  <span>
                    Review anchored on Base:{" "}
                    <a href={task.reviewAnchor.explorerUrl} target="_blank" rel="noopener noreferrer" className={styles.txLink}>
                      {shortAddress(task.reviewAnchor.txHash)}
                    </a>
                  </span>
                )}
              </div>
            </div>
          )}
          <div className={styles.tableWrap}>
            {articleSubmissions.length === 0 ? (
              <div className={styles.empty}>No article submissions yet</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Submitter</th>
                    <th>Wallet</th>
                    <th>X Link</th>
                    <th>Submitted Article Text</th>
                    <th>Score</th>
                    <th>Prize</th>
                    <th>Status</th>
                    <th>Review</th>
                    <th>Payout</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {articleSubmissions.map((submission) => {
                    const adminStatus = articleAdminStatus(submission, displayMinimumWinnerScore);
                    return (
                    <tr key={submission.id}>
                      <td>{submission.rank ? `#${submission.rank}` : "—"}</td>
                      <td className={styles.xHandle}>@{submission.xHandle}</td>
                      <td><span className={styles.addr}>{shortAddress(submission.walletAddress)}</span></td>
                      <td className={styles.articleLinkCell}>
                        <a href={submission.articleUrl} target="_blank" rel="noopener noreferrer" className={styles.articleUrlLink}>
                          {compactUrl(submission.articleUrl)}
                        </a>
                      </td>
                      <td className={styles.articleTextCell}>
                        <p>{articleTextPreview(submission)}</p>
                        {submission.title && <span>{submission.title}</span>}
                      </td>
                      <td>{submission.aiScore != null ? `${submission.aiScore}/100` : "—"}</td>
                      <td>{submission.prizeAmount || "—"}</td>
                      <td>
                        <span className={`${styles.badge} ${
                          adminStatus === "paid"
                            ? styles.badgeGreen
                            : adminStatus === "winner" || adminStatus === "qualified"
                              ? styles.badgeYellow
                              : adminStatus === "reviewed"
                                ? styles.badgeBlue
                                : adminStatus === "rejected" || adminStatus === "invalid"
                                  ? styles.badgeRed
                                  : styles.badgeGray
                        }`}>
                          {adminStatus}
                        </span>
                      </td>
                      <td className={styles.reviewReason}>
                        {submission.aiReview ? (
                          <>
                            <div className={styles.reviewConclusion}>
                              <span>AI review</span>
                              <div className={styles.sourceBadge}>{sourceLabelFromReview(submission)}</div>
                              {modelConsensusLabel(submission.aiRubric?.audit) && (
                                <div className={styles.consensusBadge}>{modelConsensusLabel(submission.aiRubric?.audit)}</div>
                              )}
                              {submission.aiRubric?.audit?.copyRisk && (
                                <div className={`${styles.copyRiskBadge} ${submission.aiRubric.audit.copyRisk === "high" ? styles.copyRiskHigh : ""}`}>
                                  Copy risk: {submission.aiRubric.audit.copyRisk}
                                  {submission.aiRubric.audit.copySimilarity != null ? ` · ${(submission.aiRubric.audit.copySimilarity * 100).toFixed(0)}% overlap` : ""}
                                </div>
                              )}
                              <p>{submission.aiReview}</p>
                            </div>
                            {submission.aiRubric && (
                              <div className={styles.rubricInline}>
                                {rubricEntries(submission.aiRubric).map(([key, value]) => (
                                  <span key={key}>{key} {Number(value).toFixed(1)}</span>
                                ))}
                              </div>
                            )}
                            {submission.aiRubric?.audit?.reviewedTextExcerpt && (
                              <details className={styles.auditTrail}>
                                <summary>
                                  <span>Audit trail</span>
                                  <strong>Show exact text scored</strong>
                                </summary>
                                <p>{submission.aiRubric.audit.reviewedTextExcerpt}</p>
                                <div className={styles.auditMeta}>
                                  <span>Source: {sourceLabelFromReview(submission)}</span>
                                  <span>{submission.aiRubric.audit.reviewedTextLength || 0} chars</span>
                                  {submission.aiRubric.audit.model && <span>Model: {submission.aiRubric.audit.model}</span>}
                                  {modelReviewRows(submission.aiRubric.audit).map((item) => (
                                    <span key={`${submission.id}-audit-${item.providerId}`}>
                                      {item.providerLabel}: {item.status === "scored" && item.score != null ? item.score.toFixed(1) : item.error || item.status}
                                    </span>
                                  ))}
                                  {submission.aiRubric.audit.copyRiskReason && <span>{submission.aiRubric.audit.copyRiskReason}</span>}
                                </div>
                              </details>
                            )}
                          </>
                        ) : "—"}
                      </td>
                      <td>
                        {submission.paymentTxHash ? (
                          <a href={submission.paymentExplorerUrl || "#"} target="_blank" rel="noopener noreferrer" className={styles.txLink}>
                            {shortAddress(submission.paymentTxHash)}
                          </a>
                        ) : "—"}
                      </td>
                      <td>{submission.submittedAt ? timeAgo(submission.submittedAt) : "—"}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "payments" && (
        <div className={styles.tableWrap}>
          {task.payments.length === 0 ? (
            <div className={styles.empty}>No payments yet</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Receiver</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Network</th>
                  <th>TX Hash</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {task.payments.map((payment) => {
                  const receiver = payment.receiverAddress || payment.receiver || "";
                  return (
                    <tr key={payment.id || payment.txHash || receiver}>
                      <td><span className={styles.addr}>{receiver ? shortAddress(receiver) : "—"}</span></td>
                      <td>{payment.amount} {payment.tokenSymbol || ""}</td>
                      <td>{payment.method === "prize_pool_claim" ? "On-chain" : payment.method}</td>
                      <td>{payment.network || "—"}</td>
                      <td>
                        {payment.txHash ? (
                          <a href={payment.explorerUrl || "#"} target="_blank" rel="noopener noreferrer" className={styles.txLink}>
                            {shortAddress(payment.txHash)}
                          </a>
                        ) : "—"}
                      </td>
                      <td>{payment.createdAt ? timeAgo(payment.createdAt) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
