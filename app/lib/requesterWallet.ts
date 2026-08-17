import {
  createPublicClient,
  decodeEventLog,
  defineChain,
  encodeFunctionData,
  erc20Abi,
  fallback,
  formatEther,
  formatUnits,
  http,
  isAddress,
  keccak256,
  parseEther,
  parseUnits,
  stringToHex
} from "viem";
import { getPrivyClient, getPrivyEmbeddedWallet, isPrivyServerConfigured } from "./privy";
import { prizePoolAbi } from "./prizePoolContract";
import { publisherRefundPrizePoolAbi } from "./publisherRefundPrizePoolContract";
import type { UserAccount } from "./store";

const USDC_DECIMALS = 6;
const A2H_DECIMALS = 18;

function config() {
  const chainId = Number(process.env.BASE_CHAIN_ID || 8453);
  const rpcUrl = String(process.env.BASE_RPC_URL || "https://mainnet.base.org").trim();
  const explorerUrl = String(process.env.BASE_EXPLORER_BASE_URL || "https://basescan.org").replace(/\/+$/, "");
  const usdcAddress = String(
    process.env.BASE_SETTLEMENT_TOKEN_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  ).trim();
  const a2hAddress = String(
    process.env.A2H_TOKEN_ADDRESS || "0xc46C41005A1A88B0C1491F2B542A4831D6d1EbA3"
  ).trim();
  return { chainId, rpcUrl, explorerUrl, usdcAddress, a2hAddress };
}

