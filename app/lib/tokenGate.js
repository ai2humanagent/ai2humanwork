import { createPublicClient, defineChain, erc20Abi, formatUnits, http, isAddress, parseUnits } from "viem";

const DEFAULT_BASE_RPC_URL = "https://mainnet.base.org";
const DEFAULT_BASE_EXPLORER_URL = "https://basescan.org";

const ACTION_LABELS = {
  article_submit: "submit to this contest",
  quest_action: "do this task",
  reward_claim: "claim this reward",
  task_claim: "claim this task"
};

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeNetwork(value, chainId) {
  const raw = normalizeString(value).toLowerCase();
  if (raw) return raw;
  if (Number(chainId) === 8453) return "base";
  return "evm";
}

function getRpcUrl(gate) {
  if (gate.rpcUrl) return normalizeString(gate.rpcUrl);
  const chainId = Number(gate.chainId || 8453);
  if (chainId === 8453) return normalizeString(process.env.BASE_RPC_URL || DEFAULT_BASE_RPC_URL);
  const envKey = `EVM_RPC_URL_${chainId}`;
  return normalizeString(process.env[envKey] || process.env.EVM_RPC_URL || "");
}

function buildExplorerUrl(gate) {
  const chainId = Number(gate.chainId || 8453);
  if (gate.explorerUrl) return normalizeString(gate.explorerUrl).replace(/\/+$/, "");
  if (chainId === 8453) return normalizeString(process.env.BASE_EXPLORER_BASE_URL || DEFAULT_BASE_EXPLORER_URL).replace(/\/+$/, "");
  return "";
}

