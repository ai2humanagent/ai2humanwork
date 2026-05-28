import { getPrivyClient, isPrivyServerConfigured, type PrivyIdentity } from "./privy";
import type { Db, UserAccount } from "./store";

export type BoundXAccount = NonNullable<PrivyIdentity["xAccount"]>;

export function normalizeXHandle(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

export function findUserByWallet(db: Db, wallet: string): UserAccount | null {
  const normalized = String(wallet || "").trim().toLowerCase();
  if (!normalized) return null;
  return db.users.find((user) => (user.walletAddress || "").toLowerCase() === normalized) || null;
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
