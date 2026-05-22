import { NextResponse } from "next/server";
import { buildVerificationMessage } from "../../../../lib/walletVerification";

export const runtime = "nodejs";

/** GET /api/tasks/[id]/sign-message?wallet=0x...&subtaskKey=0
 *  Returns the exact message the wallet needs to sign for verification.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const url = new URL(request.url);
  const wallet = (url.searchParams.get("wallet") || "").trim().toLowerCase();
  const subtaskKey = (url.searchParams.get("subtaskKey") || "").trim();

  if (!wallet || !subtaskKey) {
    return NextResponse.json(
      { error: "wallet and subtaskKey query params are required" },
      { status: 400 }
    );
  }

  const message = buildVerificationMessage(taskId, subtaskKey, wallet);

  return NextResponse.json({ message });
}
