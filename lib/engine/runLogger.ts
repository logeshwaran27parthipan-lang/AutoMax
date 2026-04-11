import { prisma } from "@/lib/prisma";

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
}