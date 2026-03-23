import crypto from "crypto";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseSignature,
  parseUnits,
  verifyTypedData
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { PaymentEntry, Task } from "./store";
import {
  XLAYER_CAIP2_NETWORK,
  XLAYER_CHAIN_ID,
  X402_SCHEME,
  X402_VERSION,
  buildTransferWithAuthorizationTypedData,
  decodeX402PaymentHeader,
  encodeBase64Json,
  formatBaseUnits,
  type X402Challenge,
  type X402PaymentPayload,
  type X402Requirement
} from "./x402Shared";

const DEFAULT_XLAYER_RPC_URL = "https://rpc.xlayer.tech";
const DEFAULT_XLAYER_EXPLORER_URL = "https://www.oklink.com/xlayer";
const DEFAULT_TIMEOUT_SECONDS = 300;
const DEFAULT_PROOF_PRICE = "0.01";

const DEFAULT_USDT = {
  symbol: "USDT",
  address: "0x779ded0c9e1022225f8e0630b35a9b54be713736",
  decimals: 6,
  name: "USD₮0",
  version: ""
};

const DEFAULT_USDC = {
  symbol: "USDC",
  address: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
  decimals: 6,
  name: "USD Coin",
  version: "2"
};

const transferWithAuthorizationAbi = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "transferWithAuthorization",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" }
    ],
    outputs: []
  }
] as const;

function normalizePrivateKey(value: string): `0x${string}` {
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
}

function normalizeExplorerBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function buildExplorerUrl(baseUrl: string, txHash: string): string {
  if (baseUrl.includes("{txHash}")) {
    return baseUrl.replace("{txHash}", txHash);
  }
  return `${normalizeExplorerBaseUrl(baseUrl)}/tx/${txHash}`;
}

function resolveDefaultAsset() {
  const preferred = String(process.env.XLAYER_X402_TOKEN || "USDT").trim().toUpperCase();
  if (preferred === "USDC") return DEFAULT_USDC;
  return DEFAULT_USDT;
}

function safeAddress(value: string, fallback = "") {
  if (isAddress(value)) return getAddress(value);
  if (fallback && isAddress(fallback)) return getAddress(fallback);
  return "";
}

function createChain(rpcUrl: string, explorerBaseUrl: string) {
  return defineChain({
    id: XLAYER_CHAIN_ID,
    name: "X Layer",
    nativeCurrency: {
      name: "OKB",
      symbol: "OKB",
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: [rpcUrl]
      }
    },
    blockExplorers: {
      default: {
        name: "X Layer Explorer",
        url: explorerBaseUrl
      }
    }
  });
}

function getX402Config() {
  const defaultAsset = resolveDefaultAsset();
  const rpcUrl = String(process.env.XLAYER_RPC_URL || DEFAULT_XLAYER_RPC_URL).trim();
  const explorerBaseUrl = normalizeExplorerBaseUrl(
    String(process.env.XLAYER_EXPLORER_BASE_URL || DEFAULT_XLAYER_EXPLORER_URL).trim()
  );
  const privateKey = String(
    process.env.XLAYER_X402_PRIVATE_KEY || process.env.XLAYER_SETTLEMENT_PRIVATE_KEY || ""
  ).trim();
  const facilitatorAccount = privateKey ? privateKeyToAccount(normalizePrivateKey(privateKey)) : null;
  const rawAssetAddress = String(
    process.env.XLAYER_X402_ASSET_ADDRESS || defaultAsset.address
  ).trim();
  const rawPayTo = String(
    process.env.XLAYER_X402_PAY_TO_ADDRESS ||
      process.env.XLAYER_SETTLEMENT_TO_ADDRESS ||
      facilitatorAccount?.address ||
      ""
  ).trim();
  const assetAddress = safeAddress(rawAssetAddress, defaultAsset.address);
  const payTo = safeAddress(rawPayTo, facilitatorAccount?.address || "");
  const symbol = String(process.env.XLAYER_X402_SYMBOL || defaultAsset.symbol).trim();
  const decimalsRaw = Number(process.env.XLAYER_X402_DECIMALS || defaultAsset.decimals);
  const decimals =
    Number.isFinite(decimalsRaw) && Number.isInteger(decimalsRaw) && decimalsRaw >= 0
      ? decimalsRaw
      : defaultAsset.decimals;
  const name = String(process.env.XLAYER_X402_TOKEN_NAME || defaultAsset.name).trim();
  const version = String(process.env.XLAYER_X402_TOKEN_VERSION || defaultAsset.version).trim();
  const proofPriceDisplay = String(process.env.XLAYER_X402_PROOF_PRICE || DEFAULT_PROOF_PRICE).trim();
  let proofPriceBaseUnits = parseUnits(DEFAULT_PROOF_PRICE, decimals).toString();
  try {
    proofPriceBaseUnits = parseUnits(proofPriceDisplay || DEFAULT_PROOF_PRICE, decimals).toString();
  } catch {
    proofPriceBaseUnits = parseUnits(DEFAULT_PROOF_PRICE, decimals).toString();
  }
  const enabled =
    Boolean(privateKey) && Boolean(facilitatorAccount) && Boolean(assetAddress) && Boolean(payTo);

  return {
    enabled,
    rpcUrl,
    explorerBaseUrl,
    privateKey,
    facilitatorAccount,
    assetAddress,
    payTo,
    symbol,
    decimals,
    name,
    version,
    proofPriceDisplay,
    proofPriceBaseUnits
  };
}

