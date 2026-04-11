import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload?.userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { id } = await context.params;

    const workflow = await prisma.workflow.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(workflow);
  } catch (err) {
    console.error("GET /api/workflows/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch workflow" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload?.userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    const { name, description, triggers, steps } = body;

    const existing = await prisma.workflow.findFirst({
      where: { id, userId: payload.userId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(triggers !== undefined && { triggers }),
        ...(steps !== undefined && { steps }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/workflows/[id] error:", err);
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload?.userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { id } = await context.params;

    const existing = await prisma.workflow.findFirst({
      where: { id, userId: payload.userId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.workflowRunStep.deleteMany({ where: { run: { workflowId: id } } });
    await prisma.workflowRun.deleteMany({ where: { workflowId: id } });
    await prisma.workflow.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/workflows/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}