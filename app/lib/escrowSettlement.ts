/**
 * Escrow Settlement — USDC pool management for task budgets on Base.
 *
 * Flow:
 *  1. Agent approves escrow wallet to pull USDC via ERC20 approve()
 *  2. Server pulls USDC from agent → escrow wallet when task is created
 *  3. Server pays users from escrow wallet when they claim rewards
 *  4. Server refunds remaining USDC to agent after deadline passes
 *
 * Uses viem for on-chain ERC20 operations on Base mainnet.
 */

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

const BASE_RPC_URL = "https://mainnet.base.org";
const BASE_CHAIN_ID = 8453;
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_DECIMALS = 6;
const USDC_SYMBOL = "USDC";

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

function getEscrowWallet() {
  const privateKey = String(
    process.env.BASE_SETTLEMENT_PRIVATE_KEY ||
      process.env.BASE_PRIVATE_KEY ||
      process.env.EVM_SETTLEMENT_PRIVATE_KEY ||
      ""
  ).trim();

  if (!privateKey) {
    return { address: null, enabled: false };
  }

  try {
    const account = privateKeyToAccount(normalizePrivateKey(privateKey));
    return { address: account.address, enabled: true, privateKey };
  } catch {
    return { address: null, enabled: false };
  }
}

function getRpcUrl() {
  return String(process.env.BASE_RPC_URL || BASE_RPC_URL).trim();
}

function getExplorerBaseUrl() {
  return normalizeExplorerBaseUrl(
    (process.env.BASE_EXPLORER_BASE_URL || "https://basescan.org").trim()
  );
}

function buildChain() {
  const chainId = Number(process.env.BASE_CHAIN_ID || BASE_CHAIN_ID);
  return defineChain({
    id: chainId,
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [getRpcUrl()] } },
    blockExplorers: {
      default: { name: "BaseScan", url: getExplorerBaseUrl() }
    }
  });
}

function parseAmount(raw: string): string {
  const match = String(raw || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!match) throw new Error(`Cannot parse amount from "${raw}"`);
  return match[0];
}

// ---------------------------------------------------------------------------
// Public read functions
// ---------------------------------------------------------------------------

/**
 * Check how much USDC an agent has approved for the escrow wallet.
 */
export async function getEscrowAllowance(agentAddress: string): Promise<bigint> {
  const escrow = getEscrowWallet();
  if (!escrow.enabled || !isAddress(agentAddress)) {
    return BigInt(0);
  }

  const publicClient = createPublicClient({
    chain: buildChain(),
    transport: http(getRpcUrl())
  });

  try {
    const allowance = await publicClient.readContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "allowance",
      args: [agentAddress as `0x${string}`, escrow.address as `0x${string}`]
    });
    return allowance as bigint;
  } catch {
    return BigInt(0);
  }
}

/**
 * Get the USDC balance of the escrow wallet.
 */
export async function getEscrowBalance(): Promise<{ balance: string; symbol: string }> {
  const escrow = getEscrowWallet();
  if (!escrow.enabled || !escrow.address) {
    return { balance: "0", symbol: USDC_SYMBOL };
  }

  const publicClient = createPublicClient({
    chain: buildChain(),
    transport: http(getRpcUrl())
  });

  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [escrow.address as `0x${string}`]
    });
    return {
      balance: formatUnits(balance as bigint, USDC_DECIMALS),
      symbol: USDC_SYMBOL
    };
  } catch {
    return { balance: "0", symbol: USDC_SYMBOL };
  }
}

/**
 * Get the escrow wallet address (for display/approval).
 */
export function getEscrowWalletAddress(): string | null {
  return getEscrowWallet().address;
}

// ---------------------------------------------------------------------------
// Write functions
// ---------------------------------------------------------------------------

export type EscrowDepositResult =
  | {
      ok: true;
      txHash: string;
      explorerUrl: string;
      amount: string;
      from: string;
      to: string;
    }
  | {
      ok: false;
      error: string;
    };

