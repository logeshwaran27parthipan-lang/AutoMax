import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events/eventBus";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;

    if (!workflowId) {
      return NextResponse.json(
        { error: "Missing workflowId" },
        { status: 400 }
      );
    }

    // Verify workflow exists
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Verify webhook secret if configured
    const secret = req.headers.get("x-webhook-secret");
    const expectedSecret = process.env.WEBHOOK_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json(
        { error: "Invalid webhook secret" },
        { status: 401 }
      );
    }

    // Parse body
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    console.log("[WEBHOOK] Received for workflow:", workflowId);
    console.log("[WEBHOOK] Payload:", body);

    // Trigger workflow directly by ID
    await emitEvent("webhook_trigger", {
      ...body,
      workflowId,
      userId: workflow.userId,
    });

    return NextResponse.json({
      success: true,
      workflowId,
      message: "Webhook received and processing",
    });

  } catch (err: any) {
    console.error("[WEBHOOK ERROR]:", err);
    return NextResponse.json(
      { error: err?.message || "Webhook failed" },
      { status: 500 }
    );
  }
}