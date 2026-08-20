// Mirror of mcp/ai2human-verify/src (web build). Keep in sync with the MCP package.
// Mock membership registry for the eligibility demo.
// In production this would be a CRM / community platform / app database.

const MEMBERS: Record<string, { status: string; memberSince: string }> = {
  acct_alice: { status: "active", memberSince: "2026-01-01" },
  acct_bob: { status: "active", memberSince: "2026-02-01" },
  acct_carol: { status: "suspended", memberSince: "2026-03-01" }
};

export function checkMembership(accountId: string) {
  const member = MEMBERS[String(accountId || "").trim().toLowerCase()];
  if (!member) {
    return { found: false as const, status: "not_registered" as const };
  }
  return {
    found: true as const,
    status: member.status as "active" | "suspended",
    memberSince: member.memberSince
  };
}