export type EscrowRefundResult =
  | {
      ok: true;
      txHash: string;
      explorerUrl: string;
      amount: string;
      to: string;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Pull USDC from agent wallet into escrow via transferFrom.
 * The agent must have previously called USDC.approve(escrowWallet, amount).
 */
export async function executeEscrowDeposit(input: {
  agentAddress: string;
  amount: string; // e.g. "5"
  taskId: string;
}): Promise<EscrowDepositResult> {
  const escrow = getEscrowWallet();

  if (!escrow.enabled || !escrow.address || !escrow.privateKey) {
    return {
      ok: false,
      error:
        "Escrow is not configured. Set BASE_SETTLEMENT_PRIVATE_KEY env var to enable on-chain settlement."
    };
  }

  if (!isAddress(input.agentAddress)) {
    return { ok: false, error: "Invalid agent address." };
  }

  const amount = parseAmount(input.amount);
  const value = parseUnits(amount, USDC_DECIMALS);

  // When agent === escrow wallet, use direct transfer (no approve needed)
  const isSelfDeposit =
    input.agentAddress.toLowerCase() === escrow.address.toLowerCase();

  let txHash: `0x${string}`;

  const account = privateKeyToAccount(normalizePrivateKey(escrow.privateKey));
  const walletClient = createWalletClient({
    account,
    chain: buildChain(),
    transport: http(getRpcUrl())
  });
  const publicClient = createPublicClient({
    chain: buildChain(),
    transport: http(getRpcUrl())
  });

  try {
    if (isSelfDeposit) {
      // Escrow wallet spending its own USDC — use transfer directly
      txHash = await walletClient.writeContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: "transfer",
        args: [escrow.address as `0x${string}`, value]
      });
    } else {
      // Third-party agent — require prior approve
      const allowance = await getEscrowAllowance(input.agentAddress);
      if (allowance < value) {
        return {
          ok: false,
          error: `Insufficient allowance. Agent must approve the escrow wallet first. Current allowance: ${formatUnits(allowance, USDC_DECIMALS)} ${USDC_SYMBOL}, required: ${amount} ${USDC_SYMBOL}.`
        };
      }
      txHash = await walletClient.writeContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: "transferFrom",
        args: [input.agentAddress as `0x${string}`, escrow.address as `0x${string}`, value]
      });
    }

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      return { ok: false, error: "Transfer transaction failed on-chain." };
    }

    return {
      ok: true,
      txHash,
      explorerUrl: buildExplorerUrl(getExplorerBaseUrl(), txHash),
      amount,
      from: input.agentAddress,
      to: escrow.address
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Escrow deposit failed: ${msg}` };
  }
}

/**
 * Refund remaining USDC from escrow back to the agent.
 */
function publicClientForEscrow() {
  return createPublicClient({
    chain: buildChain(),
    transport: http(getRpcUrl())
  });
}

export async function executeEscrowRefund(input: {
  agentAddress: string;
  amount: string; // e.g. "4.5"
  taskId: string;
}): Promise<EscrowRefundResult> {
  const escrow = getEscrowWallet();

  if (!escrow.enabled || !escrow.address || !escrow.privateKey) {
    return {
      ok: false,
      error:
        "Escrow is not configured. Set BASE_SETTLEMENT_PRIVATE_KEY env var to enable on-chain settlement."
    };
  }

  if (!isAddress(input.agentAddress)) {
    return { ok: false, error: "Invalid agent address." };
  }

  const amount = parseAmount(input.amount);
  const value = parseUnits(amount, USDC_DECIMALS);

  // Check escrow has sufficient balance
  const currentBalance = await publicClientForEscrow().readContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [escrow.address as `0x${string}`]
  });

  if ((currentBalance as bigint) < value) {
    return {
      ok: false,
      error: `Escrow has insufficient balance for refund. Escrow balance: ${formatUnits(currentBalance as bigint, USDC_DECIMALS)} ${USDC_SYMBOL}, requested: ${amount} ${USDC_SYMBOL}.`
    };
  }

  const account = privateKeyToAccount(normalizePrivateKey(escrow.privateKey));
  const walletClient = createWalletClient({
    account,
    chain: buildChain(),
    transport: http(getRpcUrl())
  });
  const publicClient = createPublicClient({
    chain: buildChain(),
    transport: http(getRpcUrl())
  });

  try {
    const txHash = await walletClient.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "transfer",
      args: [input.agentAddress as `0x${string}`, value]
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      return { ok: false, error: "Refund transaction failed on-chain." };
    }

    return {
      ok: true,
      txHash,
      explorerUrl: buildExplorerUrl(getExplorerBaseUrl(), txHash),
      amount,
      to: input.agentAddress
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Escrow refund failed: ${msg}` };
  }
}
