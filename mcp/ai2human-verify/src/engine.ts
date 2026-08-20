import crypto from "crypto";
import type {
  CheckResult,
  EvidenceDimension,
  PolicyConfig,
  Receipt,
  VerifyConfig,
  VerificationRecord,
  Verdict
} from "./types.js";

const store = new Map<string, VerificationRecord>();

export function hashJson(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? {})).digest("hex");
}

function dimensionPresent(evidence: EvidenceDimension, dimension: string): boolean {
  switch (dimension) {
    case "identity":
      return Boolean(evidence.identity?.accountId || evidence.identity?.walletAddress || evidence.identity?.personId);
    case "time":
      return Boolean(evidence.time?.capturedAt || evidence.time?.timestamp);
    case "location":
      return Boolean(evidence.location?.gps || evidence.location?.place);
    case "content":
      return Boolean(
        evidence.content?.text ||
          evidence.content?.url ||
          evidence.content?.imageHashes?.length ||
          evidence.content?.artifactHash ||
          evidence.content?.referenceId
      );
    case "process":
      return Boolean(evidence.process?.deviceId || evidence.process?.source || evidence.process?.draftsHash);
    case "corroboration":
      return Boolean(evidence.corroboration?.refs?.length || evidence.corroboration?.confirmations?.length);
    default:
      return true;
  }
}

export class PolicyNotFoundError extends Error {
  constructor(claimType: string) {
    super(`Unknown claimType "${claimType}". Call list_policies for available policies.`);
    this.name = "PolicyNotFoundError";
  }
}

export async function runClaim(input: {
  claimType: string;
  evidence: EvidenceDimension;
  config?: VerifyConfig;
  registry: Record<string, PolicyConfig>;
}): Promise<VerificationRecord> {
  const policy = input.registry[input.claimType];
  if (!policy) throw new PolicyNotFoundError(input.claimType);

  const evidence = input.evidence || {};
  const config: VerifyConfig = { ...(input.config || {}) };
  const missing = policy.evidenceRequirements
    .filter((req) => req.required && !dimensionPresent(evidence, req.dimension))
    .map((req) => req.dimension);

  const checks: CheckResult[] = [];
  for (const check of policy.checks) {
    try {
      const result = await check.run({ policy, evidence, config });
      checks.push(result);
    } catch (err) {
      checks.push({
        name: check.name,
        passed: false,
        detail: err instanceof Error ? err.message.slice(0, 240) : "check failed"
      });
    }
  }

  const hasInconclusive = checks.some((c) => c.inconclusive);
  const failed = checks.filter((c) => !c.passed);
  let verdict: Verdict;
  if (missing.length > 0) {
    verdict = "resubmit";
  } else if (hasInconclusive) {
    verdict = "manual_review";
  } else if (failed.length > 0) {
    verdict = "fail";
  } else {
    verdict = "pass";
  }

  const statusMap: Record<Verdict, VerificationRecord["status"]> = {
    pass: "passed",
    fail: "failed",
    resubmit: "resubmission",
    manual_review: "manual_review"
  };

  const verificationId = `v_${crypto.randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();
  const record: VerificationRecord = {
    verificationId,
    claimType: input.claimType,
    policy: { policyId: policy.policyId, version: policy.version, level: policy.level },
    status: statusMap[verdict],
    verdict,
    checks,
    missing,
    evidence,
    createdAt: now,
    updatedAt: now
  };

  if (verdict === "pass" || verdict === "fail") {
    const claimHash = hashJson({ claimType: input.claimType, claim: policy.claim });
    const evidenceHash = hashJson(evidence);
    const checksHash = hashJson(checks);
    const receipt: Receipt = {
      schemaVersion: 1,
      receiptId: `r_${crypto.randomUUID().slice(0, 12)}`,
      verificationId,
      claimHash,
      evidenceHash,
      checksHash,
      verdict,
      signer: "ai2human-verify",
      issuedAt: now
    };
    record.receipt = receipt;
  }

  store.set(verificationId, record);
  return record;
}

export function getVerification(verificationId: string): VerificationRecord | null {
  return store.get(String(verificationId || "").trim()) || null;
}

export function listPolicies(registry: Record<string, PolicyConfig>) {
  return Object.values(registry).map((policy) => ({
    policyId: policy.policyId,
    version: policy.version,
    level: policy.level,
    claim: policy.claim,
    evidenceRequirements: policy.evidenceRequirements
  }));
}
