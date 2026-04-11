import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const token = req.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const runs = await prisma.workflowRun.findMany({
      where: {
        workflowId: id,
        userId: payload.userId,
      },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        steps: {
          orderBy: { stepIndex: "asc" },
        },
      },
    });

    return NextResponse.json(runs);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch runs" },
      { status: 500 }
    );
  }
}