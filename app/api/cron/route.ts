import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueWorkflow } from "@/lib/queue/queueClient";

export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cleanup stuck runs (running for more than 10 minutes)
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const cleanupResult = await prisma.workflowRun.updateMany({
      where: {
        status: "running",
        startedAt: { lt: cutoff },
      },
      data: {
        status: "failed",
        finishedAt: new Date(),
      },
    });
    if (cleanupResult.count > 0) {
      console.log(
        `[CRON CLEANUP] Marked ${cleanupResult.count} stuck run(s) as failed`,
      );
    }

    const now = new Date();
    console.log(`[CRON TICK] ${now.toISOString()} UTC`);

    const workflows = await prisma.workflow.findMany();
    let fired = 0;

    for (const wf of workflows) {
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

      // Get the workflow's timezone, default to Asia/Kolkata (IST)
      const tz = triggers?.timezone || "Asia/Kolkata";

      // Convert current time to the workflow's timezone
      let minute: number,
        hour: number,
        day: number,
        month: number,
        weekday: number;
      try {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: false,
          weekday: "short",
        }).formatToParts(now);

        const get = (type: string) => {
          const part = parts.find((p) => p.type === type);
          return part ? parseInt(part.value, 10) : 0;
        };

        minute = get("minute");
        hour = get("hour") % 24; // handle 24 returned for midnight in some locales
        day = get("day");
        month = get("month");

        // weekday from Intl: Sun=Sun, Mon=Mon etc — map to 0-6
        const weekdayPart =
          parts.find((p) => p.type === "weekday")?.value || "Sun";
        const weekdayMap: Record<string, number> = {
          Sun: 0,
          Mon: 1,
          Tue: 2,
          Wed: 3,
          Thu: 4,
          Fri: 5,
          Sat: 6,
        };
        weekday = weekdayMap[weekdayPart] ?? 0;

        console.log(
          `[CRON TICK] Workflow "${wf.name}" — local time in ${tz}: ${hour}:${String(minute).padStart(2, "0")}`,
        );
      } catch (tzErr) {
        console.warn(
          `[CRON WARN] Invalid timezone "${tz}" for workflow "${wf.name}" — falling back to UTC`,
        );
        minute = now.getUTCMinutes();
        hour = now.getUTCHours();
        day = now.getUTCDate();
        month = now.getUTCMonth() + 1;
        weekday = now.getUTCDay();
      }

      if (matchesCron(cron, minute, hour, day, month, weekday)) {
        const activeRun = await prisma.workflowRun.findFirst({
          where: { workflowId: wf.id, status: "running" },
        });
        if (activeRun) {
          console.warn(
            `[CRON SKIP] Workflow "${wf.name}" already has a running instance — skipping`,
          );
          continue;
        }

        console.log(
          `[CRON] Firing workflow: ${wf.name} (${wf.id}) at ${tz} time`,
        );
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
      if (field.includes("-")) {
        const [start, end] = field.split("-").map(Number);
        return value >= start && value <= end;
      }
      if (field.includes(",")) {
        return field.split(",").map(Number).includes(value);
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
