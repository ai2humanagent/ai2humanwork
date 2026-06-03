import type { PaymentEntry, Task } from "./store";

export type AdminWinner = {
  address: string;
  amount: string;
  claimed: boolean;
  txHash: string | null;
};

function normalizeAddress(value: string | undefined | null) {
  return String(value || "").trim().toLowerCase();
}

function winnersFromPayments(payments: PaymentEntry[]): AdminWinner[] {
  return payments
    .filter((payment) => Boolean(payment.receiverAddress))
    .map((payment) => ({
      address: payment.receiverAddress || "",
      amount: payment.amount,
      claimed: payment.status === "paid",
      txHash: payment.txHash || null
    }));
}

function winnersFromDrawResult(task: Task, payments: PaymentEntry[]): AdminWinner[] {
  const claimedWallets = new Set(payments.map((payment) => normalizeAddress(payment.receiverAddress)));
  return (task.drawResult?.winners || []).map((winner) => {
    const address = typeof winner === "string" ? winner : winner.address;
    const amount = typeof winner === "string" ? "" : winner.amount;
    const payment = payments.find(
      (item) => normalizeAddress(item.receiverAddress) === normalizeAddress(address)
    );
    return {
      address,
      amount,
      claimed: claimedWallets.has(normalizeAddress(address)),
      txHash: payment?.txHash || null
    };
  });
}

export function buildAdminWinners(task: Task, payments: PaymentEntry[]): AdminWinner[] {
  const paymentWinners = winnersFromPayments(payments);
  const drawWinners = winnersFromDrawResult(task, payments);
  const drawResultMeta = (task.drawResult || {}) as Record<string, unknown>;
  const isInstantClaimDraw = drawResultMeta.distributionType === "instant_qualified_claim";

  if (isInstantClaimDraw || paymentWinners.length >= drawWinners.length) {
    return paymentWinners;
  }

  return drawWinners;
}
