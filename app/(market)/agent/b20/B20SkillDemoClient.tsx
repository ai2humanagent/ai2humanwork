"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallets } from "@privy-io/react-auth";
import {
  createPublicClient,
  formatEther,
  http,
  type Address,
  type Hex
} from "viem";
import { base, baseSepolia, type Chain } from "viem/chains";
import styles from "./b20Skill.module.css";
import {
  BASE_MAINNET_CHAIN_ID,
  BASE_MAINNET_RPC,
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_RPC,
  B20_FACTORY_ADDRESS,
  b20FactoryAbi,
  buildB20DeployPlan,
  buildExplorerAddressUrl,
  buildExplorerTxUrl,
  encodeCreateB20Call,
  encodeMint
} from "../../../lib/b20Deploy";

const previewEndpoint = "/api/agent/b20/preview";
const proofTokenAddress = "0xb200000000000000000000eaE911AAD5435c86F3";
const baseSepoliaFaucetUrl = "https://www.alchemy.com/faucets/base-sepolia";

type B20NetworkMode = "sepolia" | "mainnet";
type B20NetworkConfig = {
  mode: B20NetworkMode;
  name: string;
  chainId: number;
  chainHex: `0x${string}`;
  chain: Chain;
  rpcUrl: string;
  explorerUrl: string;
  gasLabel: string;
  actionLabel: string;
  description: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
};

const b20Networks: Record<B20NetworkMode, B20NetworkConfig> = {
  sepolia: {
    mode: "sepolia" as const,
    name: "Base Sepolia",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    chainHex: "0x14a34",
    chain: baseSepolia,
    rpcUrl: BASE_SEPOLIA_RPC,
    explorerUrl: "https://sepolia.basescan.org",
    gasLabel: "Base Sepolia ETH",
    actionLabel: "Issue Testnet B20",
    description: "Safe test mode for rehearsing B20 issuance before a mainnet launch.",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }
  },
  mainnet: {
    mode: "mainnet" as const,
    name: "Base Mainnet",
    chainId: BASE_MAINNET_CHAIN_ID,
    chainHex: "0x2105",
    chain: base,
    rpcUrl: BASE_MAINNET_RPC,
    explorerUrl: "https://basescan.org",
    gasLabel: "Base ETH",
    actionLabel: "Issue Mainnet B20",
    description: "Real mainnet issuance. Use only after the token name, roles, and supply cap are final.",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }
  }
};

const flowSteps = [
  { id: 1, title: "Set rules", hint: "Name, type, supply, proof gate" },
  { id: 2, title: "Preview plan", hint: "Generate the B20 config package" },
  { id: 3, title: "Issue token", hint: "Sepolia or mainnet createB20" },
  { id: 4, title: "Mint + proof", hint: "Test mint, then route access through AI2Human" }
];

