export const DEFAULT_SETTLEMENT_TOKEN_SYMBOL =
  process.env.NEXT_PUBLIC_SETTLEMENT_TOKEN_SYMBOL ||
  process.env.NEXT_PUBLIC_BNB_SETTLEMENT_TOKEN_SYMBOL ||
  process.env.NEXT_PUBLIC_XLAYER_SETTLEMENT_TOKEN_SYMBOL ||
  "USDT";

export const DEFAULT_SETTLEMENT_TOKEN_NAME =
  process.env.NEXT_PUBLIC_SETTLEMENT_TOKEN_NAME ||
  process.env.NEXT_PUBLIC_BNB_SETTLEMENT_TOKEN_NAME ||
  process.env.NEXT_PUBLIC_XLAYER_SETTLEMENT_TOKEN_NAME ||
  "USDT";

export function formatSettlementBudget(amount) {
  return `${String(amount || "").trim()} ${DEFAULT_SETTLEMENT_TOKEN_SYMBOL}`.trim();
}

export function stripBudgetAmount(value) {
  const match = String(value || "")
    .trim()
    .match(/\d+(?:\.\d+)?/);
  return match ? match[0] : String(value || "").trim();
}

export function formatBudgetLabel(value) {
  const amount = stripBudgetAmount(value);
  if (!amount) return String(value || "").trim();
  return formatSettlementBudget(amount);
}
