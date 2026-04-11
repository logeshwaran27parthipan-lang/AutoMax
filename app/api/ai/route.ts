import { NextRequest, NextResponse } from "next/server";
import actions from "@/lib/actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.prompt || body.message;
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message (or prompt) is required" },
        { status: 400 },
      );
    }

    const result = await actions.ai_process({ message });

    if (!result || result.success === false) {
      return NextResponse.json(
        { success: false, error: result?.error ?? "AI processing failed" },
        { status: 500 },
      );
    }

    // action returns { success, result?: { intent, response } }
    const r = result.result ?? {};

    return NextResponse.json({
      intent: r.intent ?? "unknown",
      message: r.response ?? "",
    });
  } catch (err: any) {
    console.error("/api/ai error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
