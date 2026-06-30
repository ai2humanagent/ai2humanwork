import { NextResponse } from "next/server";
import {
  readDb,
  updateDb,
  upsertTaskOnly,
  type Task,
  type Notification,
  type UserAccount
} from "../../../lib/store";
import {
  attachManagedPrizePool,
  buildAgentCampaignPreview,
  buildAgentCampaignTask
} from "../../../lib/agentCampaignProtocol.js";
import { addNotification, sendEmailNotification } from "../../../lib/notificationDelivery";
import { isReadyForTaskNotifications } from "../../../lib/operatorAccess";
import { isPublicAgentCampaignRequest, requireAgentCampaignAuth } from "./auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const publicAccess = isPublicAgentCampaignRequest(request, body);
    const authError = await requireAgentCampaignAuth(request, { allowPublicTest: true, input: body });
    if (authError) return authError;

    const campaignInput = publicAccess
      ? {
          ...body,
          environment: "test",
          fundingMode: "test_no_payout",
          publishNow: body.publishNow !== false,
          publicDemo: true
        }
      : body;
    let db: Awaited<ReturnType<typeof readDb>>;
    let dbWarning = "";
    try {
      db = await readDb();
    } catch (error) {
      if (!publicAccess) throw error;
      db = { tasks: [], users: [] } as unknown as Awaited<ReturnType<typeof readDb>>;
      dbWarning = error instanceof Error ? error.message : "Database read failed during public test create.";
    }
    const preview = await buildAgentCampaignPreview(db, campaignInput);
    if (!preview.readyToCreate) {
      return NextResponse.json(
        {
          error: "Campaign is missing required inputs.",
          missingInputs: preview.missingInputs,
          nextQuestions: preview.nextQuestions,
          publicAccess,
          preview
        },
        { status: 400 }
      );
    }

    let task = buildAgentCampaignTask(campaignInput, preview) as Task;
    let creationPreview = preview;
    const managed = await attachManagedPrizePool(db, campaignInput, task, preview);
    task = managed.task as Task;
    creationPreview = managed.preview;
    const taskNotifications: Array<{ user: UserAccount; notification: Notification }> = [];

    if (publicAccess) {
      try {
        await upsertTaskOnly(task);
        return NextResponse.json({
          task,
          preview: {
            ...creationPreview,
            warnings: dbWarning
              ? [
                  ...(creationPreview.warnings || []),
                  "Public test used fallback state while reading optional collections, but the task was persisted."
                ]
              : creationPreview.warnings
          },
          publicAccess
        }, { status: 201 });
      } catch (error) {
        return NextResponse.json(
          {
            task,
            preview: {
              ...creationPreview,
              warnings: [
                ...(creationPreview.warnings || []),
                "Public test task was generated but not persisted. Preview/create semantics are still valid for agent testing."
              ]
            },
            publicAccess,
            notPersisted: true,
            persistenceError: error instanceof Error ? error.message : "Task write failed."
          },
          { status: 201 }
        );
      }
    }

    try {
      await updateDb((draft) => {
        if (draft.tasks.some((item) => item.id === task.id)) {
          throw new Error(`Campaign id already exists: ${task.id}`);
        }
        draft.tasks.unshift(task);

        if (!publicAccess && !task.campaign?.isTest && task.campaign?.agentLifecycle?.status === "published") {
          for (const user of draft.users) {
            if (!isReadyForTaskNotifications(user)) continue;
            const notification = addNotification(draft, {
              userId: user.id,
              type: "task_assigned",
              title: "New task available",
              body: `"${task.title}" is now available. Open the task, complete proof, and settle after verification.`,
              taskId: task.id
            });
            taskNotifications.push({ user: { ...user }, notification });
          }
        }
      });
    } catch (error) {
      if (!publicAccess) throw error;
      return NextResponse.json(
        {
          task,
          preview: {
            ...creationPreview,
            warnings: [
              ...(creationPreview.warnings || []),
              dbWarning ? "Public test used fallback state because persistence is temporarily unavailable." : "",
              "Public test task was generated but not persisted. Preview/create semantics are still valid for agent testing."
            ].filter(Boolean)
          },
          publicAccess,
          notPersisted: true
        },
        { status: 201 }
      );
    }

    if (!publicAccess && !task.campaign?.isTest) {
      await Promise.allSettled(
        taskNotifications.map((item) =>
          sendEmailNotification({
            user: item.user,
            notification: item.notification,
            reason: "task"
          })
        )
      )
    }

    return NextResponse.json({
      task,
      preview: {
        ...creationPreview,
        warnings: dbWarning
          ? [
              ...(creationPreview.warnings || []),
              "Public test used fallback state because persistence is temporarily unavailable."
            ]
          : creationPreview.warnings
      },
      publicAccess
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create campaign.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
