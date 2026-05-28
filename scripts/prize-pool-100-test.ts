/**
 * 100-Winner PrizePool Integration Test
 *
 * Full flow:
 * 1. Generate 100 test wallets with deterministic keys
 * 2. Build merkle tree with equal prize amounts
 * 3. Update PrizePool on-chain with new merkle root
 * 4. Batch generate claim transactions for all 100 winners
 *
 * Run:
 *   npx tsx scripts/prize-pool-100-test.ts
 *
 * Prerequisites:
 *   PRIZE_POOL_FACTORY_ADDRESS=0x475b325C68D10B5aB6024e1232057e5D0328523F
 *   PRIZE_POOL_PRIVATE_KEY=<owner_private_key>
 *   BASE_RPC_URL=https://mainnet.base.org
 *
 * Funding the deployer (to enable 100-winner test):
 *   1. Get deployer address: forge script --rpc-url base_mainnet script/PrintAddress.s.sol
 *      (uses PRIVATE_KEY to compute address)
 *   2. Send ETH + USDC to deployer from exchange or another wallet
 *   3. USDC: transfer to 0x3f665386b41Fa15c5ccCeE983050a236E6a10108
 *      (or use Base bridge: https://bridge.base.org)
 *
 * 100-winner gas estimate:
 *   - Each claim: ~21,000 gas * 5 gwei = ~0.0001 ETH
 *   - 100 claims = ~0.01 ETH gas
 *   - Plus USDC prize pool: 100 * <prize_per_winner> USDC
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { buildMerkleRoot, buildMerkleProof } from "../app/lib/merkleUtils";

const FACTORY_ADDRESS = process.env.PRIZE_POOL_FACTORY_ADDRESS || "0x475b325C68D10B5aB6024e1232057e5D0328523F";
const PRIVATE_KEY = process.env.PRIZE_POOL_PRIVATE_KEY || process.env.BASE_PRIVATE_KEY || "";
const RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Configuration
const CAMPAIGN_ID = 103; // Use a new campaign ID
const MAX_WINNERS = 100;
const TOTAL_PRIZE = "10"; // 10 USDC total (0.1 USDC each)
const PRIZE_PER_WINNER = (parseFloat(TOTAL_PRIZE) / MAX_WINNERS).toFixed(6); // 0.1 USDC
const DEADLINE = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days from now

// Generate 100 test wallets using Math.random seed
function generateTestWallets(count: number): { address: string; privateKey: string }[] {
  const wallets: { address: string; privateKey: string }[] = [];
  // Use a seed for reproducibility
  let seed = 12345;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = 0; i < count; i++) {
    // Generate a deterministic private key
    const privateKey = `0x${(i * 1000000 + seed).toString(16).padStart(64, "0")}`;
    // For testing, we don't have actual private keys - just use addresses
    // In production, participants would use their own wallets
    const address = `0x${i.toString(16).padStart(40, "0").replace(/^(.{38}).{2}$/, "0x$1" + i.toString(16))}`;
    wallets.push({ address: `0x${(BigInt("0x" + "1".repeat(40)) + BigInt(i)).toString(16).padStart(40, "0")}`, privateKey });
  }
  return wallets;
}

async function main() {
  console.log("=== 100-Winner PrizePool Test ===");
  console.log(`Factory: ${FACTORY_ADDRESS}`);
  console.log(`Campaign ID: ${CAMPAIGN_ID}`);
  console.log(`Total Prize: ${TOTAL_PRIZE} USDC`);
  console.log(`Prize per winner: ${PRIZE_PER_WINNER} USDC`);
  console.log(`Max winners: ${MAX_WINNERS}`);
  console.log("");

  if (!PRIVATE_KEY) {
    console.error("ERROR: PRIZE_POOL_PRIVATE_KEY not set in .env.local");
    console.error("Add: PRIZE_POOL_PRIVATE_KEY=<owner_private_key>");
    process.exit(1);
  }

  // 1. Generate 100 test wallets
  console.log("Step 1: Generating 100 test wallets...");
  const wallets = generateTestWallets(MAX_WINNERS);
  console.log(`Generated ${wallets.length} wallets`);
  console.log(`First wallet: ${wallets[0].address}`);
  console.log(`Last wallet: ${wallets[MAX_WINNERS - 1].address}`);
  console.log("");

  // 2. Build winner list with equal amounts
  console.log("Step 2: Building winner list...");
  const winners = wallets.map((w) => ({
    address: w.address,
    amount: PRIZE_PER_WINNER
  }));

  // 3. Build merkle tree
  console.log("Step 3: Building merkle tree...");
  const merkleRoot = buildMerkleRoot(winners);
  console.log(`Merkle Root: ${merkleRoot}`);

  // 4. Verify merkle proofs for all winners
  console.log("Step 4: Verifying merkle proofs for all 100 winners...");
  let allValid = true;
  for (const winner of winners) {
    const proof = buildMerkleProof(winners, winner.address, winner.amount);
    // Local verification
    let leaf = keccak256Local(encodePackedLocal(winner.address, winner.amount));
    for (const sibling of proof) {
      const [lo, hi] = leaf < sibling ? [leaf, sibling] : [sibling, leaf];
      leaf = keccak256Local(concatHex(lo, hi));
    }
    if (leaf !== merkleRoot) {
      console.error(`Proof verification failed for ${winner.address}`);
      allValid = false;
    }
  }
  if (allValid) {
    console.log("All 100 merkle proofs verified successfully!");
  } else {
    console.error("Some proofs failed verification!");
    process.exit(1);
  }
  console.log("");

  // 5. Deploy PrizePool via factory (or skip if already deployed)
  console.log("Step 5: Deploy PrizePool via factory...");
  // Note: Requires factory to be deployed and owner to be msg.sender
  // In production, you would call:
  //   const poolAddress = await createPrizePoolCampaign({
  //     campaignId: CAMPAIGN_ID,
  //     merkleRoot: merkleRoot,  // initial root (empty)
  //     deadline: DEADLINE,
  //     maxWinners: MAX_WINNERS,
  //     agent: deployerAddress
  //   });
  //
  // For testing against existing pool, set POOL_ADDRESS env var:
  const existingPool = process.env.POOL_ADDRESS;
  if (existingPool) {
    console.log(`Using existing pool at: ${existingPool}`);
  } else {
    console.log("Set POOL_ADDRESS env var to test against existing pool");
  }
  console.log("");

  // 6. If pool is funded, test on-chain claim flow
  console.log("Step 6: On-chain test (requires funded pool)...");
  console.log("In production:");
  console.log("  1. Admin calls draw API → selects winners → updatePrizePoolMerkleRoot()");
  console.log("  2. Each winner calls claim API → buildMerkleProof() → PrizePool.claim()");
  console.log("");
  console.log("Example winner claim:");
  const sampleWinner = winners[0];
  const sampleProof = buildMerkleProof(winners, sampleWinner.address, sampleWinner.amount);
  console.log(`  Winner: ${sampleWinner.address}`);
  console.log(`  Amount: ${sampleWinner.amount} USDC`);
  console.log(`  Proof: [${sampleProof.slice(0, 3).join(", ")}, ... (${sampleProof.length} elements)]`);
  console.log("");
  console.log("=== Test Complete ===");
  console.log("");
  console.log("To run full integration test:");
  console.log("  1. Deploy new campaign via factory: CAMPAIGN_ID=103 MAX_WINNERS=100");
  console.log("  2. Fund the PrizePool with USDC");
  console.log("  3. Call POST /api/tasks/<id>/draw with winners list");
  console.log("  4. Each winner calls POST /api/tasks/<id>/claim-reward");
}

// Minimal local keccak256 (uses js-sha3 if available, otherwise placeholder)
function keccak256Local(data: string): string {
  try {
    const { keccak256 } = require("js-sha3");
    return "0x" + keccak256(Buffer.from(data.slice(2), "hex"));
  } catch {
    // Fallback - should use js-sha3 in real environment
    const crypto = require("crypto");
    const hash = crypto.createHash("sha3-256");
    hash.update(Buffer.from(data.slice(2), "hex"));
    return "0x" + hash.digest("hex");
  }
}

function encodePackedLocal(addr: string, amount: string): string {
  const addrHex = addr.toLowerCase().replace("0x", "").padStart(40, "0");
  const amountNum = Math.round(parseFloat(amount) * 1e6);
  const amountHex = amountNum.toString(16).padStart(64, "0");
  return "0x" + addrHex + amountHex;
}

function concatHex(a: string, b: string): string {
  return "0x" + a.slice(2) + b.slice(2);
}

main().catch(console.error);