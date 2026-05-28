/**
 * PrizePool Merkle Tree utilities for Node.js.
 *
 * Matches the Solidity implementation:
 *   leaf = keccak256(abi.encodePacked(recipient, amount))
 *   hash pairs: a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a))
 *
 * Amount is in USDC (6 decimals), e.g. "0.5" → "500000"
 */

import crypto from "crypto";

// keccak256 via Node.js crypto (sha3 for keccak)
function keccak256(data: Buffer): string {
  // Node.js doesn't have native keccak, use ethereumjs-utils or simulate
  // For proper keccak256, we use the keccak-256 standalone
  const { keccak256: keccak } = require("js-sha3");
  return "0x" + keccak(data);
}

function keccak256str(hex: string): string {
  const { keccak256: keccak } = require("js-sha3");
  return "0x" + keccak(Buffer.from(hex.slice(2), "hex"));
}

function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace("0x", "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function addressToHex(addr: string): string {
  return addr.toLowerCase().replace("0x", "").padStart(40, "0");
}

function amountToHex(amount: string): string {
  // Parse amount in USDC (6 decimals)
  const num = parseFloat(amount);
  const usdcBase = Math.round(num * 1e6);
  return usdcBase.toString(16).padStart(64, "0");
}

function encodePackedAddrAndAmount(addr: string, amount: string): Buffer {
  const addrHex = addressToHex(addr);
  const amountHex = amountToHex(amount);
  return Buffer.from(addrHex + amountHex, "hex");
}

/**
 * Build a sorted merkle tree root from winners.
 * Winners must have unique addresses.
 * Returns the root as a hex string (0x...).
 */
export function buildMerkleRoot(winners: { address: string; amount: string }[]): string {
  if (winners.length === 0) return "0x" + "0".repeat(64);

  // Sort by address (ascending, lowercase comparison)
  const sorted = [...winners].sort((a, b) =>
    a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1
  );

  // Build leaves
  const leaves: string[] = sorted.map((w) => {
    const packed = encodePackedAddrAndAmount(w.address, w.amount);
    return keccak256str("0x" + packed.toString("hex"));
  });

  // Build tree level by level
  let current: string[] = leaves;
  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length / 2; i++) {
      const a = current[i * 2];
      const b = current[i * 2 + 1];
      // Sort before hashing (commutative)
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const abPacked = Buffer.concat([Buffer.from(lo.slice(2), "hex"), Buffer.from(hi.slice(2), "hex")]);
      next.push(keccak256str("0x" + abPacked.toString("hex")));
    }
    if (current.length % 2 === 1) {
      next.push(current[current.length - 1]);
    }
    current = next;
  }

  return current[0];
}

/**
 * Build merkle proof for a specific winner in the tree.
 * Returns array of sibling hashes (hex strings).
 */
export function buildMerkleProof(
  winners: { address: string; amount: string }[],
  recipient: string,
  amount: string
): string[] {
  const sorted = [...winners].sort((a, b) =>
    a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1
  );

  const recipientHex = recipient.toLowerCase();
  const targetLeaf = keccak256str(
    "0x" + encodePackedAddrAndAmount(recipient, amount).toString("hex")
  );

  // Build tree while tracking index of target leaf
  let current = sorted.map((w) =>
    keccak256str("0x" + encodePackedAddrAndAmount(w.address, w.amount).toString("hex"))
  );

  let targetIdx = current.indexOf(targetLeaf);
  if (targetIdx === -1) {
    // Fall back: try with normalized amount
    targetIdx = current.findIndex((h) => h === targetLeaf);
  }

  const proof: string[] = [];

  while (current.length > 1) {
    const siblingIdx = targetIdx % 2 === 0 ? targetIdx + 1 : targetIdx - 1;
    if (siblingIdx < current.length) {
      proof.push(current[siblingIdx]);
    }

    // Compute next level
    const next: string[] = [];
    for (let i = 0; i < current.length / 2; i++) {
      const a = current[i * 2];
      const b = current[i * 2 + 1];
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const abPacked = Buffer.concat([Buffer.from(lo.slice(2), "hex"), Buffer.from(hi.slice(2), "hex")]);
      next.push(keccak256str("0x" + abPacked.toString("hex")));
    }
    if (current.length % 2 === 1) {
      next.push(current[current.length - 1]);
    }

    current = next;
    targetIdx = Math.floor(targetIdx / 2);
  }

  return proof;
}

/**
 * Verify a merkle proof locally.
 */
export function verifyMerkleProof(
  root: string,
  recipient: string,
  amount: string,
  proof: string[]
): boolean {
  const packed = encodePackedAddrAndAmount(recipient, amount);
  let leaf = keccak256str("0x" + packed.toString("hex"));

  for (const sibling of proof) {
    const [lo, hi] = leaf < sibling ? [leaf, sibling] : [sibling, leaf];
    const abPacked = Buffer.concat([Buffer.from(lo.slice(2), "hex"), Buffer.from(hi.slice(2), "hex")]);
    leaf = keccak256str("0x" + abPacked.toString("hex"));
  }

  return leaf === root;
}

/**
 * Build a winner list from draw results and compute root + proofs.
 */
export function buildWinnerMerkleTree(
  winners: { address: string; amount: string }[]
): {
  root: string;
  proofs: Map<string, { proof: string[]; amount: string }>;
} {
  const root = buildMerkleRoot(winners);
  const proofs = new Map<string, { proof: string[]; amount: string }>();

  for (const winner of winners) {
    proofs.set(winner.address.toLowerCase(), {
      proof: buildMerkleProof(winners, winner.address, winner.amount),
      amount: winner.amount
    });
  }

  return { root, proofs };
}