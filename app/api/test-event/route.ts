import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/events/eventBus";

export async function GET() {
  await emitEvent("test_event", {
    message: "send email to logeshwaran27parthipan@gmail.com saying hello bro",
  });

  return NextResponse.json({ ok: true });
}