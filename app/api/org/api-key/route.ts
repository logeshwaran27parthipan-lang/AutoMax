import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Get auth token from cookie
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    const tokenPayload = verifyToken(token);

    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user's organization (OWNER role)
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: tokenPayload.userId,
        role: "OWNER",
      },
      include: {
        org: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { orgName: membership.org.name, apiKey: membership.org.apiKey },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[API KEY GET ERROR]:", err);
    return NextResponse.json(
      { error: "Failed to fetch API key" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Get auth token from cookie
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    const tokenPayload = verifyToken(token);

    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user's organization (OWNER role)
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: tokenPayload.userId,
        role: "OWNER",
      },
      include: {
        org: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Generate new API key
    const newApiKey = "am_live_" + crypto.randomBytes(32).toString("hex");

    // Update organization with new API key
    await prisma.organization.update({
      where: { id: membership.org.id },
      data: { apiKey: newApiKey },
    });

    return NextResponse.json({ apiKey: newApiKey }, { status: 200 });
  } catch (err: any) {
    console.error("[API KEY REGEN ERROR]:", err);
    return NextResponse.json(
      { error: "Failed to regenerate API key" },
      { status: 500 },
    );
  }
}
