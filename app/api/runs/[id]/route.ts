import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    const userId = decoded.userId;

    const run = await prisma.workflowRun.findFirst({
      where: { id, userId },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (run.status !== "running") {
      return NextResponse.json(
        { error: "Run is not in running state" },
        { status: 400 },
      );
    }

    const updated = await prisma.workflowRun.update({
      where: { id },
      data: {
        status: "failed",
        finishedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
