import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { actions } from "@/lib/actions";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const cookie = req.cookies.get("auth-token")?.value;
    if (!cookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(cookie);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Next.js 15+: context.params may be a promise
    const params = await context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: "Missing workflow id" },
        { status: 400 },
      );
    }

    const workflow = await prisma.workflow.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rawSteps = workflow.steps ?? [];
    let stepsArray: any[] = [];
    if (Array.isArray(rawSteps)) {
      stepsArray = rawSteps as any[];
    } else if (typeof rawSteps === "string") {
      try {
        stepsArray = JSON.parse(rawSteps) as any[];
      } catch {
        stepsArray = [];
      }
    } else if (rawSteps && typeof rawSteps === "object") {
      // If it's a JSON object, attempt to coerce to array if possible
      try {
        stepsArray = JSON.parse(JSON.stringify(rawSteps)) as any[];
        if (!Array.isArray(stepsArray)) stepsArray = [];
      } catch {
        stepsArray = [];
      }
    } else {
      stepsArray = [];
    }

    const results: Array<any> = [];

    // Map legacy step types to action keys if necessary
    const mapTypeToAction = (t: string) => {
      if (!t) return t;
      if (t === "ai_generate") return "ai_process";
      return t;
    };

    for (let i = 0; i < stepsArray.length; i++) {
      const step = stepsArray[i];
      const type = step?.type || "unknown";
      const resEntry: any = {
        stepIndex: i,
        type,
        success: false,
        result: null,
        error: null,
      };

      try {
        const actionName = mapTypeToAction(type);

        // improved type-safe lookup
        const action = actions[
          actionName as keyof typeof actions
        ] as unknown as Function | undefined;

        if (!action || typeof action !== "function") {
          resEntry.error = `No action registered for step type: ${type}`;
        } else {
          // Log execution for observability
          console.log("Executing step:", type, step);

          // Provide contextual info to actions
          const actionInput = { ...(step || {}), workflowId: id };

          // Execute action sequentially
          const actionResult: any = await action(actionInput);

          // Clean result handling
          if (!actionResult) {
            resEntry.success = false;
            resEntry.error = "Action returned no result";
          } else if (actionResult.success === false) {
            resEntry.success = false;
            resEntry.error =
              actionResult.error ?? actionResult.result ?? "action failed";
            resEntry.result = actionResult.result ?? null;
          } else {
            resEntry.success = true;
            if (Object.prototype.hasOwnProperty.call(actionResult, "result")) {
              resEntry.result = actionResult.result;
            } else {
              const { intent, response, message: msg } = actionResult as any;
              if (
                typeof intent !== "undefined" ||
                typeof response !== "undefined"
              ) {
                resEntry.result = {
                  intent: intent ?? null,
                  response: response ?? msg ?? null,
                };
              } else {
                resEntry.result = actionResult;
              }
            }
          }
        }
      } catch (stepErr: any) {
        resEntry.error = stepErr?.message || String(stepErr);
      }

      results.push(resEntry);
    }

    return NextResponse.json({ workflowId: id, steps: results });
  } catch (err: any) {
    console.error("POST /api/workflows/[id]/run error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
