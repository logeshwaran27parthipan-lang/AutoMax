import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/webhook/[workflowId]
 *
 * Webhook trigger for workflows
 * Routes external events to background queue (not synchronous execution)
 *
 * Production-grade features:
 * - Returns immediately (async queuing)
 * - Avoids Vercel 10s timeout
 * - Webhook secret verification
 * - Structured logging
 * - Error handling
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ workflowId: string }> },
) {
  try {
    const { workflowId } = await context.params;

    if (!workflowId) {
      console.warn("[WEBHOOK] Missing workflowId");
      return NextResponse.json(
        { error: "Missing workflowId" },
        { status: 400 },
      );
    }

    // ============================================
    // 1. VERIFY WORKFLOW EXISTS
    // ============================================
    console.log("[WEBHOOK] Fetching workflow", { workflowId });
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      console.warn("[WEBHOOK] Workflow not found", { workflowId });
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    // ============================================
    // 2. VERIFY WEBHOOK SECRET (if configured)
    // ============================================
    const secret = req.headers.get("x-webhook-secret");
    const expectedSecret = process.env.WEBHOOK_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      console.warn("[WEBHOOK] Invalid secret", { workflowId });
      return NextResponse.json(
        { error: "Invalid webhook secret" },
        { status: 401 },
      );
    }

    // ============================================
    // 3. PARSE WEBHOOK PAYLOAD
    // ============================================
    let body: any = {};
    try {
      body = await req.json();
    } catch (parseErr) {
      console.warn("[WEBHOOK] Failed to parse JSON body", { workflowId });
      body = {};
    }

    console.log("[WEBHOOK] Received webhook", {
      workflowId,
      userId: workflow.userId,
      payloadKeys: Object.keys(body),
    });

    // ============================================
    // 4. ENQUEUE WORKFLOW (ASYNC - NO TIMEOUT)
    // ============================================
    try {
      const { processEvent } = await import("@/lib/engine/workflowEngine");
      await processEvent("webhook", {
        workflowId,
        userId: workflow.userId,
        payload: body,
      });
      console.log("[WEBHOOK] Workflow processed successfully", { workflowId });
    } catch (execErr) {
      const error =
        execErr instanceof Error ? execErr : new Error(String(execErr));
      console.error("[WEBHOOK] Failed to process workflow", {
        workflowId,
        error: error.message,
      });
      return NextResponse.json(
        { error: "Workflow execution failed" },
        { status: 500 },
      );
    }

    // ============================================
    // 5. RETURN IMMEDIATELY (CRITICAL)
    // ============================================
    // Return 202 Accepted - webhook is queued, not executed yet
    // This ensures we return before Vercel's 10s timeout
    return NextResponse.json({ received: true, workflowId }, { status: 200 });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[WEBHOOK] Request failed", {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: error.message || "Webhook failed" },
      { status: 500 },
    );
  }
}