const examples = [
  {
    id: "ai2human",
    label: "AI2Human Proof",
    summary: "Proof-gated access token for the network",
    variant: "ASSET" as const,
    name: "AI2Human Proof Token",
    symbol: "A2HP",
    decimals: 18,
    supplyCap: "100000000",
    prompt:
      "Create the AI2Human Proof Token as a B20 asset. Max supply 100,000,000. Mint access requires AI2Human proof. Roles and allowlists should be granted only after structured human verification.",
    token: {
      variant: "ASSET",
      name: "AI2Human Proof Token",
      symbol: "A2HP",
      decimals: 18,
      maxSupply: "100000000",
      initialAdmin: "0x1111111111111111111111111111111111111111",
      contractURI: "https://ai2human.io/agent/b20/manifest.json",
      useCase: "ai2human-proof-network"
    }
  },
  {
    id: "rwa",
    label: "RWA community",
    summary: "Members mint only after verification",
    variant: "ASSET" as const,
    name: "Verified RWA Community",
    symbol: "VRWA",
    decimals: 18,
    supplyCap: "1000000",
    prompt:
      "Create a B20 token for a verified RWA community. Max supply 1,000,000. Only verified members can mint. Require AI2Human proof before role assignment.",
    token: {
      variant: "ASSET",
      name: "Verified RWA Community",
      symbol: "VRWA",
      decimals: 18,
      maxSupply: "1000000",
      initialAdmin: "0x1111111111111111111111111111111111111111",
      contractURI: "ipfs://REQUESTER_METADATA_URI",
      useCase: "rwa-community"
    }
  },
  {
    id: "stablecoin",
    label: "Local stablecoin",
    summary: "USD-backed, 6 decimals",
    variant: "STABLECOIN" as const,
    name: "Verified Local Dollar",
    symbol: "VLUSD",
    decimals: 6,
    supplyCap: "5000000",
    currency: "USD",
    prompt:
      "Create a B20 stablecoin for a local USD reserve program. Only verified treasury operators can mint. Require reserve proof before minting.",
    token: {
      variant: "STABLECOIN",
      name: "Verified Local Dollar",
      symbol: "VLUSD",
      decimals: 6,
      maxSupply: "5000000",
      initialAdmin: "0x1111111111111111111111111111111111111111",
      contractURI: "ipfs://RESERVE_METADATA_URI",
      useCase: "local-stablecoin"
    }
  },
  {
    id: "agent",
    label: "Agent network",
    summary: "Receive only after proof of work",
    variant: "ASSET" as const,
    name: "Agent Work Proof Token",
    symbol: "AWP",
    decimals: 18,
    supplyCap: "10000000",
    prompt:
      "Create a B20 token for an agent network. Only accounts with verified work proof can receive tokens.",
    token: {
      variant: "ASSET",
      name: "Agent Work Proof Token",
      symbol: "AWP",
      decimals: 18,
      maxSupply: "10000000",
      initialAdmin: "0x1111111111111111111111111111111111111111",
      contractURI: "ipfs://AGENT_NETWORK_METADATA_URI",
      useCase: "verified-community"
    }
  }
];

type Preview = {
  tokenConfig: {
    variant: string;
    name: string;
    symbol: string;
    decimals: number;
    supplyCap: string;
  };
  policyConfig: Array<{ scope: string; type: string }>;
  proofRequirements: {
    tasks: string[];
    optionalTaskTemplate?: { title: string; blockedHumanStep: string };
  };
  publicSummary: string;
};

function buildRequest(
  example: (typeof examples)[number],
  intent: string,
  admin?: string,
  tokenOverrides?: Partial<(typeof examples)[number]["token"]>,
  proofEnabled = true
) {
  const token = {
    ...example.token,
    ...tokenOverrides,
    initialAdmin: admin || tokenOverrides?.initialAdmin || example.token.initialAdmin
  };

  return {
    intent,
    requesterName: "AI2Human B20 Issuer",
    requesterHandle: "@ai2humannetwork",
    token,
    roles: {
      minter: admin || "0x2222222222222222222222222222222222222222",
      pauser: admin || "0x3333333333333333333333333333333333333333",
      metadata: admin || "0x4444444444444444444444444444444444444444",
      compliance: admin || "0x5555555555555555555555555555555555555555",
      operator: admin || "0x6666666666666666666666666666666666666666"
    },
    policies: {
      MINT_RECEIVER_POLICY: { type: "ALLOWLIST", accounts: [] },
      TRANSFER_RECEIVER_POLICY: { type: "ALLOWLIST", accounts: [] },
      TRANSFER_SENDER_POLICY: { type: "BLOCKLIST", accounts: [] }
    },
    proof: {
      required: proofEnabled,
      proofType: "structured_verification_bundle",
      requiredFor: proofEnabled ? ["mint eligibility", "role assignment", "allowlist membership"] : [],
      tasks: proofEnabled
        ? [
            "Verify member, issuer, operator, or reserve eligibility.",
            "Collect document, entity, location, reserve, or community proof.",
            "Review proof before adding the wallet to a B20 allowlist or assigning a role.",
            "Return a memo-ready proof hash for downstream B20 operations."
          ]
        : ["No AI2Human proof gate enabled for this preview."]
    }
  };
}

function shortAddress(address?: string) {
  if (!address || address.length < 12) return address || "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getFlowClass(current: number, step: number) {
  if (current > step) return styles.flowStepDone;
  if (current === step) return styles.flowStepActive;
  return styles.flowStep;
}

