import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailWithSmtp } from "@/lib/gmail";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getSheetRows, appendToSheet } from "@/lib/sheets";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const cookie = req.cookies.get("auth-token")?.value;
    if (!cookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(cookie);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Next.js 15+: context.params may be a promise
    const params = await context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: "Missing workflow id" },
        { status: 400 },
      );
    }

    const workflow = await prisma.workflow.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rawSteps = workflow.steps ?? [];
    let stepsArray: any[] = [];
    if (Array.isArray(rawSteps)) {
      stepsArray = rawSteps as any[];
    } else if (typeof rawSteps === "string") {
      try {
        stepsArray = JSON.parse(rawSteps) as any[];
      } catch {
        stepsArray = [];
      }
    } else if (rawSteps && typeof rawSteps === "object") {
      // If it's a JSON object, attempt to coerce to array if possible
      try {
        stepsArray = JSON.parse(JSON.stringify(rawSteps)) as any[];
        if (!Array.isArray(stepsArray)) stepsArray = [];
      } catch {
        stepsArray = [];
      }
    } else {
      stepsArray = [];
    }

    const results: Array<any> = [];

    for (let i = 0; i < stepsArray.length; i++) {
      const step = stepsArray[i];
      const type = step?.type || "unknown";
      const resEntry: any = {
        stepIndex: i,
        type,
        success: false,
        result: null,
        error: null,
      };

      try {
        if (type === "send_email") {
          const smtpUser = process.env.GMAIL_SMTP_USER;
          const smtpPass = process.env.GMAIL_SMTP_PASS;
          if (!smtpUser || !smtpPass)
            throw new Error("Missing GMAIL_SMTP_USER or GMAIL_SMTP_PASS");
          const to = step.to;
          const subject = step.subject || "";
          const body = step.body || "";
          const html = "<p>" + body + "</p>";
          const sendRes = await sendEmailWithSmtp(
            smtpUser,
            smtpPass,
            to,
            subject,
            body,
            html,
          );
          resEntry.success = true;
          resEntry.result = sendRes;
        } else if (type === "send_whatsapp") {
          const phone = step.phone;
          const message = step.message || "";
          const waRes = await sendWhatsAppMessage(phone, message);
          resEntry.success = true;
          resEntry.result = waRes;
        } else if (type === "ai_generate") {
          const model = step.model || "gemini";
          const prompt = step.prompt || "";
          // forward auth cookie to internal AI endpoint
          const cookieHeader =
            req.headers.get("cookie") || `auth-token=${cookie}`;
          const aiRes = await fetch(new URL("/api/ai", req.url).toString(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: cookieHeader,
            },
            body: JSON.stringify({ model, prompt }),
          });
          const data = await aiRes.json();
          // extract generated text where possible
          let generated: any = null;
          if (data == null) {
            generated = null;
          } else if (
            Array.isArray(data.candidates) &&
            data.candidates.length > 0
          ) {
            // Gemini-style candidates
            const cand = data.candidates[0];
            if (cand.output) generated = cand.output;
            else if (cand.content && Array.isArray(cand.content)) {
              const parts = cand.content.flatMap((c: any) =>
                c.parts ? c.parts.map((p: any) => p.text || "") : [],
              );
              generated = parts.join("");
            } else generated = cand;
          } else if (data.output && Array.isArray(data.output)) {
            const parts = data.output.flatMap((o: any) =>
              o.content
                ? o.content.flatMap((c: any) =>
                    c.parts ? c.parts.map((p: any) => p.text || "") : [],
                  )
                : [],
            );
            generated = parts.join("");
          } else if (data.completion) {
            generated = data.completion;
          } else if (data.message && data.message.content) {
            generated = data.message.content;
          } else {
            generated = data;
          }
          resEntry.success = true;
          resEntry.result = generated;
        } else if (type === "sheets_read") {
          const spreadsheetId = step.spreadsheetId;
          const range = step.range;
          const rows = await getSheetRows(spreadsheetId, range);
          resEntry.success = true;
          resEntry.result = rows;
        } else if (type === "sheets_append") {
          const spreadsheetId = step.spreadsheetId;
          const range = step.range;
          const values = step.values;
          const appendRes = await appendToSheet(spreadsheetId, range, values);
          resEntry.success = true;
          resEntry.result = appendRes;
        } else {
          resEntry.error = `Unknown step type: ${type}`;
        }
      } catch (stepErr: any) {
        resEntry.error = stepErr?.message || String(stepErr);
      }

      results.push(resEntry);
    }

    return NextResponse.json({ workflowId: id, steps: results });
  } catch (err: any) {
    console.error("POST /api/workflows/[id]/run error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
