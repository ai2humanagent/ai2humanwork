import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLuckyDrawWinners,
  formatUsdcFromMicros,
  generateNextBoundedLuckyDrawAmount,
  generateBoundedLuckyDrawAmounts,
  parseUsdcToMicros
} from "./luckyDraw.js";

function makeDeterministicRandomInt(seed = 12345) {
  let state = seed;
  return (maxExclusive) => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return maxExclusive > 0 ? state % maxExclusive : 0;
  };
}

function amountStats(amounts) {
  const micros = amounts.map(parseUsdcToMicros);
  const sum = micros.reduce((acc, value) => acc + value, 0);
  const mean = sum / micros.length;
  const min = Math.min(...micros);
  const max = Math.max(...micros);
  const std = Math.sqrt(micros.reduce((acc, value) => acc + (value - mean) ** 2, 0) / micros.length);
  return { micros, sum, mean, min, max, std, cv: std / mean };
}

test("generates low-variance lucky draw amounts that exactly preserve the pool", () => {
  const amounts = generateBoundedLuckyDrawAmounts({
    totalPool: "100 USDC",
    winnerCount: 100,
    maxDeviationBps: 1000,
    randomInt: makeDeterministicRandomInt()
  });
  const stats = amountStats(amounts);

  assert.equal(amounts.length, 100);
  assert.equal(stats.sum, 100_000_000);
  assert.ok(stats.min >= 900_000, `min was ${stats.min}`);
  assert.ok(stats.max <= 1_100_000, `max was ${stats.max}`);
  assert.ok(stats.cv < 0.08, `cv was ${stats.cv}`);
});

test("builds unique winner entries with bounded random amounts", () => {
  const candidates = [
    "0x0000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000002",
    "0x0000000000000000000000000000000000000002",
    "0x0000000000000000000000000000000000000003"
  ];
  const winners = buildLuckyDrawWinners({
    candidates,
    maxWinners: 2,
    totalPool: "2 USDC",
    maxDeviationBps: 1000,
    randomInt: makeDeterministicRandomInt(999)
  });
  const stats = amountStats(winners.map((winner) => winner.amount));

  assert.equal(winners.length, 2);
  assert.equal(new Set(winners.map((winner) => winner.address)).size, 2);
  assert.equal(stats.sum, 2_000_000);
  assert.ok(stats.min >= 900_000);
  assert.ok(stats.max <= 1_100_000);
});

test("generates instant claim amounts that preserve the pool across claims", () => {
  const randomInt = makeDeterministicRandomInt(2026);
  const amounts = [];
  let paidMicros = 0;

  for (let claimedCount = 0; claimedCount < 100; claimedCount++) {
    const amount = generateNextBoundedLuckyDrawAmount({
      totalPool: "10 USDC",
      maxWinners: 100,
      claimedCount,
      paidAmount: formatUsdcFromMicros(paidMicros),
      maxDeviationBps: 1000,
      randomInt
    });
    amounts.push(amount);
    paidMicros += parseUsdcToMicros(amount);
  }

  const stats = amountStats(amounts);
  assert.equal(stats.sum, 10_000_000);
  assert.ok(stats.min >= 90_000, `min was ${stats.min}`);
  assert.ok(stats.max <= 110_000, `max was ${stats.max}`);
  assert.ok(stats.cv < 0.08, `cv was ${stats.cv}`);
});

test("keeps instant claim variance bounded across many deterministic runs", () => {
  let worstCv = 0;
  for (let seed = 1; seed <= 1000; seed++) {
    const randomInt = makeDeterministicRandomInt(seed);
    const amounts = [];
    let paidMicros = 0;

    for (let claimedCount = 0; claimedCount < 100; claimedCount++) {
      const amount = generateNextBoundedLuckyDrawAmount({
        totalPool: "10 USDC",
        maxWinners: 100,
        claimedCount,
        paidAmount: formatUsdcFromMicros(paidMicros),
        maxDeviationBps: 1000,
        randomInt
      });
      amounts.push(amount);
      paidMicros += parseUsdcToMicros(amount);
    }

    const stats = amountStats(amounts);
    worstCv = Math.max(worstCv, stats.cv);
    assert.equal(stats.sum, 10_000_000);
    assert.ok(stats.min >= 90_000, `seed ${seed} min was ${stats.min}`);
    assert.ok(stats.max <= 110_000, `seed ${seed} max was ${stats.max}`);
  }

  assert.ok(worstCv < 0.08, `worst cv was ${worstCv}`);
});
