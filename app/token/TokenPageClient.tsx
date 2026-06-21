"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./token.module.css";

const contractAddress = "0xc46C41005A1A88B0C1491F2B542A4831D6d1EbA3";
const pairAddress = "0x9c7cab6819e0345d110697bf347a3bc2f87379fbd025b2ba33a54507827c545b";
const basescanUrl = `https://basescan.org/token/${contractAddress}`;
const dexscreenerUrl = `https://dexscreener.com/base/${pairAddress}`;
const chartUrl =
  `${dexscreenerUrl}?embed=1&theme=dark&trades=0&info=0`;

type DexPair = {
  priceUsd?: string;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  marketCap?: number;
  fdv?: number;
};

function formatUsd(value: number | string | undefined, compact = true) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  if (num > 0 && num < 0.0001) {
    return `$${num.toFixed(10).replace(/0+$/, "").replace(/\.$/, "")}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: num < 1 ? 6 : 2
  }).format(num);
}

function formatPercent(value: number | undefined) {
  if (!Number.isFinite(Number(value))) return "-";
  const num = Number(value);
  return `${num > 0 ? "+" : ""}${num.toFixed(2)}%`;
}

function buildStats(pair: DexPair | null) {
  return [
    ["Price", formatUsd(pair?.priceUsd, false)],
    ["24h Change", formatPercent(pair?.priceChange?.h24)],
    ["24h Volume", formatUsd(pair?.volume?.h24)],
    ["Liquidity", formatUsd(pair?.liquidity?.usd)],
    ["Market Cap", formatUsd(pair?.marketCap || pair?.fdv)]
  ] as const;
}

const venueGroups = [
  {
    title: "DEX Pools",
    icon: "coins",
    venues: [
      {
        name: "Uniswap",
        desc: "$A2H / WETH pool on Base.",
        href: `https://app.uniswap.org/explore/pools/base/${pairAddress}`
      },
      {
        name: "DexScreener",
        desc: "Live chart, liquidity, volume, and trades.",
        href: dexscreenerUrl
      },
      {
        name: "BaseScan",
        desc: "Contract, holders, and transfers.",
        href: basescanUrl
      }
    ]
  },
  {
    title: "Aggregators",
    icon: "layers",
    venues: [
      {
        name: "Matcha",
        desc: "0x routing.",
        href: `https://matcha.xyz/trade?buyAddress=${contractAddress}&buyChain=8453&ref=dexscreener&sellAddress=0x4200000000000000000000000000000000000006&sellChain=8453&swapFeeBps=40&sellAmount=1`
      },
      {
        name: "KyberSwap",
        desc: "Multi-route aggregator.",
        href: `https://kyberswap.com/partner-swap?chainId=8453&inputCurrency=0x4200000000000000000000000000000000000006&outputCurrency=${contractAddress}&clientId=dexscreener&feeReceiver=0x0DA2a82ED2c387d1751ccbAf999A80b65bdb269E&enableTip=true&chargeFeeBy=currency_out&feeAmount=30&preferredFeeTokens=0x4200000000000000000000000000000000000006`
      }
    ]
  },
  {
    title: "Community",
    icon: "message",
    venues: [
      {
        name: "Telegram",
        desc: "Join the AI2Human community.",
        href: "https://t.me/ai2humanwork"
      }
    ]
  },
  {
    title: "Product",
    icon: "building",
    venues: [
      {
        name: "Tasks",
        desc: "Complete tasks, submit proof, and claim USDC.",
        href: "/tasks"
      }
    ]
  },
  {
    title: "Social",
    icon: "card",
    venues: [
      {
        name: "X",
        desc: "Follow AI2Human updates and campaigns.",
        href: "https://x.com/ai2humannetwork"
      }
    ]
  }
] as const;

function RootLogo() {
  return (
    <span className={styles.logoMark} aria-label="AI2Human">
      <span className={styles.logoNode}>A</span>
      <span className={styles.logoText}>AI2Human</span>
    </span>
  );
}