function getEvidenceHash(task: Task): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        task.evidence.map((item) => ({
          by: item.by,
          type: item.type,
          content: item.content
        }))
      )
    )
    .digest("hex");
}

export function getX402ConfigurationHint(): string {
  const config = getX402Config();
  if (config.enabled) {
    return `Configured for local x402 settlement on X Layer using ${config.symbol}.`;
  }
  return "Configure XLAYER_SETTLEMENT_PRIVATE_KEY or XLAYER_X402_PRIVATE_KEY, then fund the facilitator wallet with OKB gas to unlock x402 proof bundles.";
}

export function isX402Configured(): boolean {
  return getX402Config().enabled;
}

export function buildTaskVerificationBundle(task: Task) {
  const generatedAt = new Date().toISOString();
  const verificationEvidence = task.evidence
    .filter((item) => item.type === "note" || item.type === "photo")
    .map((item) => ({
      by: item.by,
      type: item.type,
      content: item.content,
      createdAt: item.createdAt
    }));

  const bundle = {
    taskId: task.id,
    title: task.title,
    status: task.status,
    acceptance: task.acceptance,
    campaign: task.campaign || null,
    assignee: task.assignee || null,
    evidenceCount: task.evidence.length,
    evidenceHash: getEvidenceHash(task),
    verificationEvidence,
    generatedAt
  };

  const bundleHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(bundle))
    .digest("hex");

  return {
    ...bundle,
    bundleHash
  };
}

export function createTaskVerificationChallenge(input: {
  task: Task;
  resource: string;
  bundleHash: string;
}): X402Challenge {
  const config = getX402Config();
  const description = `Unlock the verification bundle for ${input.task.title}. Bundle hash ${input.bundleHash.slice(
    0,
    12
  )}…`;

  return {
    x402Version: X402_VERSION,
    accepts: [
      {
        scheme: X402_SCHEME,
        network: XLAYER_CAIP2_NETWORK,
        maxAmountRequired: config.proofPriceBaseUnits,
        resource: input.resource,
        description,
        mimeType: "application/json",
        payTo: config.payTo,
        maxTimeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
        asset: config.assetAddress,
        extra: {
          symbol: config.symbol,
          decimals: config.decimals,
          name: config.name,
          version: config.version || undefined,
          displayAmount: config.proofPriceDisplay,
          resourceType: "verification_bundle"
        }
      }
    ]
  };
}

function getRequirementFromChallenge(challenge: X402Challenge): X402Requirement {
  const requirement = challenge.accepts?.[0];
  if (!requirement) {
    throw new Error("Missing x402 payment requirement.");
  }
  return requirement;
}

