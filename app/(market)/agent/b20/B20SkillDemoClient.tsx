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
import { baseSepolia } from "viem/chains";
import styles from "./b20Skill.module.css";
import {
  BASE_SEPOLIA_CHAIN_ID,
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

const flowSteps = [
  { id: 1, title: "设规则", hint: "名称、类型、供应量、证明门槛" },
  { id: 2, title: "看方案", hint: "生成 B20 配置包" },
  { id: 3, title: "钱包发币", hint: "Base Sepolia createB20" },
  { id: 4, title: "Mint + 证明", hint: "测试 mint，接 AI2Human 审核" }
];

const examples = [
  {
    id: "rwa",
    label: "RWA 社区",
    summary: "成员验证后才能 mint",
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
    label: "本地稳定币",
    summary: "USD 背书，6 位小数",
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
    label: "Agent 网络",
    summary: "工作证明后才能接收",
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

function normalizeRpcError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err || "Transaction failed.");
  if (/gas limit too high/i.test(message)) {
    return "RPC refused the transaction during gas estimation. Usually this means the wallet has no Base Sepolia ETH for gas, or the B20 preflight reverted before signing.";
  }
  if (/insufficient funds/i.test(message)) {
    return "This wallet does not have enough Base Sepolia ETH to pay gas.";
  }
  if (/user rejected|rejected the request/i.test(message)) {
    return "Wallet signature was rejected.";
  }
  if (/execution reverted/i.test(message)) {
    return "B20 preflight reverted before signing. Check token parameters and make sure the B20 precompile is active on Base Sepolia.";
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

async function ensureBaseSepolia(provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x14a34" }]
    });
  } catch {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x14a34",
          chainName: "Base Sepolia",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://sepolia.base.org"],
          blockExplorerUrls: ["https://sepolia.basescan.org"]
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
      if (!res.ok) throw new Error(json.error || "生成失败");
      setPreview(json);
    } catch (err) {
      setPreviewError(err instanceof Error && err.name === "AbortError" ? "配置包生成超时，请重试。" : err instanceof Error ? err.message : "无法生成配置包");
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

  async function deployToken() {
    const provider = await getActiveProvider();
    if (!provider || !activeWalletAddress) {
      setDeployError("请先使用页面右上角 Header 的 Connect Wallet 连接钱包。B20 页面不再提供第二套连接入口。");
      return;
    }

    setDeployLoading(true);
    setDeployError("");
    setDeployStatus("Checking Base Sepolia network and wallet gas...");
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

      await ensureBaseSepolia(provider);

      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http("https://sepolia.base.org")
      });

      const balance = await publicClient.getBalance({ address: activeWalletAddress });
      if (balance === BigInt(0)) {
        setDeployStatus("");
        throw new Error(
          "This wallet has 0 Base Sepolia ETH. B20 deployment needs ETH for gas. Sending LINK, USDC, or other test tokens is not enough."
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
          `This wallet has ${formatEthAmount(balance)} Base Sepolia ETH, but the estimated gas cost is about ${formatEthAmount(
            estimatedGasCost
          )} ETH. Add Base Sepolia ETH and retry.`
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
      setDeployStatus("Transaction submitted. Waiting for Base Sepolia receipt...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        throw new Error("发币交易失败，请在 BaseScan 查看 revert 原因。");
      }

      setTokenAddress(predicted);
      setDeployStatus(`Deployment confirmed. Token address: ${shortAddress(predicted)}.`);
      await runPreview();
    } catch (err) {
      setDeployError(normalizeRpcError(err));
    } finally {
      setDeployLoading(false);
    }
  }

  async function mintTestBalance() {
    const provider = await getActiveProvider();
    if (!provider || !activeWalletAddress || !tokenAddress) {
      setMintError("请先完成发币。");
      return;
    }

    setMintLoading(true);
    setMintError("");
    setMintStatus("Checking Base Sepolia gas before mint...");
    try {
      await ensureBaseSepolia(provider);
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http("https://sepolia.base.org")
      });
      const balance = await publicClient.getBalance({ address: activeWalletAddress });
      if (balance === BigInt(0)) {
        setMintStatus("");
        throw new Error("This wallet has 0 Base Sepolia ETH. Mint needs ETH for gas.");
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
          `This wallet has ${formatEthAmount(balance)} Base Sepolia ETH, but mint gas is about ${formatEthAmount(estimatedGasCost)} ETH.`
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
        throw new Error("Mint 交易失败。");
      }
      setMintStatus("Mint confirmed.");
    } catch (err) {
      setMintError(normalizeRpcError(err));
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
          <h1>带证明门槛的 B20 发币</h1>
          <p className={styles.tagline}>B20 负责链上规则，AI2Human 负责谁有资格上链。</p>
          <p>
            先用右上角 Header 连接钱包，再在 Base Sepolia 一键发行 B20 token，并按你的规则挂上 AI2Human 人工证明门槛。
            已有实测案例{" "}
            <Link href={buildExplorerAddressUrl(proofTokenAddress)} target="_blank" rel="noreferrer" className={styles.mono}>
              A2HP
            </Link>
            。
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
            <h2>1. 设规则</h2>
            <p>选场景模板，填代币参数。勾选证明门槛后，mint / allowlist 需先走 AI2Human 审核。</p>
          </div>
          <div className={styles.panelBody}>
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
                <span>代币名称</span>
                <input value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>代号</span>
                <input value={tokenSymbol} onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())} />
              </label>
              <label className={styles.field}>
                <span>类型</span>
                <select value={variant} onChange={(e) => setVariant(e.target.value as typeof variant)}>
                  <option value="ASSET">Asset（6–18 位小数）</option>
                  <option value="STABLECOIN">Stablecoin（固定 6 位 + 法币代码）</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>最大供应量</span>
                <input value={supplyCap} onChange={(e) => setSupplyCap(e.target.value)} />
              </label>
              {variant === "ASSET" ? (
                <label className={styles.field}>
                  <span>小数位</span>
                  <input value={decimals} onChange={(e) => setDecimals(e.target.value)} />
                </label>
              ) : (
                <label className={styles.field}>
                  <span>法币代码</span>
                  <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
                </label>
              )}
            </div>

            <label className={styles.field} style={{ marginTop: 14 }}>
              <span>规则描述（给 Agent / API 用）</span>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            </label>

            <label className={styles.proofToggle}>
              <input type="checkbox" checked={proofGate} onChange={(e) => setProofGate(e.target.checked)} />
              <div>
                <strong>启用 AI2Human 证明门槛</strong>
                <span>发币后，新地址想 mint 或进 allowlist，需先完成人工证明任务。这是 AI2Human 相对纯发币工具的核心差异。</span>
              </div>
            </label>

            <div className={styles.walletActions} style={{ marginTop: 16 }}>
              <button type="button" className={styles.secondaryButton} onClick={() => runPreview()} disabled={previewLoading}>
                {previewLoading ? "生成中..." : "刷新配置包"}
              </button>
            </div>
            {previewError && <p className={styles.error}>{previewError}</p>}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>2. 看方案</h2>
            <p>这是即将上链的 B20 配置摘要。</p>
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
                    <h3>{preview.proofRequirements.optionalTaskTemplate?.title || "AI2Human 证明门槛"}</h3>
                    <p>
                      {preview.proofRequirements.optionalTaskTemplate?.blockedHumanStep ||
                        "在 allowlist / mint 之前，必须完成人工审核并返回 proof hash。"}
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
              <p className={styles.notice}>填写规则后会自动生成配置包。</p>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>3. 钱包发币</h2>
            <p>使用页面右上角 Header 的 Connect Wallet 连接钱包，然后在这里签名 createB20。需要 Base Sepolia ETH。</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.walletBar}>
              <div>
                <strong>{activeWalletAddress ? shortAddress(activeWalletAddress) : "未连接钱包"}</strong>
                <span>Header wallet only · Base Sepolia · Chain ID {BASE_SEPOLIA_CHAIN_ID}</span>
              </div>
              <div className={styles.walletActions}>
                {activeWalletAddress ? (
                  <span className={styles.notice}>钱包已连接</span>
                ) : (
                  <span className={styles.notice}>请先点右上角 Connect Wallet</span>
                )}
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => deployToken()}
                  disabled={deployLoading || !activeWalletAddress}
                >
                  {deployLoading ? "发币中..." : activeWalletAddress ? "一键发 B20 Token" : "Header 钱包未连接"}
                </button>
              </div>
            </div>

            {deployStatus && <p className={styles.notice}>{deployStatus}</p>}
            {deployError && <p className={styles.error}>{deployError}</p>}
            {deployError && /Base Sepolia ETH|gas/i.test(deployError) && (
              <Link href={baseSepoliaFaucetUrl} target="_blank" rel="noreferrer" className={styles.linkButton}>
                Get Base Sepolia ETH
              </Link>
            )}

            {tokenAddress && (
              <div className={styles.receipt}>
                <strong>发币成功</strong>
                <p>Token 地址</p>
                <div className={styles.mono}>{tokenAddress}</div>
                <div className={styles.receiptActions}>
                  <Link href={buildExplorerAddressUrl(tokenAddress)} target="_blank" rel="noreferrer" className={styles.linkButton}>
                    查看 Token
                  </Link>
                  {deployTxHash && (
                    <Link href={buildExplorerTxUrl(deployTxHash)} target="_blank" rel="noreferrer" className={styles.linkButton}>
                      查看 Deploy Tx
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>4. Mint + 证明</h2>
            <p>发币成功后 mint 测试余额。若启用证明门槛，后续新地址需先走 AI2Human 任务。</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span>测试 Mint 数量</span>
                <input value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} />
              </label>
              <div className={styles.walletActions} style={{ alignItems: "end" }}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => mintTestBalance()}
                  disabled={mintLoading || !tokenAddress}
                >
                  {mintLoading ? "Mint 中..." : "Mint 到当前钱包"}
                </button>
              </div>
            </div>

            {mintError && <p className={styles.error}>{mintError}</p>}
            {mintStatus && <p className={styles.notice}>{mintStatus}</p>}
            {mintTxHash && (
              <div className={styles.receipt} style={{ marginTop: 14 }}>
                <strong>Mint 成功</strong>
                <p>已 mint {mintAmount} {tokenSymbol} 到 {shortAddress(activeWalletAddress)}</p>
                <Link href={buildExplorerTxUrl(mintTxHash)} target="_blank" rel="noreferrer" className={styles.linkButton}>
                  查看 Mint Tx
                </Link>
              </div>
            )}

            {proofGate && tokenAddress && (
              <div className={styles.proofBox} style={{ marginTop: 14 }}>
                <h3>下一步：把证明接进规则</h3>
                <p>
                  发币只是第一步。要 enforce「先证明再 mint」，请在 AI2Human 创建验证任务，审核通过后再更新 B20 allowlist 或执行 mint。
                </p>
                <div className={styles.receiptActions}>
                  <Link href="/tasks/new" className={styles.linkButton}>
                    创建 AI2Human 验证任务
                  </Link>
                  <Link href="/agent/b20-skill.md" className={styles.linkButton}>
                    Agent Skill 文档
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
            Base B20 文档
          </a>
        </nav>
      </div>
    </section>
  );
}
