import { NextResponse } from "next/server";
import { getSessionStatus } from "../../../../lib/whatsapp";

export async function GET() {
  try {
    const status = await getSessionStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "WAHA not reachable" },
      { status: 503 }
    );
  }
}
