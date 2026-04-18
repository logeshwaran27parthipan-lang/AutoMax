import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processEvent } from "@/lib/engine/workflowEngine";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const cookie = req.cookies.get("auth-token")?.value;
    if (!cookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tokenPayload = verifyToken(cookie);
    if (!tokenPayload?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: "Missing workflow id" },
        { status: 400 },
      );
    }

    const workflow = await prisma.workflow.findFirst({
      where: { id, userId: tokenPayload.userId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Route through the real engine — this saves run to DB,
    // handles ai_decision, interpolation, extraction, memory
    await processEvent("manual", {
      workflowId: id,
      userId: tokenPayload.userId,
      source: "manual_run",
    });

    return NextResponse.json({ ok: true, workflowId: id });
  } catch (err: any) {
    console.error("POST /api/workflows/[id]/run error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
