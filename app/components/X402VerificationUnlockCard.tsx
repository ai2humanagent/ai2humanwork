"use client";

import { useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  X402_PAYMENT_HEADER,
  X402_PAYMENT_RESPONSE_HEADER,
  buildTransferWithAuthorizationTypedData,
  createUnsignedX402Payment,
  decodeBase64Json,
  encodeX402PaymentHeader,
  type X402Challenge,
  type X402Requirement
} from "../lib/x402Shared";

type UnlockTask = {
  id: string;
  title: string;
  status: "created" | "ai_running" | "ai_failed" | "ai_done" | "human_assigned" | "human_done" | "verified" | "paid";
  budget: string;
  campaign?: {
    requesterHandle?: string;
  };
};

type UnlockResult = {
  bundle?: {
    bundleHash: string;
    evidenceHash: string;
    evidenceCount: number;
    title: string;
    status: string;
  };
  payment?: {
    amount?: string;
    tokenSymbol?: string;
    txHash?: string;
    explorerUrl?: string;
    payerAddress?: string;
  };
  x402?: {
    priceLabel?: string;
    symbol?: string;
    payTo?: string;
  };
  paymentResponse?: {
    txHash?: string;
    payer?: string;
    amount?: string;
    tokenSymbol?: string;
    network?: string;
  } | null;
};