function validatePaymentPayload(payment: X402PaymentPayload, requirement: X402Requirement) {
  if (payment.x402Version !== X402_VERSION) {
    throw new Error(`Unsupported x402 version ${payment.x402Version}.`);
  }

  if (payment.scheme !== X402_SCHEME) {
    throw new Error(`Unsupported x402 scheme ${payment.scheme}.`);
  }

  if (payment.network !== requirement.network) {
    throw new Error(`Unsupported x402 network ${payment.network}.`);
  }

  if (!payment.payload?.signature) {
    throw new Error("Missing x402 signature.");
  }

  const authorization = payment.payload.authorization;
  if (!authorization) {
    throw new Error("Missing x402 authorization payload.");
  }

  if (getAddress(authorization.to) !== getAddress(requirement.payTo)) {
    throw new Error("x402 authorization receiver does not match the challenge payTo address.");
  }

  if (String(authorization.value) !== String(requirement.maxAmountRequired)) {
    throw new Error("x402 authorization amount does not match the required amount.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const validAfter = Number(authorization.validAfter);
  const validBefore = Number(authorization.validBefore);

  if (!Number.isFinite(validAfter) || validAfter > nowSeconds) {
    throw new Error("x402 authorization is not yet valid.");
  }
  if (!Number.isFinite(validBefore) || validBefore <= nowSeconds) {
    throw new Error("x402 authorization has expired.");
  }
}

async function verifyPaymentSignature(payment: X402PaymentPayload, requirement: X402Requirement) {
  const authorization = payment.payload.authorization;
  const typedData = buildTransferWithAuthorizationTypedData(requirement, authorization);
  const verified = await verifyTypedData({
    address: getAddress(authorization.from),
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: {
      from: getAddress(authorization.from),
      to: getAddress(authorization.to),
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce as `0x${string}`
    },
    signature: payment.payload.signature as `0x${string}`
  });

  if (!verified) {
    throw new Error("x402 signature verification failed.");
  }
}

export async function settleTaskVerificationPayment(input: {
  paymentHeader: string;
  challenge: X402Challenge;
}) {
  const config = getX402Config();
  if (!config.enabled || !config.facilitatorAccount) {
    throw new Error(getX402ConfigurationHint());
  }

  const requirement = getRequirementFromChallenge(input.challenge);
  const payment = decodeX402PaymentHeader(input.paymentHeader);
  validatePaymentPayload(payment, requirement);
  await verifyPaymentSignature(payment, requirement);

  const chain = createChain(config.rpcUrl, config.explorerBaseUrl);
  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl)
  });
  const walletClient = createWalletClient({
    account: config.facilitatorAccount,
    chain,
    transport: http(config.rpcUrl)
  });

  const { v, r, s } = parseSignature(payment.payload.signature as `0x${string}`);
  const authorization = payment.payload.authorization;
  if (!r || !s || v === undefined || v === null) {
    throw new Error("Invalid x402 signature payload.");
  }
  const txHash = await walletClient.writeContract({
    address: requirement.asset as `0x${string}`,
    abi: transferWithAuthorizationAbi,
    functionName: "transferWithAuthorization",
    args: [
      authorization.from as `0x${string}`,
      authorization.to as `0x${string}`,
      BigInt(authorization.value),
      BigInt(authorization.validAfter),
      BigInt(authorization.validBefore),
      authorization.nonce as `0x${string}`,
      Number(v),
      r,
      s
    ]
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("x402 settlement transaction did not succeed.");
  }

  return {
    amount: formatUnits(BigInt(authorization.value), Number(requirement.extra?.decimals || config.decimals)),
    amountBaseUnits: String(authorization.value),
    payerAddress: getAddress(authorization.from),
    receiverAddress: getAddress(authorization.to),
    tokenSymbol: String(requirement.extra?.symbol || config.symbol),
    tokenAddress: getAddress(requirement.asset),
    txHash,
    explorerUrl: buildExplorerUrl(config.explorerBaseUrl, txHash),
    network: "xlayer-mainnet" as const,
    chainId: XLAYER_CHAIN_ID,
    paymentResponseHeader: encodeBase64Json({
      method: "x402_exact",
      txHash,
      payer: getAddress(authorization.from),
      amount: String(authorization.value),
      tokenSymbol: String(requirement.extra?.symbol || config.symbol),
      network: XLAYER_CAIP2_NETWORK
    })
  };
}

export function buildTaskVerificationAccessPayment(input: {
  task: Task;
  settlement: Awaited<ReturnType<typeof settleTaskVerificationPayment>>;
}): PaymentEntry {
  return {
    id: crypto.randomUUID(),
    taskId: input.task.id,
    idempotencyKey: `x402_access:${input.task.id}:${input.settlement.payerAddress}`,
    amount: input.settlement.amount,
    receiver: "Verification Bundle",
    receiverAddress: input.settlement.receiverAddress,
    method: "x402_exact",
    status: "paid",
    source: "x402_access",
    network: input.settlement.network,
    chainId: input.settlement.chainId,
    tokenSymbol: input.settlement.tokenSymbol,
    tokenAddress: input.settlement.tokenAddress,
    txHash: input.settlement.txHash,
    explorerUrl: input.settlement.explorerUrl,
    payerAddress: input.settlement.payerAddress,
    createdAt: new Date().toISOString()
  };
}

export function getTaskVerificationPriceLabel(): string {
  const config = getX402Config();
  return `${config.proofPriceDisplay} ${config.symbol}`;
}

export function getTaskVerificationAssetSummary() {
  const config = getX402Config();
  return {
    symbol: config.symbol,
    decimals: config.decimals,
    assetAddress: config.assetAddress,
    name: config.name,
    version: config.version || undefined,
    payTo: config.payTo,
    enabled: config.enabled,
    priceLabel: getTaskVerificationPriceLabel(),
    priceBaseUnits: config.proofPriceBaseUnits,
    formattedBaseUnits: formatBaseUnits(config.proofPriceBaseUnits, config.decimals)
  };
}
