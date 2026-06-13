import { getPrivyClient, isPrivyServerConfigured, type PrivyIdentity } from "./privy";
import type { Db, UserAccount } from "./store";

export type BoundXAccount = NonNullable<PrivyIdentity["xAccount"]>;

export function normalizeXHandle(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function hasUsableEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase();
  return Boolean(email && !email.endsWith("@privy.local") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

function userIdentityScore(user: UserAccount) {
  let score = 0;
  if (hasUsableEmail(user.contactEmail) || hasUsableEmail(user.email)) score += 4;
  if (user.xAccount?.username) score += 4;
  if (user.humanId) score += 2;
  if (user.privyUserId) score += 1;
  return score;
}

export function findUserByWallet(db: Db, wallet: string): UserAccount | null {
  const normalized = String(wallet || "").trim().toLowerCase();
  if (!normalized) return null;
  const matches = db.users.filter((user) => (user.walletAddress || "").toLowerCase() === normalized);
  if (!matches.length) return null;
  return [...matches].sort((a, b) => userIdentityScore(b) - userIdentityScore(a))[0];
}

export async function getBoundXAccountForUser(user: UserAccount | null): Promise<BoundXAccount | null> {
  if (!user) return null;
  if (user.xAccount) return user.xAccount;
  if (user.authProvider === "privy" && user.privyUserId && isPrivyServerConfigured()) {
    const privyUser = await getPrivyClient().getUser(user.privyUserId).catch(() => null);
    const account = privyUser?.linkedAccounts.find((item) => item.type === "twitter_oauth");
    if (account && account.type === "twitter_oauth" && account.subject && account.username) {
      return {
        subject: account.subject,
        username: account.username.replace(/^@/, ""),
        name: account.name || undefined,
        profilePictureUrl: account.profilePictureUrl || undefined
      };
    }
  }
  return user.xAccount || null;
}

export async function getBoundXAccountForWallet(db: Db, wallet: string) {
  const user = findUserByWallet(db, wallet);
  const xAccount = await getBoundXAccountForUser(user);
  return { user, xAccount };
}
