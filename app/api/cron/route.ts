import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueWorkflow } from "@/lib/queue/queueClient";

// GitHub Copilot: Add a safeguard to this cron route.
// Before firing any scheduled workflow, check that:
// 1. The workflow has isActive === true (add this field to Prisma schema if missing)
// 2. Log a warning and skip silently if isActive is false
// 3. The existing matchesCron() logic stays unchanged
// Use the existing Prisma client from @/lib/prisma

export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const minute = now.getUTCMinutes();
    const hour = now.getUTCHours();
    const day = now.getUTCDate();
    const month = now.getUTCMonth() + 1;
    const weekday = now.getUTCDay();

    console.log(`[CRON TICK] ${hour}:${minute} UTC`);

    const workflows = await prisma.workflow.findMany();

    let fired = 0;

    for (const wf of workflows) {
      // Safeguard: skip if workflow is not active
      if (!wf.isActive) {
        console.warn(
          `[CRON SKIP] Workflow "${wf.name}" (${wf.id}) is inactive`,
        );
        continue;
      }

      const triggers = wf.triggers as any;
      if (triggers?.type !== "schedule") continue;

      const cron = triggers?.cron;
      if (!cron) continue;

      if (matchesCron(cron, minute, hour, day, month, weekday)) {
        // Check if workflow already has a running instance
        const activeRun = await prisma.workflowRun.findFirst({
          where: { workflowId: wf.id, status: "running" },
        });
        if (activeRun) {
          console.warn(
            `[CRON SKIP] Workflow "${wf.name}" already has a running instance — skipping`,
          );
          continue;
        }

        console.log(`[CRON] Firing workflow: ${wf.name} (${wf.id})`);
        await enqueueWorkflow(wf.id, { userId: wf.userId });
        fired++;
      }
    }

    return NextResponse.json({
      ok: true,
      time: now.toISOString(),
      workflowsFired: fired,
    });
  } catch (err: any) {
    console.error("[CRON ERROR]:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

function matchesCron(
  cron: string,
  minute: number,
  hour: number,
  day: number,
  month: number,
  weekday: number,
): boolean {
  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return false;
    const [m, h, d, mo, wd] = parts;

    const match = (field: string, value: number): boolean => {
      if (field === "*") return true;
      if (field.startsWith("*/")) {
        const interval = parseInt(field.slice(2));
        if (isNaN(interval)) return false;
        return value % interval === 0;
      }
      const num = parseInt(field);
      if (isNaN(num)) return false;
      return num === value;
    };

    return (
      match(m, minute) &&
      match(h, hour) &&
      match(d, day) &&
      match(mo, month) &&
      match(wd, weekday)
    );
  } catch {
    return false;
  }
}