function shortAddress(address?: string) {
  if (!address) return "Not connected";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isReadyForUnlock(task?: UnlockTask | null) {
  return Boolean(task && ["human_done", "verified", "paid"].includes(task.status));
}

export default function X402VerificationUnlockCard({ task }: { task: UnlockTask | null }) {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UnlockResult | null>(null);
  const [challengeMeta, setChallengeMeta] = useState<{
    priceLabel?: string;
    payTo?: string;
    symbol?: string;
    bundleHash?: string;
  } | null>(null);

  const wallet =
    wallets.find((item) => item.walletClientType === "privy" && item.address) ||
    wallets.find((item) => item.address) ||
    null;

  const readyForUnlock = isReadyForUnlock(task);

  const statusLabel = useMemo(() => {
    if (!task) return "Waiting for a verified task";
    if (!readyForUnlock) return "Proof bundle unlock activates after evidence is submitted";
    return "x402 payment-gated verification bundle is ready";
  }, [readyForUnlock, task]);

  async function buildPaymentHeader(requirement: X402Requirement) {
    if (!wallet?.address) {
      throw new Error("Connect a Privy wallet before paying for the verification bundle.");
    }

    const provider = await wallet.getEthereumProvider();
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xc4" }]
      });
    } catch {
      // Embedded Privy wallets already follow the configured default chain.
    }

    const unsignedPayment = createUnsignedX402Payment({
      from: wallet.address,
      requirement
    });
    const typedData = buildTransferWithAuthorizationTypedData(
      requirement,
      unsignedPayment.payload.authorization
    );
    const signature = (await provider.request({
      method: "eth_signTypedData_v4",
      params: [wallet.address, JSON.stringify(typedData)]
    })) as string;

    return encodeX402PaymentHeader({
      ...unsignedPayment,
      payload: {
        ...unsignedPayment.payload,
        signature
      }
    });
  }

  async function unlockBundle() {
    if (!task) return;
    if (!readyForUnlock) {
      setError("Run the task through proof submission first, then unlock the verification bundle.");
      return;
    }
    if (!ready) return;
    if (!authenticated) {
      login();
      return;
    }

    setWorking(true);
    setError("");
    setResult(null);

    try {
      const endpoint = `/api/tasks/${task.id}/verification-bundle`;
      let response = await fetch(endpoint, { cache: "no-store" });

      if (response.status === 402) {
        const challenge = (await response.json()) as X402Challenge & {
          bundlePreview?: { bundleHash?: string };
          x402?: { priceLabel?: string; payTo?: string; symbol?: string };
        };
        const requirement = challenge.accepts?.[0];
        if (!requirement) {
          throw new Error("The verification bundle challenge did not include payment requirements.");
        }

        setChallengeMeta({
          priceLabel: challenge.x402?.priceLabel,
          payTo: challenge.x402?.payTo,
          symbol: challenge.x402?.symbol,
          bundleHash: challenge.bundlePreview?.bundleHash
        });

        const paymentHeader = await buildPaymentHeader(requirement);
        response = await fetch(endpoint, {
          cache: "no-store",
          headers: {
            [X402_PAYMENT_HEADER]: paymentHeader
          }
        });
      }

      const payload = (await response.json().catch(() => ({}))) as UnlockResult & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to unlock the verification bundle.");
      }

      const paymentResponseHeader = response.headers.get(X402_PAYMENT_RESPONSE_HEADER);
      setResult({
        ...payload,
        paymentResponse: paymentResponseHeader
          ? decodeBase64Json<UnlockResult["paymentResponse"]>(paymentResponseHeader)
          : null
      });
    } catch (unlockError) {
      setError(
        unlockError instanceof Error ? unlockError.message : "Unable to unlock verification bundle."
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="market-card">
      <div className="block-header">
        <div>
          <h2>x402 Verification Bundle</h2>
          <p className="mvp-muted">
            Pay with the executor wallet to unlock the structured proof bundle on X Layer.
          </p>
        </div>
        <span className={`status-pill ${readyForUnlock ? "status-verified" : "status-created"}`}>
          {readyForUnlock ? "Ready" : "Waiting"}
        </span>
      </div>

      <div className="mvp-evidence">
        <div className="mvp-evidence-item">
          <div className="evidence-meta">
            <span>task</span>
            <span>{task?.status || "pending"}</span>
          </div>
          <p>{task?.title || "No eligible task selected yet."}</p>
          {task?.campaign?.requesterHandle && (
            <p className="mvp-muted">Campaign requester: {task.campaign.requesterHandle}</p>
          )}
          <p className="mvp-muted">{statusLabel}</p>
        </div>
      </div>

      <div className="reviewer-metric-grid">
        <div>
          <span>Wallet</span>
          <strong>{shortAddress(wallet?.address)}</strong>
        </div>
        <div>
          <span>Bundle price</span>
          <strong>{challengeMeta?.priceLabel || "x402 challenge"}</strong>
        </div>
        <div>
          <span>Network</span>
          <strong>X Layer</strong>
        </div>
        <div>
          <span>Pay to</span>
          <strong>{shortAddress(challengeMeta?.payTo)}</strong>
        </div>
      </div>

      {challengeMeta?.bundleHash && (
        <p className="mvp-muted">Bundle preview hash: {challengeMeta.bundleHash}</p>
      )}

      {error && <p className="reviewer-error">{error}</p>}

      <button
        type="button"
        className="button buttonPrimary"
        disabled={!task || working || !readyForUnlock}
        onClick={unlockBundle}
      >
        {working
          ? "Unlocking..."
          : authenticated
            ? "Unlock Bundle With x402"
            : "Connect Wallet To Unlock"}
      </button>

      {result?.bundle && (
        <div className="mvp-evidence">
          <h4>Unlocked bundle</h4>
          <div className="mvp-evidence-item">
            <div className="evidence-meta">
              <span>bundle</span>
              <span>{result.bundle.status}</span>
            </div>
            <p>Bundle hash: {result.bundle.bundleHash}</p>
            <p className="mvp-muted">Evidence hash: {result.bundle.evidenceHash}</p>
            <p className="mvp-muted">Evidence items: {result.bundle.evidenceCount}</p>
          </div>
          {result.payment && (
            <div className="mvp-evidence-item">
              <div className="evidence-meta">
                <span>x402 settlement</span>
                <span>{result.payment.tokenSymbol || result.x402?.symbol || "USDT"}</span>
              </div>
              <p>
                Paid {result.payment.amount} {result.payment.tokenSymbol || result.x402?.symbol || ""}
              </p>
              <p className="mvp-muted">Payer: {shortAddress(result.payment.payerAddress)}</p>
              {result.payment.explorerUrl && result.payment.txHash && (
                <p className="mvp-muted">
                  Tx:{" "}
                  <a href={result.payment.explorerUrl} target="_blank" rel="noreferrer">
                    {shortAddress(result.payment.txHash)}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
