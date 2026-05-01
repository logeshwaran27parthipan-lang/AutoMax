import { NextRequest, NextResponse } from "next/server";
import { emitEvent } from "@/lib/events/eventBus";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[WHATSAPP INCOMING]:", JSON.stringify(body));

    const event = body?.event;
    const payload = body?.payload;

    if (event !== "message" && event !== "message.any") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const from = payload?.from || payload?.sender?.id || "";
    const text = payload?.body || payload?.text || "";
    const name = payload?.notifyName || payload?._data?.notifyName || "";

    // Skip @lid contacts — these are internal WhatsApp IDs, not real phone numbers
    if (from.includes("@lid")) {
      console.log("[WHATSAPP INCOMING] Skipping @lid contact:", from);
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Strip @c.us or @s.whatsapp.net suffix
    let phone = from.replace("@c.us", "").replace("@s.whatsapp.net", "").trim();

    // Add + prefix if missing (WAHA sends numbers without +)
    if (phone && !phone.startsWith("+")) {
      phone = "+" + phone;
    }

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
