import { createPublicClient, formatUnits, http } from "viem";
import { base, mainnet } from "viem/chains";
import type { CheckResult, VerifyResult } from "./types.js";

const RPC_URLS: Record<"base" | "ethereum", string> = {
  base: process.env.BASE_RPC_URL || "https://mainnet.base.org",
  ethereum: process.env.ETH_RPC_URL || "https://eth.llamarpc.com"
};

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }]
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  }
] as const;

export async function verifyWalletClaim(input: {
  chain?: "base" | "ethereum";
  walletAddress: string;
  tokenAddress?: string;
  minTokenBalance?: number;
  minNativeBalance?: number;
  transactionHash?: string;
}): Promise<VerifyResult> {
  const chain = input.chain === "ethereum" ? mainnet : base;
  const client = createPublicClient({
    chain,
    transport: http(RPC_URLS[input.chain === "ethereum" ? "ethereum" : "base"])
  });
  const checks: CheckResult[] = [];
  const wallet = input.walletAddress.trim().toLowerCase();

  try {
    const checkNative =
      input.minNativeBalance !== undefined || (!input.tokenAddress && !input.transactionHash);
    if (checkNative) {
      const wei = await client.getBalance({ address: wallet as `0x${string}` });
      const balance = Number(formatUnits(wei, chain.nativeCurrency.decimals));
      const min = input.minNativeBalance ?? 0;
      checks.push({
        name: "native_balance",
        passed: balance >= min,
        detail: `${balance.toFixed(6)} ${chain.nativeCurrency.symbol} (>= ${min})`
      });
    }

    if (input.tokenAddress) {
      const token = input.tokenAddress.trim() as `0x${string}`;
      let decimals = 18;
      try {
        decimals = await client.readContract({
          address: token,
          abi: ERC20_ABI,
          functionName: "decimals"
        });
      } catch {
        // keep 18 as fallback
      }
      const raw = await client.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [wallet as `0x${string}`]
      });
      const balance = Number(formatUnits(raw, decimals));
      const min = input.minTokenBalance ?? 1;
      checks.push({
        name: "token_balance",
        passed: balance >= min,
        detail: `${balance} tokens (>= ${min})`
      });
    }

    if (input.transactionHash) {
      const hash = input.transactionHash.trim() as `0x${string}`;
      const tx = await client.getTransaction({ hash });
      const receipt = await client.getTransactionReceipt({ hash });
      const ok = Boolean(tx) && receipt?.status === "success";
      checks.push({
        name: "transaction",
        passed: ok,
        detail: ok ? `tx ${hash.slice(0, 10)}… confirmed, status=success` : "transaction not found or failed"
      });
    }
  } catch (err) {
    return {
      verdict: "unverifiable",
      checks: [
        ...checks,
        {
          name: "rpc",
          passed: false,
          detail: err instanceof Error ? err.message.slice(0, 240) : "RPC error"
        }
      ]
    };
  }

  const failed = checks.filter((c) => !c.passed);
  return {
    verdict: failed.length === 0 ? "pass" : "fail",
    checks,
    evidence: {
      chain: input.chain === "ethereum" ? "ethereum" : "base",
      walletAddress: wallet
    }
  };
}
