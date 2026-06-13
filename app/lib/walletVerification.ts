import { verifyMessage } from "viem";

/**
 * Build the message that a wallet must sign to verify a subtask.
 * Deterministic — both client and server produce the same string.
 */
export function buildVerificationMessage(
  taskId: string,
  subtaskKey: string,
  walletAddress: string
): string {
  return [
    "AI2Human Task Verification",
    `Task: ${taskId}`,
    `Subtask: ${subtaskKey}`,
    `Wallet: ${walletAddress.toLowerCase()}`,
    "I confirm I have completed this task."
  ].join("\n");
}

/**
 * Verify an EIP-191 personal_sign signature.
 * Returns true if the signature was produced by the given address.
 */
export async function verifyWalletSignature(
  message: string,
  signature: `0x${string}`,
  expectedAddress: string
): Promise<boolean> {
  try {
    const valid = await verifyMessage({
      address: expectedAddress as `0x${string}`,
      message,
      signature
    });
    return valid;
  } catch {
    return false;
  }
}
