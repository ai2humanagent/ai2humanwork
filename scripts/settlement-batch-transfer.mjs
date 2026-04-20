import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  erc20Abi,
  formatEther,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseUnits
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const SETTLEMENT_RAILS = {
  bnb: {
    rpcUrl: "https://bsc-dataseed.bnbchain.org",
    explorerUrl: "https://bscscan.com",
    chainId: 56,
    tokenDecimals: 18,
    symbol: "USDT",
    prefix: "BNB"
  },
  xlayer: {
    rpcUrl: "https://xlayer.drpc.org",
    explorerUrl: "https://www.oklink.com/xlayer",
    chainId: 196,
    tokenDecimals: 6,
    symbol: "USDT0",
    prefix: "XLAYER"
  }
};

function loadDotEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  const contents = fs.readFileSync(filepath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
}

function normalizePrivateKey(value) {
  return value.startsWith("0x") ? value : `0x${value}`;
}

function normalizeRecipient(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("XKO")) return `0x${raw.slice(3)}`;
  return raw;
}

function resolveChainId(value) {
  const parsed = Number(value || DEFAULT_CHAIN_ID);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_CHAIN_ID;
}

function resolveDecimals(value) {
  const parsed = Number(value || DEFAULT_TOKEN_DECIMALS);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_TOKEN_DECIMALS;
}

function normalizeExplorerBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function buildExplorerUrl(baseUrl, txHash) {
  const normalizedBase = normalizeExplorerBaseUrl(baseUrl || DEFAULT_EXPLORER_URL);
  if (normalizedBase.includes("{txHash}")) return normalizedBase.replace("{txHash}", txHash);
  return `${normalizedBase}/tx/${txHash}`;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/settlement-batch-transfer.mjs --rail=bnb <amount> <recipient1> <recipient2> ...",
    "",
    "Simulation only (default):",
    "  node scripts/settlement-batch-transfer.mjs --rail=bnb 0.01 0x... 0x...",
    "",
    "Broadcast real transactions (requires explicit confirmation):",
    "  node scripts/settlement-batch-transfer.mjs --rail=bnb 0.01 0x... 0x... --broadcast --confirm=SEND",
    "",
    "Notes:",
    "  - Reads settlement config from .env.local (BNB_* or XLAYER_* vars).",
    "  - Recipients may be 0x... or XKO<hex> on the X Layer rail.",
    "  - --no-wait will submit txs without waiting for receipts."
  ].join("\n");
}

function exitWith(message) {
  console.error(`[batch-transfer] FAIL ${message}`);
  process.exit(1);
}

loadDotEnvFile(path.resolve(".env.local"));

const argv = process.argv.slice(2);
let broadcast = false;
let noWait = false;
let confirm = "";
let rail = "bnb";
const positional = [];

for (const arg of argv) {
  if (arg.startsWith("--rail=")) {
    rail = arg.slice("--rail=".length).trim().toLowerCase();
    continue;
  }
  if (arg === "--broadcast") {
    broadcast = true;
    continue;
  }
  if (arg === "--no-wait") {
    noWait = true;
    continue;
  }
  if (arg.startsWith("--confirm=")) {
    confirm = arg.slice("--confirm=".length);
    continue;
  }
  positional.push(arg);
}

if (positional.length < 2) exitWith(usage());

const railConfig = SETTLEMENT_RAILS[rail];
if (!railConfig) exitWith("unsupported rail. Use --rail=bnb or --rail=xlayer");

const amountDisplay = String(positional[0] || "").trim();
const recipients = positional.slice(1).map(normalizeRecipient).filter(Boolean);

if (!amountDisplay) exitWith("missing amount");
if (!recipients.length) exitWith("missing recipients");

const prefix = railConfig.prefix;
const rpcUrl = String(process.env[`${prefix}_RPC_URL`] || railConfig.rpcUrl).trim();
const explorerBaseUrl = String(
  process.env[`${prefix}_EXPLORER_BASE_URL`] || railConfig.explorerUrl
).trim();
const chainId = resolveChainId(process.env[`${prefix}_CHAIN_ID`] || railConfig.chainId);
const privateKey = String(
  process.env[`${prefix}_SETTLEMENT_PRIVATE_KEY`] ||
    process.env[`${prefix}_PRIVATE_KEY`] ||
    process.env.EVM_SETTLEMENT_PRIVATE_KEY ||
    (rail === "bnb" ? process.env.XLAYER_SETTLEMENT_PRIVATE_KEY : "") ||
    ""
).trim();
const tokenAddress = String(
  process.env[`${prefix}_SETTLEMENT_TOKEN_ADDRESS`] ||
    (rail === "bnb" ? "0x55d398326f99059fF775485246999027B3197955" : "")
).trim();
const tokenSymbol = String(process.env[`${prefix}_SETTLEMENT_TOKEN_SYMBOL`] || railConfig.symbol).trim();
const tokenDecimals = resolveDecimals(
  process.env[`${prefix}_SETTLEMENT_TOKEN_DECIMALS`] || railConfig.tokenDecimals
);
const nativeSymbol = rail === "bnb" ? "BNB" : "OKB";

