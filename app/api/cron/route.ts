import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events/eventBus";

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
      const triggers = wf.triggers as any;
      if (triggers?.type !== "schedule") continue;

      const cron = triggers?.cron;
      if (!cron) continue;

      if (matchesCron(cron, minute, hour, day, month, weekday)) {
        console.log(`[CRON] Firing workflow: ${wf.name} (${wf.id})`);
        await emitEvent("schedule_tick", {
          cron,
          workflowId: wf.id,
          userId: wf.userId,
          scheduledAt: now.toISOString(),
          message: `Scheduled run at ${now.toISOString()}`,
        });
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
  weekday: number
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