import { NextResponse } from "next/server";
import {
  readDb,
  updateDb,
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
import { requireAgentCampaignAuth } from "./auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = await requireAgentCampaignAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const db = await readDb();
    const preview = await buildAgentCampaignPreview(db, body);
    if (!preview.readyToCreate) {
      return NextResponse.json(
        {
          error: "Campaign is missing required inputs.",
          missingInputs: preview.missingInputs,
          nextQuestions: preview.nextQuestions,
          preview
        },
        { status: 400 }
      );
    }

    let task = buildAgentCampaignTask(body, preview) as Task;
    let creationPreview = preview;
    const managed = await attachManagedPrizePool(db, body, task, preview);
    task = managed.task as Task;
    creationPreview = managed.preview;
    const taskNotifications: Array<{ user: UserAccount; notification: Notification }> = [];

    await updateDb((draft) => {
      if (draft.tasks.some((item) => item.id === task.id)) {
        throw new Error(`Campaign id already exists: ${task.id}`);
      }
      draft.tasks.unshift(task);

      if (task.campaign?.agentLifecycle?.status === "published") {
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

    await Promise.allSettled(
      taskNotifications.map((item) =>
        sendEmailNotification({
          user: item.user,
          notification: item.notification,
          reason: "task"
        })
      )
    );

    return NextResponse.json({ task, preview: creationPreview }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create campaign.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
