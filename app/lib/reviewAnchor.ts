import {
  concatHex,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  keccak256,
  stringToHex,
  toBytes
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChainConfig } from "./prizePoolContract";

export const ARTICLE_REVIEW_ANCHOR_PREFIX = "article_review_anchor:";
const REVIEW_ANCHOR_VERSION = "a2h-review-anchor-v1";
const DEFAULT_BASE_RPC_URLS = [
  "https://mainnet.base.org",
  "https://base-rpc.publicnode.com",
  "https://base.llamarpc.com",
  "https://base.meowrpc.com",
  "https://1rpc.io/base"
];

type EvidenceLike = {
  content?: string;
};

export type ReviewAnchorRecord = {
  version: string;
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
};

function normalizePrivateKey(value: string): `0x${string}` {
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
}

function buildExplorerUrl(baseUrl: string, txHash: string) {
  return `${baseUrl.replace(/\/+$/, "")}/tx/${txHash}`;
}

function parseRpcUrls(...values: Array<string | undefined>) {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const value of values) {
    for (const piece of String(value || "").split(/[,\n]/)) {
      const url = piece.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
  }
  for (const url of DEFAULT_BASE_RPC_URLS) {
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(",")}}`;
}

export function parseArticleReviewAnchor(evidence: EvidenceLike[] | undefined): ReviewAnchorRecord | null {
  if (!Array.isArray(evidence)) return null;
  for (let index = evidence.length - 1; index >= 0; index -= 1) {
    const content = String(evidence[index]?.content || "");
    if (!content.startsWith(ARTICLE_REVIEW_ANCHOR_PREFIX)) continue;
    try {
      return JSON.parse(content.slice(ARTICLE_REVIEW_ANCHOR_PREFIX.length)) as ReviewAnchorRecord;
    } catch {
      return null;
    }
  }
  return null;
}

function getReviewAnchorConfig() {
  const chainId = Number(process.env.BASE_CHAIN_ID || 8453);
  const rpcUrls = parseRpcUrls(
    process.env.REVIEW_ANCHOR_RPC_URLS,
    process.env.REVIEW_ANCHOR_RPC_URL,
    process.env.BASE_RPC_URL
  );
  const explorerBaseUrl = (process.env.BASE_EXPLORER_BASE_URL || "https://basescan.org").trim();
  const privateKey = String(
    process.env.REVIEW_ANCHOR_PRIVATE_KEY ||
      process.env.PRIZE_POOL_PRIVATE_KEY ||
      process.env.BASE_SETTLEMENT_PRIVATE_KEY ||
      process.env.BASE_PRIVATE_KEY ||
      ""
  ).trim();
  const config = getChainConfig(chainId);

  return {
    chainId,
    rpcUrls,
    explorerBaseUrl,
    privateKey,
    enabled: Boolean(privateKey),
    chain: config
  };
}

function buildViemChain(chainId: number) {
  const cfg = getChainConfig(chainId);
  if (!cfg) throw new Error(`Unsupported chain: ${chainId}`);
  return defineChain({
    id: chainId,
    name: cfg.name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [cfg.rpcUrl] } },
    blockExplorers: { default: { name: cfg.name, url: cfg.explorerUrl } }
  });
}

export function buildReviewAnchorHash(payload: unknown) {
  return keccak256(toBytes(stableStringify(payload)));
}

export async function anchorArticleReviewOnBase(input: {
  taskId: string;
  reviewedAt: string;
  reviewedCount: number;
  winnerCount: number;
  payload: unknown;
}) {
  const cfg = getReviewAnchorConfig();
  if (!cfg.enabled || !cfg.chain) {
    return { ok: false as const, error: "Review anchoring is not configured. Set REVIEW_ANCHOR_PRIVATE_KEY or BASE_SETTLEMENT_PRIVATE_KEY." };
  }

  const payloadJson = stableStringify(input.payload);
  const anchorHash = buildReviewAnchorHash(input.payload);
  const chain = buildViemChain(cfg.chainId);
  const account = privateKeyToAccount(normalizePrivateKey(cfg.privateKey));
  const data = concatHex([
    stringToHex("A2H_REVIEW_V1:"),
    anchorHash as `0x${string}`
  ]);

  const failures: string[] = [];
  for (const rpcUrl of cfg.rpcUrls) {
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl, { timeout: 20_000, retryCount: 1 })
    });
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl, { timeout: 20_000, retryCount: 1 })
    });
    try {
      const txHash = await walletClient.sendTransaction({
        account,
        to: account.address,
        value: BigInt(0),
        data
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
      const record: ReviewAnchorRecord = {
        version: REVIEW_ANCHOR_VERSION,
        chainId: cfg.chainId,
        network: cfg.chain?.name || "Base",
        txHash,
        explorerUrl: buildExplorerUrl(cfg.explorerBaseUrl, txHash),
        anchorHash,
        anchoredAt: new Date().toISOString(),
        signerAddress: account.address,
        payload: {
          taskId: input.taskId,
          reviewedAt: input.reviewedAt,
          reviewedCount: input.reviewedCount,
          winnerCount: input.winnerCount
        }
      };
      return {
        ok: true as const,
        record,
        payloadJson
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to anchor review on Base.";
      failures.push(`${rpcUrl} -> ${message}`);
    }
  }
  return {
    ok: false as const,
    error: failures.join(" | ")
  };
}
