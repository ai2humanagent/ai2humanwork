import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  createPublicClient,
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
  base: {
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    chainId: 8453,
    tokenDecimals: 6,
    symbol: "USDC",
    prefix: "BASE"
  },
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
const DEFAULT_AMOUNT = "0.01";

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
  if (raw.startsWith("XKO")) {
    return `0x${raw.slice(3)}`;
  }
  return raw;
}

function resolveChainId(value) {
  const parsed = Number(value || railConfig.chainId);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0
    ? parsed
    : railConfig.chainId;
}

function resolveDecimals(value) {
  const parsed = Number(value || railConfig.tokenDecimals);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 0
    ? parsed
    : railConfig.tokenDecimals;
}

function exitWith(message) {
  console.error(`[preflight] FAIL ${message}`);
  process.exit(1);
}

loadDotEnvFile(path.resolve(".env.local"));

const argv = process.argv.slice(2);
let rail = "bnb";
const positional = [];

for (const arg of argv) {
  if (arg.startsWith("--rail=")) {
    rail = arg.slice("--rail=".length).trim().toLowerCase();
    continue;
  }
  positional.push(arg);
}

const railConfig = SETTLEMENT_RAILS[rail];
if (!railConfig) {
  exitWith("unsupported rail. Use --rail=base, --rail=bnb or --rail=xlayer");
}

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
    (rail === "base" ? process.env.XLAYER_SETTLEMENT_PRIVATE_KEY : "") ||
    (rail === "bnb" ? process.env.XLAYER_SETTLEMENT_PRIVATE_KEY : "") ||
    ""
).trim();
const tokenAddress = String(
  process.env[`${prefix}_SETTLEMENT_TOKEN_ADDRESS`] ||
    (rail === "base" ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" : "") ||
    (rail === "bnb" ? "0x55d398326f99059fF775485246999027B3197955" : "")
).trim();
const tokenSymbol = String(process.env[`${prefix}_SETTLEMENT_TOKEN_SYMBOL`] || railConfig.symbol).trim();
const tokenDecimals = resolveDecimals(
  process.env[`${prefix}_SETTLEMENT_TOKEN_DECIMALS`] || railConfig.tokenDecimals
);
const nativeSymbol = rail === "base" ? "ETH" : rail === "bnb" ? "BNB" : "OKB";
const amountDisplay = String(positional[0] || DEFAULT_AMOUNT).trim();
const recipients = positional.slice(1).map(normalizeRecipient).filter(Boolean);

if (!privateKey) exitWith(`missing ${prefix}_SETTLEMENT_PRIVATE_KEY`);
if (!tokenAddress || !isAddress(tokenAddress)) exitWith(`invalid ${prefix}_SETTLEMENT_TOKEN_ADDRESS`);
if (!recipients.length) {
  exitWith(
    "provide at least one recipient: node scripts/settlement-preflight.mjs --rail=base 0.01 <addr1> <addr2>"
  );
}

for (const recipient of recipients) {
  if (!isAddress(recipient)) {
    exitWith(`invalid recipient address: ${recipient}`);
  }
}

const chain = defineChain({
  id: chainId,
  name: rail === "base" ? "Base" : rail === "bnb" ? "BNB Chain" : "X Layer",
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
        name: rail === "base" ? "BaseScan" : rail === "bnb" ? "BscScan" : "X Layer Explorer",
        url: explorerBaseUrl
      }
  }
});

const account = privateKeyToAccount(normalizePrivateKey(privateKey));
const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl)
});

const transferValue = parseUnits(amountDisplay, tokenDecimals);

async function main() {
  console.log(`[preflight] network=${rail} chainId=${chainId}`);
  console.log(`[preflight] signer=${account.address}`);
  console.log(`[preflight] token=${tokenSymbol} ${getAddress(tokenAddress)}`);
  console.log(`[preflight] recipients=${recipients.length} amountEach=${amountDisplay}`);

  const [nativeBalance, tokenBalanceRaw] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({
      address: getAddress(tokenAddress),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address]
    })
  ]);

  const tokenBalance = BigInt(tokenBalanceRaw);
  const totalNeeded = transferValue * BigInt(recipients.length);

  console.log(`[preflight] ${nativeSymbol}Balance=${formatEther(nativeBalance)}`);
  console.log(`[preflight] ${tokenSymbol}Balance=${formatUnits(tokenBalance, tokenDecimals)}`);
  console.log(`[preflight] totalNeeded=${formatUnits(totalNeeded, tokenDecimals)}`);

  if (nativeBalance <= 0n) {
    exitWith(`signer has no ${nativeSymbol} for gas`);
  }
  if (tokenBalance < totalNeeded) {
    exitWith(`insufficient ${tokenSymbol} balance for requested batch`);
  }

  for (const recipient of recipients) {
    const simulation = await publicClient.simulateContract({
      account,
      address: getAddress(tokenAddress),
      abi: erc20Abi,
      functionName: "transfer",
      args: [getAddress(recipient), transferValue]
    });

    console.log(
      `[preflight] recipient=${getAddress(recipient)} simulation=ok data=${String(
        simulation.result
      )}`
    );
  }

  console.log("[preflight] PASS settlement path is ready for real transfers");
}

main().catch((error) => {
  exitWith(error instanceof Error ? error.message : String(error));
});
