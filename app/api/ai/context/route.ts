import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { buildAccountContext } from "@/lib/ai/contextBuilder";

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

/**
 * GET /api/ai/context
 * Called on AI page mount to fetch account context and today's usage
 * Returns account context string + requests used + requests remaining
 */
export async function GET(req: NextRequest) {
  try {
    // Get userId from JWT
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build account context
    const accountContext = await buildAccountContext(userId);

    // Get today's request count from Redis
    try {
      const redisClient = getRedis();
      if (!redisClient) {
        // Redis not available, return safe defaults
        return NextResponse.json(
          {
            accountContext,
            requestsUsed: 0,
            requestsRemaining: 50,
          },
          { status: 200 },
        );
      }

      const key = `ai:ratelimit:${userId}:${getTodayKey()}`;
      const count = await redisClient.get(key);
      const requestsUsed = (count as number) || 0;
      const requestsRemaining = Math.max(0, 50 - requestsUsed);

      return NextResponse.json(
        {
          accountContext,
          requestsUsed,
          requestsRemaining,
        },
        { status: 200 },
      );
    } catch (redisErr) {
      console.error("[Redis Error in context route]:", redisErr);
      // Fail open - return context with full quota
      return NextResponse.json(
        {
          accountContext,
          requestsUsed: 0,
          requestsRemaining: 50,
        },
        { status: 200 },
      );
    }
  } catch (err: any) {
    console.error("[Context Route Error]:", err);
    // Always return success with safe defaults
    return NextResponse.json(
      {
        accountContext: "Account context unavailable.",
        requestsUsed: 0,
        requestsRemaining: 50,
      },
      { status: 200 },
    );
  }
}
