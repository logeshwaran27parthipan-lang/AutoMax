import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { callGroq } from "@/lib/ai/aiClient";
import {
  buildAccountContext,
  buildDynamicContext,
  trimHistory,
} from "@/lib/ai/contextBuilder";

let redis: any = null;

/**
 * Initialize Redis lazily with error handling
 */
function getRedis() {
  if (!redis && process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const { Redis } = require("@upstash/redis");
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
    } catch (err) {
      console.error("[Redis Init Error]:", err);
    }
  }
  return redis;
}

/**
 * Get today's date as YYYY-MM-DD for Redis key
 */
function getTodayKey(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * LAYER 0 - Rate Limit Guard
 * Checks if user has exceeded 50 requests today
 * Returns { allowed: boolean, count: number }
 */
async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  count: number;
  remaining: number;
}> {
  try {
    const redisClient = getRedis();
    if (!redisClient) {
      // Redis not available - fail open
      return { allowed: true, count: 0, remaining: 50 };
    }

    const key = `ai:ratelimit:${userId}:${getTodayKey()}`;
    const count = await redisClient.get(key);
    const currentCount = (count as number) || 0;

    if (currentCount >= 50) {
      return { allowed: false, count: 50, remaining: 0 };
    }

    return { allowed: true, count: currentCount, remaining: 50 - currentCount };
  } catch (err) {
    console.error("[Rate Limit Check Error]:", err);
    // Fail open - allow request if Redis is down
    return { allowed: true, count: 0, remaining: 50 };
  }
}

/**
 * Increment the rate limit counter
 */
async function incrementRateLimit(userId: string): Promise<void> {
  try {
    const redisClient = getRedis();
    if (!redisClient) {
      // Redis not available - silently fail
      return;
    }

    const key = `ai:ratelimit:${userId}:${getTodayKey()}`;
    await redisClient.incr(key);
    // Set TTL to 24 hours to auto-expire
    await redisClient.expire(key, 86400);
  } catch (err) {
    console.error("[Rate Limit Increment Error]:", err);
    // Silently fail - don't crash the response
  }
}

/**
 * Verify JWT from auth-token cookie and extract userId
 */
async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {
      userId: string;
    };
    return decoded.userId;
  } catch (err) {
    console.error("[JWT Verification Error]:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // LAYER 0 - Get userId first
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // LAYER 0 - Rate Limit Guard (BEFORE any DB query)
    const rateLimitCheck = await checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message: "You've used your 50 daily AI messages. Resets at midnight.",
          requestsUsed: rateLimitCheck.count,
          requestsRemaining: rateLimitCheck.remaining,
        },
        { status: 429 },
      );
    }

    // Parse request body
    const body = await req.json();
    const { message, messages: historyMessages, accountContext, mode } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    // LAYER 1 - Session Memory: Trim history
    const trimmedMessages = trimHistory(historyMessages || []);

    // Fetch user's workflows for dynamic context
    const workflows = await prisma.workflow.findMany({
      where: {
        userId: userId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // LAYER 3 - Dynamic Context: Fetch relevant run data if needed
    const dynamicContext = await buildDynamicContext(
      userId,
      message,
      workflows,
    );

    // LAYER 4 - Assemble System Prompt
    let systemPrompt: string;

    if (mode === "builder") {
      systemPrompt = `You are AutoMax Workflow Builder. The user will describe an automation they want.
Your job is to output ONLY a valid JSON object — no explanation, no markdown, no backticks.

Available trigger types: "manual", "webhook", "schedule", "whatsapp"
Available step types: "send_email", "send_whatsapp", "whatsapp_reply", "sheets_read", "sheets_append", "http_request", "condition", "forEach", "ai_decision"

Step field rules:
- send_email: { type: "send_email", to: "", subject: "", body: "" }
- send_whatsapp: { type: "send_whatsapp", to: "", message: "" }
- whatsapp_reply: { type: "whatsapp_reply", message: "" }
- sheets_append: { type: "sheets_append", spreadsheetId: "", sheetName: "Sheet1", values: {} }
- sheets_read: { type: "sheets_read", spreadsheetId: "", sheetName: "Sheet1" }
- http_request: { type: "http_request", url: "", method: "POST", body: "" }
- condition: { type: "condition", field: "", operator: "equals", value: "" }
- ai_decision: { type: "ai_decision", prompt: "" }
- forEach: { type: "forEach", itemsKey: "rows", substeps: [] }

Output format — return ONLY this JSON, nothing else:
{
  "name": "short workflow name",
  "description": "one sentence description",
  "trigger": { "type": "trigger_type_here" },
  "steps": [ ...steps ]
}

Rules:
- Leave spreadsheetId, to, subject, etc. as empty strings — user will fill them in the editor.
- For whatsapp trigger, set trigger to { "type": "whatsapp", "keyword": "" }
- For schedule trigger, set trigger to { "type": "schedule", "cron": "0 9 * * *" }
- Keep steps minimal and practical — 1 to 3 steps max.
- If the user's request is unclear, still generate the closest matching workflow.
- NEVER output anything except the JSON object.`;
    } else {
      systemPrompt = `You are AutoMax Assistant — a workflow automation helper for Indian small businesses.

PLATFORM CAPABILITIES:
Triggers: webhook, schedule (cron), manual, WhatsApp incoming
Steps: send email, send WhatsApp, AI decision, Google Sheets read/append, condition

ACCOUNT CONTEXT:
${accountContext || "Account context unavailable."}

RELEVANT DATA FOR THIS QUERY:
${dynamicContext}

RULES:
- You are read-only. Never claim you can execute or modify workflows.
- Never guess run data. If you don't have it, say: check the Runs page.
- Never expose or reference other users' data.
- For workflow suggestions always output: Trigger → Step 1 → Step 2 → ... format.
- Answer in simple English. Users are Indian small business owners, not developers.
- If asked to build a workflow, describe the layout then ask: "Want me to generate a template for this?"
- If you cannot determine the answer from the data provided, say: "I don't have enough data for this — check the Runs page for full logs."`;
    }

    // LAYER 5 - Call Groq API with trimmed history
    // Cast to ensure proper types
    const messagesCasted = trimmedMessages.map((m) => ({
      ...m,
      role: m.role as "user" | "assistant" | "system",
    }));
    const reply = await callGroq(messagesCasted, systemPrompt);

    // Increment rate limit counter
    await incrementRateLimit(userId);

    // Get updated count
    const updatedCheck = await checkRateLimit(userId);

    return NextResponse.json(
      {
        reply,
        requestsUsed: 50 - updatedCheck.remaining,
        requestsRemaining: updatedCheck.remaining,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[AI Route Error]:", err);

    // Never return raw 500 - always return friendly error
    return NextResponse.json(
      {
        reply: "AI is temporarily unavailable. Please try again.",
        requestsUsed: 0,
        requestsRemaining: 50,
      },
      { status: 200 },
    );
  }
}
