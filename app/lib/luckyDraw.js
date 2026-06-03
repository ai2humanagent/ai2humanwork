import crypto from "crypto";

const USDC_DECIMALS = 6;
const USDC_SCALE = 10 ** USDC_DECIMALS;

export function parseUsdcToMicros(value) {
  const match = String(value || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!match) return 0;
  const [whole, fraction = ""] = match[0].split(".");
  return Number(whole || "0") * USDC_SCALE + Number(fraction.slice(0, USDC_DECIMALS).padEnd(USDC_DECIMALS, "0"));
}

export function formatUsdcFromMicros(value) {
  const micros = Math.max(0, Math.trunc(Number(value) || 0));
  const whole = Math.floor(micros / USDC_SCALE);
  const fraction = String(micros % USDC_SCALE).padStart(USDC_DECIMALS, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction} USDC` : `${whole} USDC`;
}

function defaultRandomInt(maxExclusive) {
  if (maxExclusive <= 1) return 0;
  return crypto.randomInt(maxExclusive);
}

function shuffle(values, randomInt) {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function pickLuckyDrawWinners(candidates, winnerCount, randomInt = defaultRandomInt) {
  const unique = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return shuffle(unique, randomInt).slice(0, Math.min(Math.max(0, winnerCount), unique.length));
}

export function generateBoundedLuckyDrawAmounts(input) {
  const totalMicros = parseUsdcToMicros(input.totalPool);
  const winnerCount = Math.max(0, Math.trunc(Number(input.winnerCount) || 0));
  const maxDeviationBps = Math.max(0, Math.min(5000, Math.trunc(Number(input.maxDeviationBps) || 1000)));
  const randomInt = input.randomInt || defaultRandomInt;

  if (winnerCount <= 0) return [];
  if (totalMicros <= 0) return Array.from({ length: winnerCount }, () => "0 USDC");

  const base = Math.floor(totalMicros / winnerCount);
  const remainder = totalMicros - base * winnerCount;
  const amounts = Array.from({ length: winnerCount }, (_, index) => base + (index < remainder ? 1 : 0));
  const average = totalMicros / winnerCount;
  const min = Math.floor((average * (10000 - maxDeviationBps)) / 10000);
  const max = Math.ceil((average * (10000 + maxDeviationBps)) / 10000);

  const rounds = winnerCount * 8;
  for (let round = 0; round < rounds; round++) {
    const to = randomInt(winnerCount);
    let from = randomInt(winnerCount - 1);
    if (from >= to) from += 1;

    const canReceive = max - amounts[to];
    const canGive = amounts[from] - min;
    const movable = Math.min(canReceive, canGive);
    if (movable <= 0) continue;

    const transfer = 1 + randomInt(movable);
    amounts[to] += transfer;
    amounts[from] -= transfer;
  }

  return shuffle(amounts, randomInt).map(formatUsdcFromMicros);
}

export function generateNextBoundedLuckyDrawAmount(input) {
  const totalMicros = parseUsdcToMicros(input.totalPool);
  const maxWinners = Math.max(1, Math.trunc(Number(input.maxWinners) || 1));
  const claimedCount = Math.max(0, Math.trunc(Number(input.claimedCount) || 0));
  const paidMicros = parseUsdcToMicros(input.paidAmount);
  const maxDeviationBps = Math.max(0, Math.min(5000, Math.trunc(Number(input.maxDeviationBps) || 1000)));
  const randomInt = input.randomInt || defaultRandomInt;

  const remainingSlots = maxWinners - claimedCount;
  const remainingPool = totalMicros - paidMicros;
  if (remainingSlots <= 0 || remainingPool <= 0) return "0 USDC";
  if (remainingSlots === 1) return formatUsdcFromMicros(remainingPool);

  const average = totalMicros / maxWinners;
  const min = Math.floor((average * (10000 - maxDeviationBps)) / 10000);
  const max = Math.ceil((average * (10000 + maxDeviationBps)) / 10000);
  const futureSlots = remainingSlots - 1;
  const lower = Math.max(min, remainingPool - max * futureSlots);
  const upper = Math.min(max, remainingPool - min * futureSlots);

  if (lower > upper) {
    return formatUsdcFromMicros(Math.floor(remainingPool / remainingSlots));
  }

  return formatUsdcFromMicros(lower + randomInt(upper - lower + 1));
}

export function buildLuckyDrawWinners(input) {
  const winners = pickLuckyDrawWinners(input.candidates, input.maxWinners, input.randomInt);
  const amounts = generateBoundedLuckyDrawAmounts({
    totalPool: input.totalPool,
    winnerCount: winners.length,
    maxDeviationBps: input.maxDeviationBps,
    randomInt: input.randomInt
  });
  return winners.map((address, index) => ({ address, amount: amounts[index] }));
}
