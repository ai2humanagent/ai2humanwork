import {
  createPublicClient,
  createWalletClient,
  defineChain,
  erc20Abi,
  formatUnits,
  http,
  isAddress,
  parseUnits
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export type SettlementMethod = "mock_x402" | "xlayer_erc20";
export type SettlementNetwork = "xlayer-mainnet" | "xlayer-testnet" | "xlayer-custom";

export type SettlementReceipt = {
  amount: string;
  receiverAddress?: string;
  method: SettlementMethod;
  status: "paid";
  network?: SettlementNetwork;
  chainId?: number;
  tokenSymbol?: string;
  tokenAddress?: string;
  txHash?: string;
  explorerUrl?: string;
  evidenceLabel: string;
  configurationHint?: string;
};

const DEFAULT_XLAYER_RPC_URL = "https://rpc.xlayer.tech";
const DEFAULT_XLAYER_EXPLORER_URL = "https://www.oklink.com/xlayer";
const DEFAULT_XLAYER_CHAIN_ID = 196;
const DEFAULT_TOKEN_SYMBOL = "USDC";
const DEFAULT_TOKEN_DECIMALS = 6;

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

function parseAmount(raw: string): string {
  const match = String(raw || "")
    .replace(/,/g, "")
    .match(/\d+(?:\.\d+)?/);
  if (!match) {
    throw new Error(`Unable to parse settlement amount from "${raw}".`);
  }
  return match[0];
}

function resolveTokenDecimals(raw: string | undefined): number {
  const parsed = Number(raw || DEFAULT_TOKEN_DECIMALS);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return DEFAULT_TOKEN_DECIMALS;
  }
  return parsed;
}

function resolveChainId(raw: string | undefined): number {
  const parsed = Number(raw || DEFAULT_XLAYER_CHAIN_ID);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return DEFAULT_XLAYER_CHAIN_ID;
  }
  return parsed;
}

function resolveNetwork(chainId: number): SettlementNetwork {
  if (chainId === 196) return "xlayer-mainnet";
  if (chainId === 195 || chainId === 1952) return "xlayer-testnet";
  return "xlayer-custom";
}

function getConfig() {
  const chainId = resolveChainId(process.env.XLAYER_CHAIN_ID);
  const rpcUrl = (process.env.XLAYER_RPC_URL || DEFAULT_XLAYER_RPC_URL).trim();
  const explorerBaseUrl = normalizeExplorerBaseUrl(
    (process.env.XLAYER_EXPLORER_BASE_URL || DEFAULT_XLAYER_EXPLORER_URL).trim()
  );
  const privateKey = String(
    process.env.XLAYER_SETTLEMENT_PRIVATE_KEY || process.env.XLAYER_PRIVATE_KEY || ""
  ).trim();
  const tokenAddress = String(process.env.XLAYER_SETTLEMENT_TOKEN_ADDRESS || "").trim();
  const defaultReceiverAddress = String(process.env.XLAYER_SETTLEMENT_TO_ADDRESS || "").trim();
  const tokenSymbol = String(process.env.XLAYER_SETTLEMENT_TOKEN_SYMBOL || DEFAULT_TOKEN_SYMBOL).trim();
  const tokenDecimals = resolveTokenDecimals(process.env.XLAYER_SETTLEMENT_TOKEN_DECIMALS);
  const network = resolveNetwork(chainId);
  const enabled =
    Boolean(privateKey) &&
    Boolean(tokenAddress) &&
    isAddress(tokenAddress) &&
    Boolean(rpcUrl);

  return {
    chainId,
    rpcUrl,
    explorerBaseUrl,
    privateKey,
    tokenAddress,
    defaultReceiverAddress,
    tokenSymbol,
    tokenDecimals,
    network,
    enabled
  };
}

export function isValidWalletAddress(value: string): boolean {
  return isAddress(value);
}

export function getSettlementConfigurationHint(): string {
  const config = getConfig();
  if (config.enabled) {
    return `Configured for ${config.network} using ${config.tokenSymbol}.`;
  }
  return "Configure XLAYER_RPC_URL, XLAYER_SETTLEMENT_PRIVATE_KEY, and XLAYER_SETTLEMENT_TOKEN_ADDRESS for real X Layer settlement. XLAYER_SETTLEMENT_TO_ADDRESS is only a fallback receiver.";
}

export async function executeXLayerSettlement(input: {
  amount: string;
  receiverAddress?: string;
}): Promise<SettlementReceipt> {
  const config = getConfig();
  const amount = parseAmount(input.amount);
  const receiverAddress = String(input.receiverAddress || config.defaultReceiverAddress || "").trim();

  if (!config.enabled) {
    return {
      amount,
      receiverAddress: receiverAddress || undefined,
      method: "mock_x402",
      status: "paid",
      network: config.network,
      chainId: config.chainId,
      tokenSymbol: config.tokenSymbol,
      tokenAddress: config.tokenAddress || undefined,
      evidenceLabel: `Payment settled in demo mode (${config.tokenSymbol}).`,
      configurationHint: getSettlementConfigurationHint()
    };
  }

  if (!receiverAddress || !isAddress(receiverAddress)) {
    throw new Error("A valid X Layer receiver wallet address is required for settlement.");
  }

  const chain = defineChain({
    id: config.chainId,
    name: "X Layer",
    nativeCurrency: {
      name: "OKB",
      symbol: "OKB",
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: [config.rpcUrl]
      }
    },
    blockExplorers: {
      default: {
        name: "X Layer Explorer",
        url: config.explorerBaseUrl
      }
    }
  });

  const account = privateKeyToAccount(normalizePrivateKey(config.privateKey));
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(config.rpcUrl)
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl)
  });

  const value = parseUnits(amount, config.tokenDecimals);
  const txHash = await walletClient.writeContract({
    address: config.tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "transfer",
    args: [receiverAddress as `0x${string}`, value]
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("X Layer settlement transaction did not succeed.");
  }

  const normalizedAmount = formatUnits(value, config.tokenDecimals);
  const explorerUrl = buildExplorerUrl(config.explorerBaseUrl, txHash);

  return {
    amount: normalizedAmount,
    receiverAddress,
    method: "xlayer_erc20",
    status: "paid",
    network: config.network,
    chainId: config.chainId,
    tokenSymbol: config.tokenSymbol,
    tokenAddress: config.tokenAddress,
    txHash,
    explorerUrl,
    evidenceLabel: `Payment settled on X Layer (${config.tokenSymbol}) · tx ${txHash.slice(0, 10)}…`
  };
}
