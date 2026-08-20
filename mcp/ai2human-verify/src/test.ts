import { getVerification, listPolicies, runClaim } from "./engine.js";
import { policies } from "./policies.js";

console.log("POLICIES:", listPolicies(policies).map((p) => `${p.policyId}@L${p.level}`).join(", "));

// 1. x_post_claim — real BaseCat tweet
const x = await runClaim({
  claimType: "x_post_claim",
  registry: policies,
  evidence: { content: { url: "https://x.com/BasecatOnBase/status/2089239292522443175" } },
  config: { expectedAuthorHandle: "@BasecatOnBase", requiredHashtags: ["#BASECAT"], contentKeywords: ["moon"] }
});
console.log(
  "X_POST:",
  x.status,
  x.verdict,
  x.checks.map((c) => `${c.name}=${c.passed ? "P" : "F"}${c.inconclusive ? "?" : ""}`).join(" "),
  x.receipt ? `receipt=${x.receipt.receiptId}` : "no-receipt"
);

// 2. wallet_claim — A2H holder on Base
const w = await runClaim({
  claimType: "wallet_claim",
  registry: policies,
  evidence: { identity: { walletAddress: "0xcb8a93c9ec80293351146e5aee5f5110db524e73" } },
  config: { chain: "base", tokenAddress: "0xc46C41005A1A88B0C1491F2B542A4831D6d1EbA3", minTokenBalance: 1 }
});
console.log(
  "WALLET:",
  w.status,
  w.verdict,
  w.checks.map((c) => `${c.name}=${c.passed ? "P" : "F"}${c.inconclusive ? "?" : ""}`).join(" "),
  w.receipt ? `receipt=${w.receipt.receiptId}` : "no-receipt"
);

// 3. delivery_confirmed — pass path (mock ORD-1001)
const dPass = await runClaim({
  claimType: "delivery_confirmed",
  registry: policies,
  evidence: {
    identity: { accountId: "rider_1024" },
    time: { capturedAt: "2026-08-20T12:30:00Z" },
    location: { gps: { lat: 31.23, lng: 121.47 } },
    content: { referenceId: "ORD-1001", imageHashes: [`sha256:${"a".repeat(64)}`] },
    process: { source: "in_app_capture" }
  }
});
console.log(
  "DELIVERY_PASS:",
  dPass.status,
  dPass.verdict,
  dPass.checks.map((c) => `${c.name}=${c.passed ? "P" : "F"}`).join(" "),
  dPass.receipt ? `receipt=${dPass.receipt.receiptId}` : "no-receipt"
);

// 4. delivery_confirmed — fail path (unknown reference)
const dFail = await runClaim({
  claimType: "delivery_confirmed",
  registry: policies,
  evidence: {
    time: { capturedAt: "2026-08-20T12:30:00Z" },
    location: { gps: { lat: 31.23, lng: 121.47 } },
    content: { referenceId: "ORD-9999", imageHashes: [`sha256:${"b".repeat(64)}`] },
    process: { source: "in_app_capture" }
  }
});
console.log(
  "DELIVERY_FAIL:",
  dFail.status,
  dFail.verdict,
  dFail.checks.map((c) => `${c.name}=${c.passed ? "P" : "F"}`).join(" "),
  dFail.receipt ? `receipt=${dFail.receipt.receiptId}` : "no-receipt"
);

// 5. delivery_confirmed — resubmit path (missing evidence)
const dMissing = await runClaim({
  claimType: "delivery_confirmed",
  registry: policies,
  evidence: { content: { referenceId: "ORD-1001" } }
});
console.log(
  "DELIVERY_RESUBMIT:",
  dMissing.status,
  dMissing.verdict,
  "missing:",
  dMissing.missing.join(","),
  dMissing.receipt ? "receipt" : "no-receipt"
);

// 6. get_verification round-trip
const fetched = getVerification(dPass.verificationId);
console.log("GET_VERIFICATION:", fetched?.verificationId === dPass.verificationId ? "ok" : "mismatch", fetched?.receipt ? "receipt-ok" : "no-receipt");
