import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function createRun(
  workflowId: string,
  userId: string,
  trigger: string,
  payload: any
): Promise<string> {
  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      userId,
      trigger,
      status: "running",
      payload,
    },
  });
  console.log("[RUN STARTED]:", run.id);
  return run.id;
}

export async function logStep(
  runId: string,
  stepIndex: number,
  stepType: string,
  status: "success" | "failed" | "skipped",
  input?: any,
  output?: any,
  error?: string
): Promise<void> {
  await prisma.workflowRunStep.create({
    data: {
      runId,
      stepIndex,
      stepType,
      status,
      input: input ?? {},
      output: output ?? {},
      error: error ?? null,
    },
  });
  console.log(`[STEP ${stepIndex}] ${stepType} → ${status}`);
}

export async function finishRun(
  runId: string,
  status: "completed" | "failed"
): Promise<void> {
  await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status,
      finishedAt: new Date(),
    },
  });
  console.log("[RUN FINISHED]:", runId, "→", status);

  // Send failure alert email to workflow owner
  if (status === "failed") {
    try {
      // Fetch run with workflow name and owner email
      const run = await prisma.workflowRun.findUnique({
        where: { id: runId },
        include: {
          workflow: { select: { name: true } },
          user: { select: { email: true, name: true } },
          steps: {
            where: { status: "failed" },
            orderBy: { stepIndex: "asc" },
            take: 1,
          },
        },
      });

      if (!run) return;

      const workflowName = run.workflow.name;
      const ownerEmail = run.user.email;
      const failedStep = run.steps[0];
      const stepInfo = failedStep
        ? `Step ${failedStep.stepIndex + 1} (${failedStep.stepType}): ${failedStep.error || "Unknown error"}`
        : "Unknown step";

      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: ownerEmail,
        subject: `⚠️ Workflow failed: ${workflowName}`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #1A1A2E; margin-bottom: 8px;">Workflow Run Failed</h2>
            <p style="color: #6B7280; margin-bottom: 24px;">A workflow run failed and needs your attention.</p>
            <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px 0;"><strong>Workflow:</strong> ${workflowName}</p>
              <p style="margin: 0 0 8px 0;"><strong>Failed step:</strong> ${stepInfo}</p>
              <p style="margin: 0; color: #9CA3AF; font-size: 13px;">Run ID: ${runId}</p>
            </div>
            <p style="color: #6B7280; font-size: 13px;">Check your AutoMax dashboard for full details.</p>
          </div>
        `,
      });

      console.log("[FAILURE ALERT] Sent to:", ownerEmail);
    } catch (err: any) {
      // Never let notification failure break the run logging
      console.error("[FAILURE ALERT ERROR]:", err?.message || err);
    }
  }
}