function normalizeRpcError(err: unknown, network: B20NetworkConfig = b20Networks.sepolia) {
  const message = err instanceof Error ? err.message : String(err || "Transaction failed.");
  if (/gas limit too high/i.test(message)) {
    return `RPC refused the transaction during gas estimation. Usually this means the wallet has no ${network.gasLabel} for gas, or the B20 preflight reverted before signing.`;
  }
  if (/insufficient funds/i.test(message)) {
    return `This wallet does not have enough ${network.gasLabel} to pay gas.`;
  }
  if (/user rejected|rejected the request/i.test(message)) {
    return "Wallet signature was rejected.";
  }
  if (/execution reverted/i.test(message)) {
    return `B20 preflight reverted before signing. Check token parameters and make sure the B20 precompile is active on ${network.name}.`;
  }
  return message;
}

function formatEthAmount(value: bigint) {
  const formatted = Number(formatEther(value));
  if (!Number.isFinite(formatted)) return "0";
  if (formatted === 0) return "0";
  if (formatted < 0.000001) return "<0.000001";
  return formatted.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

async function ensureB20Network(
  provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> },
  network: B20NetworkConfig
) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: network.chainHex }]
    });
  } catch {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: network.chainHex,
          chainName: network.name,
          nativeCurrency: network.nativeCurrency,
          rpcUrls: [network.rpcUrl],
          blockExplorerUrls: [network.explorerUrl]
        }
      ]
    });
  }
}