if (!privateKey) exitWith(`missing ${prefix}_SETTLEMENT_PRIVATE_KEY`);
if (!tokenAddress || !isAddress(tokenAddress)) exitWith(`invalid ${prefix}_SETTLEMENT_TOKEN_ADDRESS`);

for (const recipient of recipients) {
  if (!isAddress(recipient)) exitWith(`invalid recipient address: ${recipient}`);
}

if (broadcast && confirm !== "SEND") {
  exitWith(
    "broadcast requires explicit confirmation. Re-run with --broadcast --confirm=SEND."
  );
}

const chain = defineChain({
  id: chainId,
  name: rail === "bnb" ? "BNB Chain" : "X Layer",
  nativeCurrency: {
    name: nativeSymbol,
    symbol: nativeSymbol,
    decimals: 18
  },
  rpcUrls: {
      default: {
        http: [rpcUrl]
      }
  },
  blockExplorers: {
      default: {
        name: rail === "bnb" ? "BscScan" : "X Layer Explorer",
        url: normalizeExplorerBaseUrl(explorerBaseUrl || railConfig.explorerUrl)
      }
  }
});

const account = privateKeyToAccount(normalizePrivateKey(privateKey));
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

async function main() {
  const transferValue = parseUnits(amountDisplay, tokenDecimals);
  const token = getAddress(tokenAddress);
  const normalizedRecipients = recipients.map((value) => getAddress(value));
  const totalNeeded = transferValue * BigInt(normalizedRecipients.length);

  console.log(
    `[batch-transfer] mode=${broadcast ? "broadcast" : "simulate"} rail=${rail} chainId=${chainId} rpc=${rpcUrl}`
  );
  console.log(`[batch-transfer] signer=${account.address}`);
  console.log(`[batch-transfer] token=${tokenSymbol} ${token} decimals=${tokenDecimals}`);
  console.log(
    `[batch-transfer] recipients=${normalizedRecipients.length} amountEach=${amountDisplay} totalNeeded=${formatUnits(
      totalNeeded,
      tokenDecimals
    )}`
  );

  const [nativeBalance, tokenBalanceRaw] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address]
    })
  ]);

  const tokenBalance = BigInt(tokenBalanceRaw);
  console.log(`[batch-transfer] ${nativeSymbol}Balance=${formatEther(nativeBalance)}`);
  console.log(`[batch-transfer] ${tokenSymbol}Balance=${formatUnits(tokenBalance, tokenDecimals)}`);

  if (nativeBalance <= 0n) exitWith(`signer has no ${rail === "bnb" ? "BNB" : "OKB"} for gas`);
  if (tokenBalance < totalNeeded) exitWith(`insufficient ${tokenSymbol} balance for requested batch`);

  // Always simulate first to catch obvious failures without sending transactions.
  for (const recipient of normalizedRecipients) {
    await publicClient.simulateContract({
      account,
      address: token,
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient, transferValue]
    });
    console.log(`[batch-transfer] simulate ok recipient=${recipient}`);
  }

  if (!broadcast) {
    console.log("[batch-transfer] PASS (simulation only, no transactions sent)");
    return;
  }

  console.log("[batch-transfer] broadcasting real transfers...");
  const txs = [];
  for (const recipient of normalizedRecipients) {
    const txHash = await walletClient.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient, transferValue]
    });
    txs.push({ recipient, txHash });
    console.log(`[batch-transfer] sent recipient=${recipient} tx=${txHash}`);

    if (!noWait) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        exitWith(`transfer failed recipient=${recipient} tx=${txHash}`);
      }
      console.log(`[batch-transfer] confirmed tx=${txHash}`);
      console.log(`[batch-transfer] explorer=${buildExplorerUrl(explorerBaseUrl, txHash)}`);
    }
  }

  console.log(`[batch-transfer] DONE txCount=${txs.length}`);
}

main().catch((error) => {
  exitWith(error instanceof Error ? error.message : String(error));
});
