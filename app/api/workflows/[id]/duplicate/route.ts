import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(
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

    const original = await prisma.workflow.findFirst({
      where: { id, userId },
    });

    if (!original) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    const copy = await prisma.workflow.create({
      data: {
        name: `Copy of ${original.name}`,
        description: original.description,
        triggers: original.triggers ?? undefined,
        steps: original.steps ?? undefined,
        isActive: false,
        userId,
        orgId: original.orgId,
      },
    });

    return NextResponse.json(copy, { status: 201 });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