export default function B20SkillDemoClient() {
  const { wallets } = useWallets();

  const [selectedExample, setSelectedExample] = useState(0);
  const [prompt, setPrompt] = useState(examples[0].prompt);
  const [tokenName, setTokenName] = useState(examples[0].name);
  const [tokenSymbol, setTokenSymbol] = useState(examples[0].symbol);
  const [variant, setVariant] = useState<(typeof examples)[number]["variant"]>(examples[0].variant);
  const [decimals, setDecimals] = useState(String(examples[0].decimals));
  const [supplyCap, setSupplyCap] = useState(examples[0].supplyCap);
  const [currency, setCurrency] = useState("USD");
  const [proofGate, setProofGate] = useState(true);
  const [mintAmount, setMintAmount] = useState("1000");
  const [networkMode, setNetworkMode] = useState<B20NetworkMode>("sepolia");

  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [deployLoading, setDeployLoading] = useState(false);
  const [deployError, setDeployError] = useState("");
  const [deployStatus, setDeployStatus] = useState("");
  const [deployTxHash, setDeployTxHash] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");

  const [mintLoading, setMintLoading] = useState(false);
  const [mintError, setMintError] = useState("");
  const [mintStatus, setMintStatus] = useState("");
  const [mintTxHash, setMintTxHash] = useState("");

  const example = examples[selectedExample];
  const wallet =
    wallets.find((item) => item.walletClientType !== "privy" && item.address) ||
    wallets.find((item) => item.address);
  const walletAddress = wallet?.address as Address | undefined;
  const activeWalletAddress = walletAddress;
  const selectedNetwork = b20Networks[networkMode];

  const tokenOverrides = useMemo(
    () => ({
      variant,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: Number(decimals),
      maxSupply: supplyCap,
      currency,
      useCase: example.token.useCase
    }),
    [currency, decimals, example.token.useCase, supplyCap, tokenName, tokenSymbol, variant]
  );

  const request = useMemo(
    () => buildRequest(example, prompt, activeWalletAddress, tokenOverrides, proofGate),
    [activeWalletAddress, example, prompt, proofGate, tokenOverrides]
  );

  const currentStep = tokenAddress ? (mintTxHash ? 4 : 3) : preview ? 2 : 1;

  async function getActiveProvider() {
    if (wallet) return wallet.getEthereumProvider();
    return undefined;
  }

  async function runPreview() {
    setPreviewLoading(true);
    setPreviewError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(previewEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Preview generation failed.");
      setPreview(json);
    } catch (err) {
      setPreviewError(
        err instanceof Error && err.name === "AbortError"
          ? "Preview generation timed out. Please retry."
          : err instanceof Error
            ? err.message
            : "Unable to generate the config package."
      );
    } finally {
      window.clearTimeout(timeout);
      setPreviewLoading(false);
    }
  }

  function chooseExample(index: number) {
    const next = examples[index];
    setSelectedExample(index);
    setPrompt(next.prompt);
    setTokenName(next.name);
    setTokenSymbol(next.symbol);
    setVariant(next.variant);
    setDecimals(String(next.decimals));
    setSupplyCap(next.supplyCap);
    if (next.currency) setCurrency(next.currency);
    setDeployTxHash("");
    setTokenAddress("");
    setMintTxHash("");
    setPreviewError("");
    setDeployError("");
    setMintError("");
  }

  function chooseNetwork(nextMode: B20NetworkMode) {
    setNetworkMode(nextMode);
    setDeployTxHash("");
    setTokenAddress("");
    setMintTxHash("");
    setDeployStatus("");
    setMintStatus("");
    setDeployError("");
    setMintError("");
  }

  async function deployToken() {
    const provider = await getActiveProvider();
    if (!provider || !activeWalletAddress) {
      setDeployError("Connect your wallet from the top-right header first. This page uses the main app wallet session only.");
      return;
    }

    setDeployLoading(true);
    setDeployError("");
    setDeployStatus(`Checking ${selectedNetwork.name} network and wallet gas...`);
    setDeployTxHash("");
    setTokenAddress("");
    setMintTxHash("");

    try {
      const plan = buildB20DeployPlan({
        variant,
        name: tokenName,
        symbol: tokenSymbol,
        admin: activeWalletAddress,
        decimals: Number(decimals),
        currency,
        supplyCapTokens: supplyCap,
        saltText: `ai2human-${tokenSymbol.toLowerCase()}-${Date.now()}`
      });

      await ensureB20Network(provider, selectedNetwork);

      const publicClient = createPublicClient({
        chain: selectedNetwork.chain,
        transport: http(selectedNetwork.rpcUrl)
      });

      const balance = await publicClient.getBalance({ address: activeWalletAddress });
      if (balance === BigInt(0)) {
        setDeployStatus("");
        throw new Error(
          `This wallet has 0 ${selectedNetwork.gasLabel}. B20 deployment needs native ETH for gas. Sending LINK, USDC, or other tokens is not enough.`
        );
      }

      const predicted = (await publicClient.readContract({
        address: B20_FACTORY_ADDRESS,
        abi: b20FactoryAbi,
        functionName: "getB20Address",
        args: [plan.variantCode, activeWalletAddress, plan.salt]
      })) as Address;

      const data = encodeCreateB20Call(plan);
      setDeployStatus("Running B20 preflight and gas estimate before wallet signature...");

      const gasEstimate = await publicClient.estimateGas({
        account: activeWalletAddress,
        to: B20_FACTORY_ADDRESS,
        data,
        value: BigInt(0)
      });
      const gasPrice = await publicClient.getGasPrice();
      const estimatedGasCost = gasEstimate * gasPrice;

      if (balance < estimatedGasCost) {
        setDeployStatus("");
        throw new Error(
          `This wallet has ${formatEthAmount(balance)} ${selectedNetwork.gasLabel}, but the estimated gas cost is about ${formatEthAmount(
            estimatedGasCost
          )} ETH. Add ${selectedNetwork.gasLabel} and retry.`
        );
      }

      setDeployStatus(
        `Preflight passed. Predicted token: ${shortAddress(predicted)} · estimated gas ${gasEstimate.toString()} · signing in wallet...`
      );
      const txHash = (await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: activeWalletAddress,
            to: B20_FACTORY_ADDRESS,
            data,
            value: "0x0"
          }
        ]
      })) as Hex;

      setDeployTxHash(txHash);
      setDeployStatus(`Transaction submitted. Waiting for ${selectedNetwork.name} receipt...`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        throw new Error("Deployment transaction failed. Check BaseScan for the revert reason.");
      }

      setTokenAddress(predicted);
      setDeployStatus(`Deployment confirmed. Token address: ${shortAddress(predicted)}.`);
      await runPreview();
    } catch (err) {
      setDeployError(normalizeRpcError(err, selectedNetwork));
    } finally {
      setDeployLoading(false);
    }
  }

  async function mintTestBalance() {
    const provider = await getActiveProvider();
    if (!provider || !activeWalletAddress || !tokenAddress) {
      setMintError("Issue the B20 token first.");
      return;
    }

    setMintLoading(true);
    setMintError("");
    setMintStatus(`Checking ${selectedNetwork.name} gas before mint...`);
    try {
      await ensureB20Network(provider, selectedNetwork);
      const publicClient = createPublicClient({
        chain: selectedNetwork.chain,
        transport: http(selectedNetwork.rpcUrl)
      });
      const balance = await publicClient.getBalance({ address: activeWalletAddress });
      if (balance === BigInt(0)) {
        setMintStatus("");
        throw new Error(`This wallet has 0 ${selectedNetwork.gasLabel}. Mint needs native ETH for gas.`);
      }
      const unit = BigInt(10) ** BigInt(variant === "STABLECOIN" ? 6 : Number(decimals) || 18);
      const amount = BigInt(mintAmount || "1000") * unit;
      const data = encodeMint(activeWalletAddress, amount);

      const gasEstimate = await publicClient.estimateGas({
        account: activeWalletAddress,
        to: tokenAddress as Address,
        data,
        value: BigInt(0)
      });
      const gasPrice = await publicClient.getGasPrice();
      const estimatedGasCost = gasEstimate * gasPrice;
      if (balance < estimatedGasCost) {
        setMintStatus("");
        throw new Error(
          `This wallet has ${formatEthAmount(balance)} ${selectedNetwork.gasLabel}, but mint gas is about ${formatEthAmount(estimatedGasCost)} ETH.`
        );
      }

      setMintStatus(`Mint preflight passed. Estimated gas ${gasEstimate.toString()} · signing in wallet...`);

      const txHash = (await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: activeWalletAddress,
            to: tokenAddress,
            data,
            value: "0x0"
          }
        ]
      })) as Hex;

      setMintTxHash(txHash);
      setMintStatus("Mint transaction submitted. Waiting for receipt...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        throw new Error("Mint transaction failed.");
      }
      setMintStatus("Mint confirmed.");
    } catch (err) {
      setMintError(normalizeRpcError(err, selectedNetwork));
    } finally {
      setMintLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void runPreview();
    }, 250);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWalletAddress, tokenName, tokenSymbol, variant, supplyCap, decimals, prompt, selectedExample, proofGate]);

  return (
    <section className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <span className={styles.kicker}>B20 Proof Gateway</span>
          <h1>Issue B20 tokens with a human proof gate.</h1>
          <p className={styles.tagline}>B20 enforces native token rules. AI2Human verifies who is allowed to use them.</p>
          <p>
            Connect from the top-right header, issue a B20 token on Sepolia or Base mainnet, then attach AI2Human proof
            requirements for mint access, allowlists, and role assignment. Sepolia proof-of-concept:{" "}
            <Link href={buildExplorerAddressUrl(proofTokenAddress, BASE_SEPOLIA_CHAIN_ID)} target="_blank" rel="noreferrer" className={styles.mono}>
              A2HP
            </Link>
            .
          </p>

          <div className={styles.flowRow}>
            {flowSteps.map((step) => (
              <div key={step.id} className={getFlowClass(currentStep, step.id)}>
                <strong>
                  {step.id}. {step.title}
                </strong>
                <span>{step.hint}</span>
              </div>
            ))}
          </div>
        </header>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>1. Set the rules</h2>
            <p>Choose a use-case template, define token parameters, and decide whether mint or allowlist access requires AI2Human review.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.networkSwitch}>
              <div>
                <strong>Network</strong>
                <span>{selectedNetwork.description}</span>
              </div>
              <div className={styles.segmented}>
                <button
                  type="button"
                  className={networkMode === "sepolia" ? styles.segmentActive : styles.segment}
                  onClick={() => chooseNetwork("sepolia")}
                >
                  Base Sepolia
                </button>
                <button
                  type="button"
                  className={networkMode === "mainnet" ? styles.segmentActive : styles.segment}
                  onClick={() => chooseNetwork("mainnet")}
                >
                  Base Mainnet
                </button>
              </div>
            </div>
            {networkMode === "mainnet" && (
              <p className={styles.mainnetWarning}>
                Mainnet mode creates a real B20 token on Base. Finalize token name, ticker, admin wallet, roles, and supply cap before signing.
              </p>
            )}
            <div className={styles.presets}>
              {examples.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={selectedExample === index ? styles.presetActive : styles.preset}
                  onClick={() => chooseExample(index)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.summary}</span>
                </button>
              ))}
            </div>

            <div className={styles.grid2}>
              <label className={styles.field}>
                <span>Token name</span>
                <input value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Symbol</span>
                <input value={tokenSymbol} onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())} />
              </label>
              <label className={styles.field}>
                <span>Type</span>
                <select value={variant} onChange={(e) => setVariant(e.target.value as typeof variant)}>
                  <option value="ASSET">Asset (6-18 decimals)</option>
                  <option value="STABLECOIN">Stablecoin (fixed 6 decimals + currency code)</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Supply cap</span>
                <input value={supplyCap} onChange={(e) => setSupplyCap(e.target.value)} />
              </label>
              {variant === "ASSET" ? (
                <label className={styles.field}>
                  <span>Decimals</span>
                  <input value={decimals} onChange={(e) => setDecimals(e.target.value)} />
                </label>
              ) : (
                <label className={styles.field}>
                  <span>Currency code</span>
                  <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
                </label>
              )}
            </div>

            <label className={styles.field} style={{ marginTop: 14 }}>
              <span>Rule prompt for agents / APIs</span>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            </label>

            <label className={styles.proofToggle}>
              <input type="checkbox" checked={proofGate} onChange={(e) => setProofGate(e.target.checked)} />
              <div>
                <strong>Enable AI2Human proof gate</strong>
                <span>
                  After issuance, new wallets must complete a human verification task before mint access, allowlist access,
                  or role assignment. This is the layer pure token tools do not provide.
                </span>
              </div>
            </label>

            <div className={styles.walletActions} style={{ marginTop: 16 }}>
              <button type="button" className={styles.secondaryButton} onClick={() => runPreview()} disabled={previewLoading}>
                {previewLoading ? "Generating..." : "Refresh config package"}
              </button>
            </div>
            {previewError && <p className={styles.error}>{previewError}</p>}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>2. Preview the plan</h2>
            <p>This is the B20 configuration package that will be sent on-chain.</p>
          </div>
          <div className={styles.panelBody}>
            {preview ? (
              <>
                <div className={styles.summaryGrid}>
                  <article className={styles.summaryCard}>
                    <span>Token</span>
                    <strong>{preview.tokenConfig.symbol}</strong>
                    <em>{preview.tokenConfig.name}</em>
                  </article>
                  <article className={styles.summaryCard}>
                    <span>Supply cap</span>
                    <strong>{preview.tokenConfig.supplyCap}</strong>
                    <em>{preview.tokenConfig.variant}</em>
                  </article>
                  <article className={styles.summaryCard}>
                    <span>Policies</span>
                    <strong>{preview.policyConfig.length}</strong>
                    <em>allowlist / blocklist scopes</em>
                  </article>
                </div>

                {proofGate && (
                  <div className={styles.proofBox}>
                    <h3>{preview.proofRequirements.optionalTaskTemplate?.title || "AI2Human proof gate"}</h3>
                    <p>
                      {preview.proofRequirements.optionalTaskTemplate?.blockedHumanStep ||
                        "Before allowlist or mint access, a human review must return a proof hash."}
                    </p>
                    <ul>
                      {preview.proofRequirements.tasks.slice(0, 4).map((task) => (
                        <li key={task}>{task}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className={styles.notice}>A config package will be generated after rules are filled.</p>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>3. Issue with wallet</h2>
            <p>Use the top-right header wallet, then sign createB20 here. {selectedNetwork.gasLabel} is required for gas.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.walletBar}>
              <div>
                <strong>{activeWalletAddress ? shortAddress(activeWalletAddress) : "No wallet connected"}</strong>
                <span>Header wallet only · {selectedNetwork.name} · Chain ID {selectedNetwork.chainId}</span>
              </div>
              <div className={styles.walletActions}>
                {activeWalletAddress ? (
                  <span className={styles.notice}>Wallet connected</span>
                ) : (
                  <span className={styles.notice}>Use Connect Wallet in the header first</span>
                )}
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => deployToken()}
                  disabled={deployLoading || !activeWalletAddress}
                >
                  {deployLoading
                    ? "Issuing..."
                    : activeWalletAddress
                      ? selectedNetwork.actionLabel
                      : `${selectedNetwork.actionLabel} requires wallet`}
                </button>
              </div>
            </div>

            {deployStatus && <p className={styles.notice}>{deployStatus}</p>}
            {deployError && <p className={styles.error}>{deployError}</p>}
            {networkMode === "sepolia" && deployError && /Base Sepolia ETH|gas/i.test(deployError) && (
              <Link href={baseSepoliaFaucetUrl} target="_blank" rel="noreferrer" className={styles.linkButton}>
                Get Base Sepolia ETH
              </Link>
            )}

            {tokenAddress && (
              <div className={styles.receipt}>
                <strong>Deployment confirmed</strong>
                <p>Token address</p>
                <div className={styles.mono}>{tokenAddress}</div>
                <div className={styles.receiptActions}>
                  <Link href={buildExplorerAddressUrl(tokenAddress, selectedNetwork.chainId)} target="_blank" rel="noreferrer" className={styles.linkButton}>
                    View token
                  </Link>
                  {deployTxHash && (
                    <Link href={buildExplorerTxUrl(deployTxHash, selectedNetwork.chainId)} target="_blank" rel="noreferrer" className={styles.linkButton}>
                      View deploy tx
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>4. Mint + proof</h2>
            <p>After deployment, mint a test balance. If the proof gate is enabled, future wallets must pass an AI2Human task first.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span>Test mint amount</span>
                <input value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} />
              </label>
              <div className={styles.walletActions} style={{ alignItems: "end" }}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => mintTestBalance()}
                  disabled={mintLoading || !tokenAddress}
                >
                  {mintLoading ? "Minting..." : "Mint to current wallet"}
                </button>
              </div>
            </div>

            {mintError && <p className={styles.error}>{mintError}</p>}
            {mintStatus && <p className={styles.notice}>{mintStatus}</p>}
            {mintTxHash && (
              <div className={styles.receipt} style={{ marginTop: 14 }}>
                <strong>Mint confirmed</strong>
                <p>Minted {mintAmount} {tokenSymbol} to {shortAddress(activeWalletAddress)}</p>
                <Link href={buildExplorerTxUrl(mintTxHash, selectedNetwork.chainId)} target="_blank" rel="noreferrer" className={styles.linkButton}>
                  View mint tx
                </Link>
              </div>
            )}

            {proofGate && tokenAddress && (
              <div className={styles.proofBox} style={{ marginTop: 14 }}>
                <h3>Next: connect proof to token rules</h3>
                <p>
                  Issuance is only the first step. To enforce proof-before-mint, create an AI2Human verification task,
                  approve the submitted proof, then update the B20 allowlist or execute mint.
                </p>
                <div className={styles.receiptActions}>
                  <Link href="/tasks/new" className={styles.linkButton}>
                    Create verification task
                  </Link>
                  <Link href="/agent/b20-skill.md" className={styles.linkButton}>
                    Agent Skill docs
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        <nav className={styles.footerLinks}>
          <Link href="/agent/b20-skill.md">B20 Skill</Link>
          <Link href="/agent/b20/manifest.json">Manifest</Link>
          <Link href="/for-agents">For Agents</Link>
          <a href="https://docs.base.org/get-started/launch-b20-token" target="_blank" rel="noreferrer">
            Base B20 docs
          </a>
        </nav>
      </div>
    </section>
  );
}
