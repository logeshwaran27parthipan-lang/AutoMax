import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events/eventBus";

// Called by Vercel Cron or external cron service every minute
export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret");
    if (secret !== process.env.CRON_SECRET) {
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

    for (const wf of workflows) {
      const triggers = wf.triggers as any;
      if (triggers?.type !== "schedule") continue;

      const cron = triggers?.cron;
      if (!cron) continue;

      if (matchesCron(cron, minute, hour, day, month, weekday)) {
        console.log(`[CRON] Firing workflow: ${wf.id}`);
        await emitEvent("schedule_tick", {
          cron,
          workflowId: wf.id,
          userId: wf.userId,
          scheduledAt: now.toISOString(),
        });
      }
    }

    return NextResponse.json({ ok: true, time: now.toISOString() });
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
  weekday: number
): boolean {
  try {
    const [m, h, d, mo, wd] = cron.split(" ");
    const match = (field: string, value: number): boolean => {
      if (field === "*") return true;
      if (field.startsWith("*/")) {
        const interval = parseInt(field.slice(2));
        return value % interval === 0;
      }
      return parseInt(field) === value;
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