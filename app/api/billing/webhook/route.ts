import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    console.log("[BILLING WEBHOOK] received:", body);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("[WEBHOOK ERROR]:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
