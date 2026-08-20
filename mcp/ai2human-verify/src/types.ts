export type CheckResult = {
  name: string;
  passed: boolean;
  detail?: string;
  /** 不确定：需要人工复核（例如图片模糊、特征比对存疑） */
  inconclusive?: boolean;
};

export type Verdict = "pass" | "fail" | "resubmit" | "manual_review";

export type VerificationStatus = "pending" | "passed" | "failed" | "resubmission" | "manual_review";

export type EvidenceDimension = {
  identity?: { accountId?: string; walletAddress?: string; personId?: string };
  time?: { capturedAt?: string; timestamp?: string };
  location?: { gps?: { lat: number; lng: number }; place?: string };
  content?: {
    text?: string;
    url?: string;
    imageHashes?: string[];
    artifactHash?: string;
    referenceId?: string;
  };
  process?: { deviceId?: string; source?: string; draftsHash?: string };
  corroboration?: { refs?: string[]; confirmations?: string[] };
};

export type VerifyConfig = {
  level?: "L1" | "L2" | "L3" | "L4" | "L5";
  maxAgeHours?: number;
  expectedAuthorHandle?: string;
  requiredHashtags?: string[];
  requiredMentions?: string[];
  contentKeywords?: string[];
  tokenAddress?: string;
  minTokenBalance?: number;
  minNativeBalance?: number;
  transactionHash?: string;
  callbackUrl?: string;
  [key: string]: unknown;
};

export type CheckContext = {
  policy: PolicyConfig;
  evidence: EvidenceDimension;
  config: VerifyConfig;
};

export type CheckFn = (ctx: CheckContext) => Promise<CheckResult> | CheckResult;

export type PolicyConfig = {
  policyId: string;
  version: number;
  level: "L1" | "L2" | "L3" | "L4" | "L5";
  claim: string;
  evidenceRequirements: Array<{ dimension: string; required?: boolean; note?: string }>;
  checks: Array<{ name: string; run: CheckFn }>;
};

export type Receipt = {
  schemaVersion: number;
  receiptId: string;
  verificationId: string;
  claimHash: string;
  evidenceHash: string;
  checksHash: string;
  verdict: Exclude<Verdict, "resubmit" | "manual_review">;
  signer: string;
  issuedAt: string;
};

export type VerificationRecord = {
  verificationId: string;
  claimType: string;
  policy: { policyId: string; version: number; level: string };
  status: VerificationStatus;
  verdict: Verdict | null;
  checks: CheckResult[];
  missing: string[];
  evidence: EvidenceDimension;
  receipt?: Receipt;
  createdAt: string;
  updatedAt: string;
};