function buildChain(gate) {
  const chainId = Number(gate.chainId || 8453);
  const network = normalizeNetwork(gate.network, chainId);
  const rpcUrl = getRpcUrl(gate);
  const explorerUrl = buildExplorerUrl(gate);
  return defineChain({
    id: chainId,
    name: network === "base" ? "Base" : `EVM ${chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: explorerUrl ? { default: { name: "Explorer", url: explorerUrl } } : undefined
  });
}

function readRawTokenGate(task) {
  const campaign = task?.campaign || {};
  return campaign?.eligibility?.tokenGate || campaign?.tokenGate || null;
}

export function normalizeTokenGate(task) {
  const raw = readRawTokenGate(task);
  if (!raw || typeof raw !== "object") return null;
  if (raw.enabled === false) return null;

  const chainId = Number(raw.chainId || 8453);
  const decimals = Number(raw.decimals ?? 18);
  const minimumUsdValue = normalizeString(raw.minimumUsdValue || raw.minUsdValue || raw.minimumUsd || "");
  const priceUsd = normalizeString(raw.priceUsd || raw.tokenPriceUsd || "");
  const priceSource = normalizeString(raw.priceSource || (minimumUsdValue && !priceUsd ? "dexscreener" : ""));
  const minimumBalance = normalizeString(raw.minimumBalance || raw.minBalance || raw.minimum || (minimumUsdValue ? "" : "1"));
  const symbol = normalizeString(raw.symbol || raw.tokenSymbol || "TOKEN").replace(/^\$/, "");
  const contractAddress = normalizeString(raw.contractAddress || raw.tokenAddress);
  const requiredAt = Array.isArray(raw.requiredAt)
    ? raw.requiredAt.map((item) => normalizeString(item)).filter(Boolean)
    : [];

  return {
    enabled: true,
    chainId,
    network: normalizeNetwork(raw.network, chainId),
    contractAddress,
    symbol,
    decimals,
    minimumBalance,
    minimumUsdValue,
    priceUsd,
    priceSource,
    priceTokenAddress: normalizeString(raw.priceTokenAddress || raw.contractAddress || raw.tokenAddress),
    priceChainId: normalizeString(raw.priceChainId || raw.chainId || "base"),
    requiredAt,
    holderLabel: normalizeString(raw.holderLabel || `$${symbol} holder`),
    failureMessage: normalizeString(raw.failureMessage),
    rpcUrl: normalizeString(raw.rpcUrl),
    explorerUrl: normalizeString(raw.explorerUrl)
  };
}

export function shouldCheckTokenGate(task, action) {
  const gate = normalizeTokenGate(task);
  if (!gate) return false;
  if (!gate.requiredAt.length) return true;
  return gate.requiredAt.includes(action);
}

export function describeTokenGate(task) {
  const gate = normalizeTokenGate(task);
  if (!gate) return null;
  const network = gate.network === "base" ? "Base" : gate.network;
  const requirement = gate.minimumUsdValue
    ? `around ${gate.minimumUsdValue} USDC worth of $${gate.symbol}`
    : `${gate.minimumBalance} $${gate.symbol}`;
  return {
    label: gate.holderLabel || `$${gate.symbol} holder`,
    text: `Hold at least ${requirement} on ${network} to participate.`,
    symbol: gate.symbol,
    minimumBalance: gate.minimumBalance,
    minimumUsdValue: gate.minimumUsdValue,
    priceSource: gate.priceSource,
    network,
    chainId: gate.chainId,
    contractAddress: gate.contractAddress
  };
}

export function tokenGateErrorMessage(result, action = "quest_action") {
  const actionLabel = ACTION_LABELS[action] || "participate";
  const gate = result.gate;
  if (!gate) return "This activity has a token holder requirement.";
  if (gate.failureMessage) return gate.failureMessage;
  if (result.reason === "misconfigured") {
    return "This activity has a token holder requirement, but its eligibility settings are misconfigured. Ask the requester to fix the token gate.";
  }
  if (result.reason === "invalid_wallet") {
    return "Connect a valid wallet before continuing.";
  }
  if (result.reason === "rpc_unavailable") {
    return `Unable to check $${gate.symbol} holder access right now. Please try again later.`;
  }
  if (result.reason === "price_unavailable") {
    return `Unable to calculate the $${gate.symbol} holder threshold right now. Please try again later.`;
  }
  const requirement = gate.minimumUsdValue
    ? `around ${gate.minimumUsdValue} USDC worth of $${gate.symbol}`
    : `${gate.minimumBalance} $${gate.symbol}`;
  const balanceLabel = result.balanceFormatted ? ` Current balance: ${result.balanceFormatted} $${gate.symbol}.` : "";
  const thresholdLabel = result.minimumTokenBalance
    ? ` Required token balance at current price: ${result.minimumTokenBalance} $${gate.symbol}.`
    : "";
  return `Hold at least ${requirement} on ${gate.network === "base" ? "Base" : gate.network} to ${actionLabel}.${balanceLabel}${thresholdLabel}`;
}

export async function checkTokenGateForWallet(task, walletAddress, action = "quest_action", options = {}) {
  const gate = normalizeTokenGate(task);
  if (!gate || !shouldCheckTokenGate(task, action)) {
    return { required: false, ok: true, gate: null, reason: "not_required" };
  }

  if (!isAddress(walletAddress || "")) {
    return { required: true, ok: false, gate, reason: "invalid_wallet" };
  }
  if (!Number.isFinite(gate.chainId) || gate.chainId <= 0 || !Number.isFinite(gate.decimals) || gate.decimals < 0 || !isAddress(gate.contractAddress || "")) {
    return { required: true, ok: false, gate, reason: "misconfigured" };
  }

  let minimum;
  try {
    minimum = await resolveMinimumTokenBalance(gate, options);
  } catch {
    return { required: true, ok: false, gate, reason: gate.minimumUsdValue ? "price_unavailable" : "misconfigured" };
  }

  try {
    const balance = options.readBalance
      ? await options.readBalance({ gate, walletAddress })
      : await readErc20Balance(gate, walletAddress);
    const balanceFormatted = formatUnits(balance, gate.decimals);
    const minimumTokenBalance = formatUnits(minimum.baseUnits, gate.decimals);
    return {
      required: true,
      ok: balance >= minimum.baseUnits,
      gate,
      balance,
      balanceFormatted,
      minimumBaseUnits: minimum.baseUnits,
      minimumTokenBalance,
      priceUsd: minimum.priceUsd,
      minimumUsdValue: gate.minimumUsdValue,
      reason: balance >= minimum.baseUnits ? "eligible" : "insufficient_balance"
    };
  } catch (error) {
    return {
      required: true,
      ok: false,
      gate,
      reason: "rpc_unavailable",
      error: error instanceof Error ? error.message : "Unable to read token balance."
    };
  }
}

async function resolveMinimumTokenBalance(gate, options = {}) {
  if (gate.minimumBalance) {
    return { baseUnits: parseUnits(gate.minimumBalance, gate.decimals), priceUsd: gate.priceUsd || "" };
  }

  if (!gate.minimumUsdValue) {
    throw new Error("Missing minimumBalance or minimumUsdValue");
  }

  const priceUsd = await resolveTokenPriceUsd(gate, options);
  const minimum = decimalToPlain(Number(gate.minimumUsdValue) / priceUsd, 12);
  return { baseUnits: parseUnits(minimum, gate.decimals), priceUsd: String(priceUsd) };
}

async function resolveTokenPriceUsd(gate, options = {}) {
  if (options.readPriceUsd) {
    const price = Number(await options.readPriceUsd({ gate }));
    if (Number.isFinite(price) && price > 0) return price;
  }

  const configured = Number(gate.priceUsd);
  if (Number.isFinite(configured) && configured > 0) return configured;

  if (gate.priceSource === "dexscreener") {
    return fetchDexscreenerTokenPriceUsd(gate);
  }

  throw new Error("Missing token price source");
}

function decimalToPlain(value, maxDecimals = 12) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid decimal value");
  }
  return value
    .toFixed(maxDecimals)
    .replace(/\.?0+$/, "");
}

async function fetchDexscreenerTokenPriceUsd(gate) {
  const token = gate.priceTokenAddress || gate.contractAddress;
  if (!isAddress(token || "")) {
    throw new Error("Missing token address for DexScreener price");
  }
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 60 }
  });
  if (!response.ok) {
    throw new Error(`DexScreener price request failed: ${response.status}`);
  }
  const payload = await response.json();
  const pairs = Array.isArray(payload?.pairs) ? payload.pairs : [];
  const chainKey = String(gate.priceChainId || gate.network || "").toLowerCase();
  const matching = pairs
    .filter((pair) => {
      const chainId = String(pair.chainId || "").toLowerCase();
      return !chainKey || chainId === chainKey || (chainKey === "8453" && chainId === "base");
    })
    .sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0));
  const pair = matching[0] || pairs[0];
  const price = Number(pair?.priceUsd);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("DexScreener price unavailable");
  }
  return price;
}

async function readErc20Balance(gate, walletAddress) {
  const rpcUrl = getRpcUrl(gate);
  if (!rpcUrl) {
    throw new Error(`Missing RPC URL for chain ${gate.chainId}`);
  }
  const client = createPublicClient({
    chain: buildChain(gate),
    transport: http(rpcUrl)
  });
  return await client.readContract({
    address: gate.contractAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [walletAddress]
  });
}
