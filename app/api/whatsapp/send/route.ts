import { NextResponse } from "next/server";
import actions from "@/lib/actions";
import { verifyToken } from "../../../../lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const to = body.to || body.phone;
    const message = body.message;
    if (!to || !message) {
      return NextResponse.json(
        { error: "to (or phone) and message are required" },
        { status: 400 },
      );
    }

    // Use action registry to perform the work; keep API layer thin
    const result = await actions.send_whatsapp({ to, message });

    if (!result || result.success === false) {
      return NextResponse.json(
        { success: false, error: result?.error ?? "failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to send WhatsApp message" },
      { status: 500 },
    );
  }
}
