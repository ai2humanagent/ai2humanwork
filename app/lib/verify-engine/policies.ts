// Mirror of mcp/ai2human-verify/src (web build). Keep in sync with the MCP package.
import type { CheckContext, PolicyConfig } from "./types";
import { verifyXPostClaim } from "./verifyXPost";
import { verifyWalletClaim } from "./verifyWallet";
import { checkDeliveryReference, isPlausibleGps, isValidImageHash } from "./mockEvidence";
import { checkMembership } from "./mockMembership";

// One account + one public post per program: used to reject duplicate claims.
const usedEligibilityClaims = new Set<string>();

export const policies: Record<string, PolicyConfig> = {
  x_post_claim: {
    policyId: "x_post_claim",
    version: 1,
    level: "L2",
    claim: "A public X post exists and matches the campaign requirements",
    evidenceRequirements: [
      { dimension: "content", required: true, note: "content.url = the public x.com/twitter status URL" }
    ],
    checks: [
      {
        name: "capture",
        run: ({ evidence }: CheckContext) => {
          const url = evidence.content?.url;
          return url
            ? { name: "capture", passed: true, detail: url }
            : { name: "capture", passed: false, detail: "content.url is required" };
        }
      },
      {
        name: "verify_live_post",
        run: async ({ evidence, config }: CheckContext) => {
          const result = await verifyXPostClaim({
            postUrl: evidence.content?.url || "",
            expectedAuthorHandle: config.expectedAuthorHandle,
            requiredHashtags: config.requiredHashtags,
            requiredMentions: config.requiredMentions,
            contentKeywords: config.contentKeywords,
            maxAgeHours: config.maxAgeHours
          });
          const failed = result.checks.filter((c) => !c.passed);
          return {
            name: "verify_live_post",
            passed: result.verdict === "pass",
            detail: failed.length
              ? failed.map((c) => `${c.name}: ${c.detail}`).join("; ")
              : `post verified (author ${result.evidence?.authorHandle || "unknown"})`,
            inconclusive: result.verdict === "unverifiable"
          };
        }
      }
    ]
  },

  wallet_claim: {
    policyId: "wallet_claim",
    version: 1,
    level: "L2",
    claim: "An on-chain wallet satisfies the configured balance or transaction requirements",
    evidenceRequirements: [
      { dimension: "identity", required: true, note: "identity.walletAddress" }
    ],
    checks: [
      {
        name: "onchain_check",
        run: async ({ evidence, config }: CheckContext) => {
          const result = await verifyWalletClaim({
            chain: config.chain as "base" | "ethereum" | undefined,
            walletAddress: evidence.identity?.walletAddress || "",
            tokenAddress: config.tokenAddress,
            minTokenBalance: config.minTokenBalance,
            minNativeBalance: config.minNativeBalance,
            transactionHash: config.transactionHash
          });
          const failed = result.checks.filter((c) => !c.passed);
          return {
            name: "onchain_check",
            passed: result.verdict === "pass",
            detail: failed.length
              ? failed.map((c) => `${c.name}: ${c.detail}`).join("; ")
              : "on-chain checks passed",
            inconclusive: result.verdict === "unverifiable"
          };
        }
      }
    ]
  },

  delivery_confirmed: {
    policyId: "delivery_confirmed",
    version: 1,
    level: "L3",
    claim: "A package was actually delivered at the claimed time and place",
    evidenceRequirements: [
      { dimension: "identity", required: false, note: "identity.accountId (delivery partner id)" },
      { dimension: "time", required: true, note: "time.capturedAt (ISO timestamp)" },
      { dimension: "location", required: true, note: "location.gps {lat,lng}" },
      { dimension: "content", required: true, note: "content.referenceId + content.imageHashes" }
    ],
    checks: [
      {
        name: "capture",
        run: ({ evidence }: CheckContext) => {
          const ref = evidence.content?.referenceId;
          const capturedAt = evidence.time?.capturedAt;
          if (!ref || !capturedAt) {
            return { name: "capture", passed: false, detail: "referenceId and capturedAt are required" };
          }
          return { name: "capture", passed: true, detail: `order ${ref} captured at ${capturedAt}` };
        }
      },
      {
        name: "integrity",
        run: ({ evidence }: CheckContext) => {
          const hashes = evidence.content?.imageHashes || [];
          if (hashes.length === 0) {
            return { name: "integrity", passed: false, detail: "at least one image hash required" };
          }
          const invalid = hashes.filter((h) => !isValidImageHash(h));
          return invalid.length
            ? { name: "integrity", passed: false, detail: `invalid hash format: ${invalid.join(", ")}` }
            : { name: "integrity", passed: true, detail: `${hashes.length} image hash(es) present` };
        }
      },
      {
        name: "authenticity",
        run: ({ evidence }: CheckContext) => {
          const source = evidence.process?.source || "unknown";
          const ok = source === "in_app_capture" || source === "unknown";
          return ok
            ? { name: "authenticity", passed: true, detail: `capture source: ${source}` }
            : { name: "authenticity", passed: false, detail: `untrusted capture source: ${source}` };
        }
      },
      {
        name: "consistency",
        run: ({ evidence }: CheckContext) => {
          const ref = evidence.content?.referenceId || "";
          const delivery = checkDeliveryReference(ref);
          if (!delivery.found) {
            return { name: "consistency", passed: false, detail: `delivery reference ${ref} not found` };
          }
          if (delivery.status !== "delivered") {
            return { name: "consistency", passed: false, detail: `order ${ref} is ${delivery.status}, not delivered` };
          }
          const captured = evidence.time?.capturedAt ? +new Date(evidence.time.capturedAt) : NaN;
          const delivered = +new Date(delivery.deliveredAt);
          const ok = Number.isFinite(captured) && Number.isFinite(delivered) && Math.abs(captured - delivered) < 3_600_000;
          return ok
            ? { name: "consistency", passed: true, detail: `order ${ref} delivered at ${delivery.deliveredAt}, capture within 1h` }
            : { name: "consistency", passed: false, detail: "capture time is far from delivery time" };
        }
      },
      {
        name: "judgment",
        run: ({ evidence }: CheckContext) => {
          const gps = evidence.location?.gps;
          if (!gps) return { name: "judgment", passed: false, detail: "gps required" };
          return isPlausibleGps(gps.lat, gps.lng)
            ? { name: "judgment", passed: true, detail: `gps (${gps.lat}, ${gps.lng}) plausible` }
            : { name: "judgment", passed: false, detail: "gps coordinates implausible", inconclusive: true };
        }
      },
      {
        name: "anchor",
        run: () => ({ name: "anchor", passed: true, detail: "receipt issued by engine" })
      }
    ]
  },

  eligibility_check: {
    policyId: "eligibility_check",
    version: 1,
    level: "L3",
    claim: "An account is an active member and posted publicly with the required campaign signals, once",
    evidenceRequirements: [
      { dimension: "identity", required: true, note: "identity.accountId (participant account)" },
      { dimension: "content", required: true, note: "content.url = the public social post URL" }
    ],
    checks: [
      {
        name: "membership",
        run: ({ evidence }: CheckContext) => {
          const accountId = evidence.identity?.accountId || "";
          const member = checkMembership(accountId);
          if (!member.found) {
            return { name: "membership", passed: false, detail: `account ${accountId || "?"} is not registered` };
          }
          const ok = member.status === "active";
          return {
            name: "membership",
            passed: ok,
            detail: ok
              ? `account ${accountId} active since ${member.memberSince}`
              : `account ${accountId} is ${member.status}`
          };
        }
      },
      {
        name: "social_proof",
        run: async ({ evidence, config }: CheckContext) => {
          const result = await verifyXPostClaim({
            postUrl: evidence.content?.url || "",
            expectedAuthorHandle: config.expectedAuthorHandle,
            requiredHashtags: config.requiredHashtags,
            requiredMentions: config.requiredMentions,
            contentKeywords: config.contentKeywords,
            maxAgeHours: config.maxAgeHours
          });
          const failed = result.checks.filter((c) => !c.passed);
          return {
            name: "social_proof",
            passed: result.verdict === "pass",
            detail: failed.length
              ? failed.map((c) => `${c.name}: ${c.detail}`).join("; ")
              : `post verified (author ${result.evidence?.authorHandle || "unknown"})`,
            inconclusive: result.verdict === "unverifiable"
          };
        }
      },
      {
        name: "dedupe",
        run: ({ evidence }: CheckContext) => {
          const key = `${evidence.identity?.accountId || "?"}:${evidence.content?.url || "?"}`;
          if (usedEligibilityClaims.has(key)) {
            return { name: "dedupe", passed: false, detail: "this account + post was already used for this program" };
          }
          usedEligibilityClaims.add(key);
          return { name: "dedupe", passed: true, detail: "first use" };
        }
      },
      {
        name: "anchor",
        run: () => ({ name: "anchor", passed: true, detail: "credential issued by engine" })
      }
    ]
  }
};
