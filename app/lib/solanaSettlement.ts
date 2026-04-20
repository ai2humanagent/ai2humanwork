import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import type { SettlementNetwork, SettlementReceipt } from "./settlementTypes";

const DEFAULT_SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
const DEFAULT_SOLANA_EXPLORER_URL = "https://explorer.solana.com";
const DEFAULT_TOKEN_SYMBOL = "SOL";

function normalizeExplorerBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
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

function resolveNetwork(raw: string | undefined): SettlementNetwork {
  const value = String(raw || "mainnet-beta").trim().toLowerCase();
  if (value === "mainnet" || value === "mainnet-beta") return "solana-mainnet";
  if (value === "devnet") return "solana-devnet";
  return "solana-custom";
}

function getExplorerClusterSuffix(network: SettlementNetwork): string {
  if (network === "solana-devnet") return "?cluster=devnet";
  return "";
}

function buildExplorerUrl(baseUrl: string, txHash: string, network: SettlementNetwork): string {
  const root = normalizeExplorerBaseUrl(baseUrl);
  if (root.includes("{txHash}")) {
    return root.replace("{txHash}", txHash);
  }
  return `${root}/tx/${txHash}${getExplorerClusterSuffix(network)}`;
}

function parseSecretKey(value: string): Uint8Array {
  const raw = String(value || "").trim();
  if (!raw) {
    throw new Error("Missing SOLANA_SETTLEMENT_PRIVATE_KEY.");
  }

  if (raw.startsWith("[")) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("SOLANA_SETTLEMENT_PRIVATE_KEY JSON must be an array.");
    }
    return Uint8Array.from(parsed);
  }

  if (raw.includes(",")) {
    return Uint8Array.from(
      raw.split(",").map((item) => {
        const parsed = Number(item.trim());
        if (!Number.isFinite(parsed)) {
          throw new Error("SOLANA_SETTLEMENT_PRIVATE_KEY contains an invalid byte.");
        }
        return parsed;
      })
    );
  }

  const decoded = Buffer.from(raw, "base64");
  if (decoded.length > 0) {
    return Uint8Array.from(decoded);
  }

  throw new Error(
    "SOLANA_SETTLEMENT_PRIVATE_KEY must be a JSON array, comma-separated byte list, or base64 string."
  );
}

function getConfig() {
  const rpcUrl = String(process.env.SOLANA_RPC_URL || DEFAULT_SOLANA_RPC_URL).trim();
  const explorerBaseUrl = normalizeExplorerBaseUrl(
    String(process.env.SOLANA_EXPLORER_BASE_URL || DEFAULT_SOLANA_EXPLORER_URL).trim()
  );
  const network = resolveNetwork(process.env.SOLANA_NETWORK);
  const privateKey = String(process.env.SOLANA_SETTLEMENT_PRIVATE_KEY || "").trim();
  const defaultReceiverAddress = String(process.env.SOLANA_SETTLEMENT_TO_ADDRESS || "").trim();
  const enabled = Boolean(rpcUrl) && Boolean(privateKey);

  return {
    rpcUrl,
    explorerBaseUrl,
    network,
    privateKey,
    defaultReceiverAddress,
    enabled
  };
}

export function isValidSolanaWalletAddress(value: string): boolean {
  try {
    void new PublicKey(String(value || "").trim());
    return true;
  } catch {
    return false;
  }
}

export function getSolanaSettlementConfigurationHint(): string {
  const config = getConfig();
  if (config.enabled) {
    return `Configured for ${config.network} native SOL settlement.`;
  }
  return "Configure SOLANA_RPC_URL and SOLANA_SETTLEMENT_PRIVATE_KEY for real Solana settlement. SOLANA_SETTLEMENT_TO_ADDRESS is an optional fallback receiver.";
}

export async function executeSolanaSettlement(input: {
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
      tokenSymbol: DEFAULT_TOKEN_SYMBOL,
      evidenceLabel: `Payment settled in demo mode (${DEFAULT_TOKEN_SYMBOL}).`,
      configurationHint: getSolanaSettlementConfigurationHint()
    };
  }

  if (!receiverAddress || !isValidSolanaWalletAddress(receiverAddress)) {
    throw new Error("A valid Solana receiver wallet address is required for settlement.");
  }

  const payer = Keypair.fromSecretKey(parseSecretKey(config.privateKey));
  const connection = new Connection(config.rpcUrl, "confirmed");
  const lamports = Math.round(Number(amount) * LAMPORTS_PER_SOL);
  if (!Number.isFinite(lamports) || lamports <= 0) {
    throw new Error("Solana settlement amount must be greater than 0.");
  }

  const receiverPublicKey = new PublicKey(receiverAddress);
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: receiverPublicKey,
      lamports
    })
  );

  const txHash = await sendAndConfirmTransaction(connection, transaction, [payer], {
    commitment: "confirmed"
  });

  return {
    amount,
    receiverAddress: receiverPublicKey.toBase58(),
    payerAddress: payer.publicKey.toBase58(),
    method: "solana_native",
    status: "paid",
    network: config.network,
    tokenSymbol: DEFAULT_TOKEN_SYMBOL,
    txHash,
    explorerUrl: buildExplorerUrl(config.explorerBaseUrl, txHash, config.network),
    evidenceLabel: `Payment settled on Solana (${DEFAULT_TOKEN_SYMBOL}) · tx ${txHash.slice(0, 10)}…`
  };
}
