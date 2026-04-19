import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let tokenPayload: any;
    try {
      tokenPayload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: tokenPayload.userId },
      include: { org: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    if (membership.org.subscriptionStatus === "active") {
      return NextResponse.json({ message: "Already on Pro" }, { status: 200 });
    }

    await prisma.organization.update({
      where: { id: membership.org.id },
      data: {
        subscriptionStatus: "active",
        planId: "pro",
      },
    });

    return NextResponse.json(
      { success: true, message: "Upgraded to Pro" },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[SUBSCRIBE ERROR]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