function client() {
  const cfg = config();
  const chain = defineChain({
    id: cfg.chainId,
    name: cfg.chainId === 8453 ? "Base" : `Base ${cfg.chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [cfg.rpcUrl] } },
    blockExplorers: { default: { name: "BaseScan", url: cfg.explorerUrl } }
  });
  const configuredFallbacks = String(process.env.BASE_RPC_FALLBACK_URLS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const officialFallbacks = cfg.chainId === 8453
    ? ["https://mainnet-preconf.base.org"]
    : [];
  const rpcUrls = [...new Set([cfg.rpcUrl, ...configuredFallbacks, ...officialFallbacks])];
  const transports = rpcUrls.map((url) => http(url, {
    retryCount: 3,
    retryDelay: 500,
    timeout: 12_000
  }));
  return createPublicClient({
    chain,
    transport: transports.length === 1 ? transports[0] : fallback(transports, { rank: false })
  });
}

function requirePrivyUser(user: UserAccount) {
  if (!user.privyUserId || !isPrivyServerConfigured()) return null;
  return getPrivyClient().getUser(user.privyUserId).catch(() => null);
}

export function isRequesterWalletAutomationConfigured() {
  return Boolean(
    process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY &&
    process.env.NEXT_PUBLIC_PRIVY_SIGNER_ID &&
    process.env.NEXT_PUBLIC_PRIVY_POLICY_ID
  );
}

export async function getRequesterEmbeddedWallet(user: UserAccount) {
  const privyUser = await requirePrivyUser(user);
  if (!privyUser) return null;
  const wallet = getPrivyEmbeddedWallet(privyUser);
  if (!wallet?.address || !isAddress(wallet.address)) return null;
  return {
    address: wallet.address,
    walletId: wallet.id || "",
    delegated: wallet.delegated === true
  };
}

export async function getRequesterWalletSnapshot(user: UserAccount) {
  const wallet = await getRequesterEmbeddedWallet(user);
  const cfg = config();
  if (!wallet) {
    return {
      ready: false,
      address: "",
      usdcBalance: "0",
      a2hBalance: "0",
      nativeBalance: "0",
      delegated: false,
      automationConfigured: isRequesterWalletAutomationConfigured(),
      network: "Base",
      chainId: cfg.chainId,
      tokenSymbol: "USDC"
    };
  }

  const publicClient = client();
  const usdcBalance = await publicClient.readContract({
    address: cfg.usdcAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.address as `0x${string}`]
  });
  const a2hBalance = await publicClient.readContract({
    address: cfg.a2hAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.address as `0x${string}`]
  });
  const nativeBalance = await publicClient.getBalance({ address: wallet.address as `0x${string}` });

  return {
    ready: true,
    address: wallet.address,
    usdcBalance: formatUnits(usdcBalance as bigint, USDC_DECIMALS),
    a2hBalance: formatUnits(a2hBalance as bigint, A2H_DECIMALS),
    nativeBalance: formatEther(nativeBalance),
    delegated: wallet.delegated,
    automationConfigured: isRequesterWalletAutomationConfigured(),
    network: "Base",
    chainId: cfg.chainId,
    tokenSymbol: "USDC"
  };
}

function requesterGasUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /insufficient funds|insufficient.*gas|gas required exceeds allowance/i.test(message);
}

async function sendRequesterTransaction(input: {
  wallet: NonNullable<Awaited<ReturnType<typeof getRequesterEmbeddedWallet>>>;
  chainId: number;
  to?: `0x${string}`;
  data: `0x${string}`;
  value?: bigint;
  idempotencyKey: string;
}) {
  const request = {
    ...(input.wallet.walletId
      ? { walletId: input.wallet.walletId }
      : { address: input.wallet.address, chainType: "ethereum" as const }),
    caip2: `eip155:${input.chainId}` as `eip155:${string}`,
    transaction: {
      from: input.wallet.address as `0x${string}`,
      ...(input.to ? { to: input.to } : {}),
      data: input.data,
      value: (input.value ? `0x${(input.value).toString(16)}` : "0x0") as `0x${string}`
    }
  };
  try {
    // Prefer the requester's own Base ETH when it is available.
    const sent = await getPrivyClient().walletApi.ethereum.sendTransaction({
      ...request,
      sponsor: false,
      idempotencyKey: `${input.idempotencyKey}:wallet-v2:user-gas`
    });
    return { sent, gasPayment: "requester" as const };
  } catch (error) {
    if (!requesterGasUnavailable(error)) throw error;
    // An insufficient-gas rejection happens before broadcast. Retry the same
    // idempotent request with app sponsorship; if app credits are unavailable,
    // the caller records a failed publication and never marks the task live.
    try {
      const sent = await getPrivyClient().walletApi.ethereum.sendTransaction({
        ...request,
        sponsor: true,
        idempotencyKey: `${input.idempotencyKey}:wallet-v2:sponsored-gas`
      });
      return { sent, gasPayment: "app" as const };
    } catch (sponsorError) {
      const requesterMessage = error instanceof Error ? error.message : String(error || "");
      const sponsorMessage = sponsorError instanceof Error ? sponsorError.message : String(sponsorError || "");
      console.error("[RequesterWallet] transaction rejected by both gas paths", {
        wallet: input.wallet.address,
        chainId: input.chainId,
        requesterMessage,
        sponsorMessage
      });
      throw new Error(`Wallet provider rejected the transaction. User-gas attempt: ${requesterMessage}. Sponsored attempt: ${sponsorMessage}.`);
    }
  }
}

const userFundedPrizePoolFactoryAbi = [
  {
    type: "function",
    name: "createPool",
    inputs: [
      { name: "requestId", type: "bytes32", internalType: "bytes32" },
      { name: "merkleRoot", type: "bytes32", internalType: "bytes32" },
      { name: "deadline", type: "uint256", internalType: "uint256" },
      { name: "maxWinners", type: "uint256", internalType: "uint256" }
    ],
    outputs: [{ name: "pool", type: "address", internalType: "address" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "pools",
    inputs: [{ name: "requestId", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "pool", type: "address", internalType: "address" }],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "PoolCreated",
    inputs: [
      { name: "requestId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "payer", type: "address", indexed: true, internalType: "address" },
      { name: "pool", type: "address", indexed: true, internalType: "address" },
      { name: "deadline", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "maxWinners", type: "uint256", indexed: false, internalType: "uint256" }
    ]
  }
] as const;

function isRecordedPool(value: unknown): value is `0x${string}` {
  return typeof value === "string" && isAddress(value) && !/^0x0{40}$/i.test(value);
}

function poolFromReceipt(
  receipt: { logs: Array<{ address: string; data: `0x${string}`; topics: readonly `0x${string}`[] }> },
  factoryAddress: string,
  requestId: `0x${string}`
) {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== factoryAddress.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: userFundedPrizePoolFactoryAbi,
        eventName: "PoolCreated",
        data: log.data,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]]
      });
      if (
        decoded.eventName === "PoolCreated" &&
        String(decoded.args.requestId).toLowerCase() === requestId.toLowerCase() &&
        isRecordedPool(decoded.args.pool)
      ) {
        return decoded.args.pool.toLowerCase() as `0x${string}`;
      }
    } catch {
      // Ignore unrelated factory logs and fall back to the mapping read.
    }
  }
  return null;
}

async function readRecordedPool(
  publicClient: ReturnType<typeof client>,
  factoryAddress: `0x${string}`,
  requestId: `0x${string}`,
  attempts = 1
) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const pool = await publicClient.readContract({
        address: factoryAddress,
        abi: userFundedPrizePoolFactoryAbi,
        functionName: "pools",
        args: [requestId]
      });
      if (isRecordedPool(pool)) return pool.toLowerCase() as `0x${string}`;
    } catch {
      // A single RPC can lag or fail immediately after transaction inclusion.
    }
    if (attempt + 1 < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return null;
}

async function verifyRecordedPoolOwner(
  publicClient: ReturnType<typeof client>,
  poolAddress: `0x${string}`,
  expectedOwner: string,
  attempts = 6
) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const owner = await publicClient.readContract({
        address: poolAddress,
        abi: prizePoolAbi,
        functionName: "owner"
      }) as string;
      return owner.toLowerCase() === expectedOwner.toLowerCase();
    } catch {
      // A pool deployment and its owner transfer are atomic, but a public RPC
      // can briefly lag the confirmed receipt. Retry the read before turning a
      // healthy pool into a permanent needs-review state.
      if (attempt + 1 < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }
  return false;
}

export async function deployRequesterPrizePool(input: {
  user: UserAccount;
  deadline: number;
  maxWinners: number;
  agent: string;
  requestId: string;
  idempotencyKey: string;
  asset?: "USDC" | "A2H";
}) {
  if (!isRequesterWalletAutomationConfigured()) {
    return { ok: false as const, error: "Privy wallet automation is not configured." };
  }
  if (!isAddress(input.agent)) {
    return { ok: false as const, error: "Invalid PrizePool settlement agent." };
  }
  if (!Number.isFinite(input.deadline) || input.deadline <= Math.floor(Date.now() / 1000)) {
    return { ok: false as const, error: "PrizePool deadline must be in the future." };
  }
  if (!Number.isFinite(input.maxWinners) || input.maxWinners < 1) {
    return { ok: false as const, error: "PrizePool maxWinners must be at least 1." };
  }
  const wallet = await getRequesterEmbeddedWallet(input.user);
  if (!wallet) return { ok: false as const, error: "Privy embedded wallet not found." };
  if (!wallet.delegated) {
    return { ok: false as const, error: "Privy embedded wallet has not enabled X task automation." };
  }

  const cfg = config();
  const asset = input.asset === "A2H" ? "A2H" : "USDC";
  const publicClient = client();
  if (asset === "A2H") {
    try {
      const factoryAddress = String(process.env.PUBLISHER_REFUND_PRIZE_POOL_FACTORY_ADDRESS || "").trim();
      if (!isAddress(factoryAddress)) return { ok: false as const, error: "Publisher-refund PrizePool Factory is not configured." };
      const factoryAbi = [{
        type: "function",
        name: "createPool",
        inputs: [
          { name: "token", type: "address" },
          { name: "deadline", type: "uint256" },
          { name: "maxWinners", type: "uint256" },
          { name: "settlementAgent", type: "address" }
        ],
        outputs: [{ name: "pool", type: "address" }],
        stateMutability: "nonpayable"
      }, {
        type: "event",
        name: "PoolCreated",
        inputs: [
          { name: "pool", type: "address", indexed: true },
          { name: "publisher", type: "address", indexed: true },
          { name: "token", type: "address", indexed: true },
          { name: "settlementAgent", type: "address", indexed: false },
          { name: "deadline", type: "uint256", indexed: false },
          { name: "maxWinners", type: "uint256", indexed: false }
        ]
      }] as const;
      const deployData = encodeFunctionData({
        abi: factoryAbi,
        functionName: "createPool",
        args: [cfg.a2hAddress as `0x${string}`, BigInt(input.deadline), BigInt(input.maxWinners), input.agent as `0x${string}`]
      });
      const deployed = await sendRequesterTransaction({
        wallet,
        chainId: cfg.chainId,
        to: factoryAddress as `0x${string}`,
        data: deployData,
        idempotencyKey: `${input.idempotencyKey}:deploy`
      });
      const deployReceipt = await publicClient.waitForTransactionReceipt({
        hash: deployed.sent.hash as `0x${string}`
      });
      let poolAddress: `0x${string}` | null = null;
      for (const log of deployReceipt.logs) {
        if (log.address.toLowerCase() !== factoryAddress.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({ abi: factoryAbi, eventName: "PoolCreated", data: log.data, topics: log.topics as [`0x${string}`, ...`0x${string}`[]] });
          poolAddress = decoded.args.pool as `0x${string}`;
          break;
        } catch {}
      }
      if (deployReceipt.status !== "success" || !poolAddress || !isAddress(poolAddress)) {
        return { ok: false as const, error: "Embedded wallet A2H PrizePool deployment failed on Base." };
      }
      const settlementAgent = await publicClient.readContract({
        address: poolAddress,
        abi: publisherRefundPrizePoolAbi,
        functionName: "settlementAgent"
      }) as string;
      const refundRecipient = await publicClient.readContract({
        address: poolAddress,
        abi: publisherRefundPrizePoolAbi,
        functionName: "refundRecipient"
      }) as string;
      if (settlementAgent.toLowerCase() !== input.agent.toLowerCase()) {
        return { ok: false as const, error: "A2H PrizePool settlement agent verification failed." };
      }
      if (refundRecipient.toLowerCase() !== wallet.address.toLowerCase()) {
        return { ok: false as const, error: "A2H PrizePool publisher refund verification failed." };
      }
      return {
        ok: true as const,
        poolAddress: poolAddress.toLowerCase(),
        txHash: deployed.sent.hash,
        explorerUrl: `${cfg.explorerUrl}/tx/${deployed.sent.hash}`,
        deployer: wallet.address,
        owner: input.agent.toLowerCase(),
        refundRecipient: wallet.address,
        asset,
        tokenAddress: cfg.a2hAddress,
        tokenDecimals: A2H_DECIMALS,
        gasPayment: deployed.gasPayment
      };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Unable to deploy A2H PrizePool from embedded wallet."
      };
    }
  }
  const factoryAddress = String(
    process.env.USER_FUNDED_PRIZE_POOL_FACTORY_ADDRESS ||
      "0xDeb1ea536c02654D89380435C30833a8C443282D"
  ).trim();
  if (!isAddress(factoryAddress)) {
    return { ok: false as const, error: `${asset} user-funded PrizePool Factory is not configured.` };
  }
  const requestId = keccak256(stringToHex(input.requestId));
  const existingPool = await readRecordedPool(
    publicClient,
    factoryAddress as `0x${string}`,
    requestId,
    3
  );
  if (existingPool) {
    const ownerMatches = await verifyRecordedPoolOwner(publicClient, existingPool, input.agent).catch(() => false);
    if (!ownerMatches) {
      return { ok: false as const, error: "Existing PrizePool settlement owner verification failed." };
    }
    return {
      ok: true as const,
      poolAddress: existingPool,
      txHash: "",
      explorerUrl: "",
      deployer: wallet.address,
      owner: input.agent.toLowerCase(),
      asset,
      tokenAddress: cfg.usdcAddress,
      tokenDecimals: USDC_DECIMALS,
      gasPayment: "recovered" as const
    };
  }
  const deployData = encodeFunctionData({
    abi: userFundedPrizePoolFactoryAbi,
    functionName: "createPool",
    args: [
      requestId,
      `0x${"0".repeat(64)}` as `0x${string}`,
      BigInt(input.deadline),
      BigInt(input.maxWinners)
    ]
  });

  try {
    const deployed = await sendRequesterTransaction({
      wallet,
      chainId: cfg.chainId,
      to: factoryAddress as `0x${string}`,
      data: deployData,
      idempotencyKey: input.idempotencyKey
    });
    const deployReceipt = await publicClient.waitForTransactionReceipt({
      hash: deployed.sent.hash as `0x${string}`
    });
    if (deployReceipt.status !== "success") {
      return { ok: false as const, error: "Embedded wallet PrizePool deployment failed on Base." };
    }
    const poolAddress =
      poolFromReceipt(deployReceipt, factoryAddress, requestId) ||
      await readRecordedPool(publicClient, factoryAddress as `0x${string}`, requestId, 6);
    if (!poolAddress) {
      return {
        ok: false as const,
        error: "PrizePool deployment was confirmed but its event and mapping are not visible yet; safe retry required."
      };
    }
    const ownerMatches = await verifyRecordedPoolOwner(publicClient, poolAddress, input.agent).catch(() => false);
    if (!ownerMatches) {
      return { ok: false as const, error: "PrizePool settlement owner verification failed." };
    }

    return {
      ok: true as const,
      poolAddress: poolAddress.toLowerCase(),
      txHash: deployed.sent.hash,
      explorerUrl: `${cfg.explorerUrl}/tx/${deployed.sent.hash}`,
      deployer: wallet.address,
      owner: input.agent.toLowerCase(),
      asset,
      tokenAddress: cfg.usdcAddress,
      tokenDecimals: USDC_DECIMALS,
      gasPayment: deployed.gasPayment
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unable to deploy PrizePool from embedded wallet."
    };
  }
}

export async function sendRequesterWalletA2h(input: {
  user: UserAccount;
  recipient: string;
  amount: string;
  idempotencyKey: string;
}) {
  if (!isRequesterWalletAutomationConfigured()) {
    return { ok: false as const, error: "Privy wallet automation is not configured." };
  }
  if (!isAddress(input.recipient)) {
    return { ok: false as const, error: "Invalid A2H payment recipient." };
  }
  const wallet = await getRequesterEmbeddedWallet(input.user);
  if (!wallet) return { ok: false as const, error: "Privy embedded wallet not found." };
  if (!wallet.delegated) {
    return { ok: false as const, error: "Privy embedded wallet has not enabled X task automation." };
  }

  const cfg = config();
  const value = parseUnits(input.amount, A2H_DECIMALS);
  if (value <= BigInt(0)) return { ok: false as const, error: "A2H amount must be positive." };
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [input.recipient as `0x${string}`, value]
  });
  try {
    const { sent, gasPayment } = await sendRequesterTransaction({
      wallet,
      chainId: cfg.chainId,
      to: cfg.a2hAddress as `0x${string}`,
      data,
      idempotencyKey: input.idempotencyKey
    });
    const publicClient = client();
    const receipt = await publicClient.waitForTransactionReceipt({ hash: sent.hash as `0x${string}` });
    if (receipt.status !== "success") {
      return { ok: false as const, error: "Embedded wallet A2H transfer failed on Base." };
    }
    return {
      ok: true as const,
      txHash: sent.hash,
      explorerUrl: `${cfg.explorerUrl}/tx/${sent.hash}`,
      from: wallet.address,
      to: input.recipient.toLowerCase(),
      amount: formatUnits(value, A2H_DECIMALS),
      gasPayment
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unable to send A2H from embedded wallet."
    };
  }
}

export async function sendRequesterWalletUsdc(input: {
  user: UserAccount;
  recipient: string;
  amount: string;
  idempotencyKey: string;
}) {
  if (!isRequesterWalletAutomationConfigured()) {
    return { ok: false as const, error: "Privy wallet automation is not configured." };
  }
  if (!isAddress(input.recipient)) {
    return { ok: false as const, error: "Invalid USDC recipient." };
  }
  const wallet = await getRequesterEmbeddedWallet(input.user);
  if (!wallet) return { ok: false as const, error: "Privy embedded wallet not found." };
  if (!wallet.delegated) {
    return { ok: false as const, error: "Privy embedded wallet has not enabled X task automation." };
  }

  const cfg = config();
  const value = parseUnits(input.amount, USDC_DECIMALS);
  if (value <= BigInt(0)) return { ok: false as const, error: "USDC amount must be positive." };
  const publicClient = client();
  const balance = await publicClient.readContract({
    address: cfg.usdcAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.address as `0x${string}`]
  }) as bigint;
  if (balance < value) {
    return {
      ok: false as const,
      error: "Insufficient embedded wallet USDC balance.",
      balance: formatUnits(balance, USDC_DECIMALS),
      required: formatUnits(value, USDC_DECIMALS)
    };
  }

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [input.recipient as `0x${string}`, value]
  });
  try {
    const { sent, gasPayment } = await sendRequesterTransaction({
      wallet,
      chainId: cfg.chainId,
      to: cfg.usdcAddress as `0x${string}`,
      data,
      idempotencyKey: input.idempotencyKey
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: sent.hash as `0x${string}` });
    if (receipt.status !== "success") {
      return { ok: false as const, error: "Embedded wallet USDC transfer failed on Base." };
    }
    return {
      ok: true as const,
      txHash: sent.hash,
      explorerUrl: `${cfg.explorerUrl}/tx/${sent.hash}`,
      from: wallet.address,
      to: input.recipient.toLowerCase(),
      amount: formatUnits(value, USDC_DECIMALS),
      gasPayment
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unable to send USDC from embedded wallet."
    };
  }
}

export async function sendRequesterWalletNative(input: {
  user: UserAccount;
  recipient: string;
  amount: string;
  idempotencyKey: string;
}) {
  if (!isRequesterWalletAutomationConfigured()) {
    return { ok: false as const, error: "Privy wallet automation is not configured." };
  }
  if (!isAddress(input.recipient)) {
    return { ok: false as const, error: "Invalid ETH withdrawal recipient." };
  }
  const wallet = await getRequesterEmbeddedWallet(input.user);
  if (!wallet) return { ok: false as const, error: "Privy embedded wallet not found." };
  if (!wallet.delegated) {
    return { ok: false as const, error: "Privy embedded wallet has not enabled X task automation." };
  }

  const cfg = config();
  const value = parseEther(input.amount);
  if (value <= BigInt(0)) return { ok: false as const, error: "ETH amount must be positive." };

  const publicClient = client();
  const balance = await publicClient.getBalance({ address: wallet.address as `0x${string}` });
  if (balance < value) {
    return {
      ok: false as const,
      error: "Insufficient embedded wallet ETH balance.",
      balance: formatEther(balance),
      required: formatEther(value)
    };
  }

  try {
    const { sent, gasPayment } = await sendRequesterTransaction({
      wallet,
      chainId: cfg.chainId,
      to: input.recipient as `0x${string}`,
      data: "0x",
      value,
      idempotencyKey: input.idempotencyKey
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: sent.hash as `0x${string}` });
    if (receipt.status !== "success") {
      return { ok: false as const, error: "Embedded wallet ETH transfer failed on Base." };
    }
    return {
      ok: true as const,
      txHash: sent.hash,
      explorerUrl: `${cfg.explorerUrl}/tx/${sent.hash}`,
      from: wallet.address,
      to: input.recipient.toLowerCase(),
      amount: formatEther(value),
      gasPayment
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unable to send ETH from embedded wallet."
    };
  }
}
