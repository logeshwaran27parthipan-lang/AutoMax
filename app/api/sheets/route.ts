import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { appendToSheet, getSheetRows } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = req.nextUrl;
    const spreadsheetId = url.searchParams.get("spreadsheetId") || undefined;
    const range = url.searchParams.get("range") || undefined;

    if (!spreadsheetId || !range) {
      return NextResponse.json(
        { error: "spreadsheetId and range are required" },
        { status: 400 },
      );
    }

    const rows = await getSheetRows(spreadsheetId, range);
    return NextResponse.json({ rows });
  } catch (err: any) {
    console.error("GET /api/sheets error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const spreadsheetId = body?.spreadsheetId;
    const range = body?.range;
    const values = body?.values;

    if (!spreadsheetId || !range || !values) {
      return NextResponse.json(
        { error: "spreadsheetId, range and values are required" },
        { status: 400 },
      );
    }

    // Expect values to be an array of arrays
    if (!Array.isArray(values)) {
      return NextResponse.json(
        { error: "values must be an array of rows" },
        { status: 400 },
      );
    }

    const result = await appendToSheet(spreadsheetId, range, values);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("POST /api/sheets error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
