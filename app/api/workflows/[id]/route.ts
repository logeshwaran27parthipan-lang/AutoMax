import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const workflow = await prisma.workflow.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      triggers: workflow.triggers ?? [],
      steps: workflow.steps ?? [],
      createdAt: workflow.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("GET /api/workflows/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const body = await req.json();
    const { steps, triggers, name, description } = body as {
      steps?: any[];
      triggers?: any[];
      name?: string;
      description?: string;
    };

    // Ensure the workflow exists and belongs to the user
    const existing = await prisma.workflow.findFirst({
      where: { id, userId: payload.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: any = {};
    if (typeof name !== "undefined") data.name = name;
    if (typeof description !== "undefined") data.description = description;
    if (typeof steps !== "undefined") data.steps = steps;
    if (typeof triggers !== "undefined") data.triggers = triggers;

    const updated = await prisma.workflow.update({
      where: { id: existing.id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      triggers: updated.triggers ?? [],
      steps: updated.steps ?? [],
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("PATCH /api/workflows/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