function Icon({ name }: { name: string }) {
  if (name === "coins") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="8" cy="8" r="6" />
        <path d="M18.1 10.4a6 6 0 1 1-7.8 7.6" />
        <path d="M7 6h1v4" />
        <path d="m16.7 13.9.7.7-2.8 2.8" />
      </svg>
    );
  }

  if (name === "layers") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12.8 2.2 8.6 3.9a1 1 0 0 1 0 1.8l-8.6 3.9a2 2 0 0 1-1.6 0L2.6 7.9a1 1 0 0 1 0-1.8l8.6-3.9a2 2 0 0 1 1.6 0Z" />
        <path d="m22 12.7-9.2 4.1a2 2 0 0 1-1.6 0L2 12.7" />
        <path d="m22 17.7-9.2 4.1a2 2 0 0 1-1.6 0L2 17.7" />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
      </svg>
    );
  }

  if (name === "building") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="14" height="14" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export default function TokenPage() {
  const [copied, setCopied] = useState(false);
  const [pair, setPair] = useState<DexPair | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`https://api.dexscreener.com/latest/dex/pairs/base/${pairAddress}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { pair?: DexPair; pairs?: DexPair[] }) => {
        if (cancelled) return;
        setPair(payload.pair || payload.pairs?.[0] || null);
      })
      .catch(() => {
        if (!cancelled) setPair(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function copyContract() {
    await navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className={styles.page}>
      <div className={styles.noise} aria-hidden="true" />

      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link href="/" className={styles.logoLink}>
            <RootLogo />
          </Link>
          <div className={styles.navLinks}>
            <Link href="/#features">Features</Link>
            <Link href="/token">Token</Link>
            <Link href="/whitepaper">Whitepaper</Link>
          </div>
          <Link className={styles.appButton} href="/tasks">
            Enter App
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <h1>$A2H</h1>
        <p>The AI2Human token on Base, connected to task access, operator trust, and the proof-to-settlement network.</p>
        <div className={styles.contractPill}>
          <span>Contract</span>
          <code>{contractAddress}</code>
          <button type="button" onClick={copyContract} aria-label="Copy contract address">
            <CopyIcon />
          </button>
          <a href={basescanUrl} target="_blank" rel="noopener noreferrer" aria-label="Open on Basescan">
            <ExternalIcon />
          </a>
        </div>
        {copied ? <div className={styles.copyStatus}>Copied</div> : null}
      </section>

      <section className={styles.stats} aria-label="Token market stats">
        {buildStats(pair).map(([label, value]) => (
          <div className={styles.statCard} key={label}>
            <div>{label}</div>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <section className={styles.chartSection} aria-label="A2H live chart">
        <div className={styles.chartFrame}>
          <iframe src={chartUrl} title="A2H live chart" allow="clipboard-write" />
        </div>
      </section>

      <section className={styles.venues}>
        <div className={styles.sectionHeader}>
          <h2>Where to buy</h2>
          <p>Multiple rails. Pick the one that fits your flow.</p>
        </div>

        <div className={styles.groupStack}>
          {venueGroups.map((group) => (
            <div className={styles.venueGroup} key={group.title}>
              <div className={styles.groupTitle}>
                <Icon name={group.icon} />
                <h3>{group.title}</h3>
              </div>
              <div className={styles.venueGrid}>
                {group.venues.map((venue) => (
                  <a className={styles.venueCard} href={venue.href} target="_blank" rel="noopener noreferrer" key={venue.name}>
                    <span>
                      <strong>{venue.name}</strong>
                      <small>{venue.desc}</small>
                    </span>
                    <ExternalIcon />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <RootLogo />
            <p>Task access, proof, verification, and settlement.</p>
          </div>
          <div className={styles.legal}>
            <h4>Legal</h4>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2026 AI2Human. All rights reserved.</p>
          <div>
            <a href="https://x.com/ai2humannetwork" target="_blank" rel="noopener noreferrer" aria-label="X">
              X
            </a>
            <a href="https://t.me/ai2humanwork" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
              Telegram
            </a>
            <a href={dexscreenerUrl} target="_blank" rel="noopener noreferrer" aria-label="DexScreener">
              DexScreener
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
