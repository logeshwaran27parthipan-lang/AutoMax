import { NextRequest, NextResponse } from "next/server";
import { emitEvent } from "@/lib/events/eventBus";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[WHATSAPP INCOMING]:", JSON.stringify(body));

    // WAHA sends events in this format
    const event = body?.event;
    const payload = body?.payload;

    if (event !== "message" && event !== "message.any") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const from = payload?.from || payload?.sender?.id || "";
    const text = payload?.body || payload?.text || "";
    const name = payload?.notifyName || payload?._data?.notifyName || "";

    const phone = from.replace("@c.us", "").replace("@s.whatsapp.net", "");

    console.log("[WHATSAPP MESSAGE] from:", phone, "text:", text);

    await emitEvent("whatsapp_incoming", {
      phone,
      message: text,
      name,
      from,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[WHATSAPP INCOMING ERROR]:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}