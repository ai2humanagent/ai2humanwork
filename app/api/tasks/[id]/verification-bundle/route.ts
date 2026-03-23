import { NextResponse } from "next/server";
import { appendEvidence } from "../../../../lib/taskEvidence";
import { readDb, updateDb } from "../../../../lib/store";
import {
  X402_PAYMENT_HEADER,
  X402_PAYMENT_RESPONSE_HEADER
} from "../../../../lib/x402Shared";
import {
  buildTaskVerificationAccessPayment,
  buildTaskVerificationBundle,
  createTaskVerificationChallenge,
  getTaskVerificationAssetSummary,
  getX402ConfigurationHint,
  isX402Configured,
  settleTaskVerificationPayment
} from "../../../../lib/x402";

export const runtime = "nodejs";

const READY_STATUSES = new Set(["human_done", "verified", "paid"]);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === params.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (!READY_STATUSES.has(task.status)) {
    return NextResponse.json(
      { error: "Verification bundle is available after proof submission." },
      { status: 409 }
    );
  }

  const bundle = buildTaskVerificationBundle(task);
  const assetSummary = getTaskVerificationAssetSummary();

  if (!isX402Configured()) {
    return NextResponse.json(
      {
        error: getX402ConfigurationHint(),
        x402: {
          ...assetSummary
        }
      },
      { status: 503 }
    );
  }

  const challenge = createTaskVerificationChallenge({
    task,
    resource: request.url,
    bundleHash: bundle.bundleHash
  });
  const paymentHeader = request.headers.get(X402_PAYMENT_HEADER);

  if (!paymentHeader) {
    return NextResponse.json(
      {
        ...challenge,
        bundlePreview: {
          taskId: bundle.taskId,
          title: bundle.title,
          status: bundle.status,
          bundleHash: bundle.bundleHash
        },
        x402: assetSummary
      },
      {
        status: 402,
        headers: {
          "Access-Control-Expose-Headers": X402_PAYMENT_RESPONSE_HEADER,
          "Cache-Control": "no-store"
        }
      }
    );
  }

  let paymentRecord: ReturnType<typeof buildTaskVerificationAccessPayment> | null = null;
  let settlement:
    | Awaited<ReturnType<typeof settleTaskVerificationPayment>>
    | null = null;

  try {
    settlement = await settleTaskVerificationPayment({
      paymentHeader,
      challenge
    });

    await updateDb(async (draft) => {
      const latest = draft.tasks.find((item) => item.id === params.id);
      if (!latest) {
        return;
      }

      appendEvidence(latest, {
        by: "system",
        type: "note",
        content: `x402_bundle_paid: ${settlement?.amount} ${settlement?.tokenSymbol} by ${settlement?.payerAddress}`
      });
      appendEvidence(latest, {
        by: "system",
        type: "note",
        content: `x402_bundle_hash: ${bundle.bundleHash}`
      });
      appendEvidence(latest, {
        by: "system",
        type: "note",
        content: `agent_event: x402_gate_agent | Unlocked the verification bundle for ${
          settlement?.amount
        } ${settlement?.tokenSymbol} from ${settlement?.payerAddress}.`
      });
      latest.updatedAt = new Date().toISOString();

      paymentRecord = buildTaskVerificationAccessPayment({
        task: latest,
        settlement: settlement!
      });
      draft.payments.unshift(paymentRecord);
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "x402 settlement failed",
        bundlePreview: {
          taskId: bundle.taskId,
          title: bundle.title,
          status: bundle.status,
          bundleHash: bundle.bundleHash
        }
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      bundle,
      payment: paymentRecord,
      x402: {
        ...assetSummary,
        payerAddress: settlement?.payerAddress
      }
    },
    {
      headers: {
        "Access-Control-Expose-Headers": X402_PAYMENT_RESPONSE_HEADER,
        "Cache-Control": "no-store",
        [X402_PAYMENT_RESPONSE_HEADER]: settlement?.paymentResponseHeader || ""
      }
    }
  );
}
