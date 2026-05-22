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
import type { SettlementNetwork, SettlementReceipt } from "./settlementTypes";

const DEFAULT_BASE_RPC_URL = "https://mainnet.base.org";
const DEFAULT_BASE_EXPLORER_URL = "https://basescan.org";
const DEFAULT_BASE_CHAIN_ID = 8453;
const DEFAULT_TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
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
  const parsed = Number(raw || DEFAULT_BASE_CHAIN_ID);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return DEFAULT_BASE_CHAIN_ID;
  }
  return parsed;
}

function resolveNetwork(chainId: number): SettlementNetwork {
  if (chainId === 8453) return "base-mainnet";
  if (chainId === 84532) return "base-sepolia";
  return "base-custom";
}

function getConfig() {
  const chainId = resolveChainId(process.env.BASE_CHAIN_ID);
  const rpcUrl = (process.env.BASE_RPC_URL || DEFAULT_BASE_RPC_URL).trim();
  const explorerBaseUrl = normalizeExplorerBaseUrl(
    (process.env.BASE_EXPLORER_BASE_URL || DEFAULT_BASE_EXPLORER_URL).trim()
  );
  const privateKey = String(
    process.env.BASE_SETTLEMENT_PRIVATE_KEY ||
      process.env.BASE_PRIVATE_KEY ||
      process.env.EVM_SETTLEMENT_PRIVATE_KEY ||
      process.env.XLAYER_SETTLEMENT_PRIVATE_KEY ||
      ""
  ).trim();
  const tokenAddress = String(
    process.env.BASE_SETTLEMENT_TOKEN_ADDRESS || DEFAULT_TOKEN_ADDRESS
  ).trim();
  const defaultReceiverAddress = String(process.env.BASE_SETTLEMENT_TO_ADDRESS || "").trim();
  const tokenSymbol = String(process.env.BASE_SETTLEMENT_TOKEN_SYMBOL || DEFAULT_TOKEN_SYMBOL).trim();
  const tokenDecimals = resolveTokenDecimals(process.env.BASE_SETTLEMENT_TOKEN_DECIMALS);
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

export function isValidBaseWalletAddress(value: string): boolean {
  return isAddress(value);
}

export function getBaseSettlementConfigurationHint(): string {
  const config = getConfig();
  if (config.enabled) {
    return `Configured for ${config.network} using ${config.tokenSymbol}.`;
  }
  return "Configure BASE_RPC_URL, BASE_SETTLEMENT_PRIVATE_KEY, and BASE_SETTLEMENT_TOKEN_ADDRESS for real Base settlement. BASE_SETTLEMENT_TO_ADDRESS is only a fallback receiver.";
}

export async function executeBaseSettlement(input: {
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
      configurationHint: getBaseSettlementConfigurationHint()
    };
  }

  if (!receiverAddress || !isAddress(receiverAddress)) {
    throw new Error("A valid Base receiver wallet address is required for settlement.");
  }

  const chain = defineChain({
    id: config.chainId,
    name: "Base",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: [config.rpcUrl]
      }
    },
    blockExplorers: {
      default: {
        name: "BaseScan",
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
    throw new Error("Base settlement transaction did not succeed.");
  }

  const normalizedAmount = formatUnits(value, config.tokenDecimals);
  const explorerUrl = buildExplorerUrl(config.explorerBaseUrl, txHash);

  return {
    amount: normalizedAmount,
    receiverAddress,
    payerAddress: account.address,
    method: "base_erc20",
    status: "paid",
    network: config.network,
    chainId: config.chainId,
    tokenSymbol: config.tokenSymbol,
    tokenAddress: config.tokenAddress,
    txHash,
    explorerUrl,
    evidenceLabel: `Payment settled on Base (${config.tokenSymbol}) · tx ${txHash.slice(0, 10)}…`
  };
}
