import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * POST /api/settings/waha-url
 *
 * Update WAHA_API_URL environment variable in Vercel
 * REQUIRES: Valid JWT auth token in auth-token cookie
 *
 * Request body:
 * {
 *   "url": "https://waha-instance.railway.app"
 * }
 *
 * Production-grade features:
 * - JWT authentication required
 * - Vercel API integration
 * - Create or update env var
 * - Deploy to all environments (production, preview, development)
 */
export async function POST(req: NextRequest) {
  try {
    // ============================================
    // 1. AUTHENTICATION CHECK
    // ============================================
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      console.warn("[WAHA_URL_API] ⚠️ Request without auth token - REJECTED");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);

    if (!user || !user.userId) {
      console.warn("[WAHA_URL_API] ⚠️ Invalid token - REJECTED");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ============================================
    // 2. REQUEST VALIDATION
    // ============================================
    const payload = await req.json();
    const { url } = payload as any;

    if (!url || typeof url !== "string" || url.trim() === "") {
      console.warn("[WAHA_URL_API] Invalid URL", { userId: user.userId });
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // ============================================
    // 3. VERCEL CREDENTIALS CHECK
    // ============================================
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      console.error("[WAHA_URL_API] Missing Vercel credentials");
      return NextResponse.json(
        { error: "Vercel credentials not configured" },
        { status: 500 },
      );
    }

    // ============================================
    // 4. FETCH EXISTING ENV VARS FROM VERCEL
    // ============================================
    console.log("[WAHA_URL_API] Fetching env vars from Vercel", {
      userId: user.userId,
      projectId: VERCEL_PROJECT_ID,
    });

    const getEnvResponse = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!getEnvResponse.ok) {
      console.error("[WAHA_URL_API] Failed to fetch Vercel env vars", {
        status: getEnvResponse.status,
        statusText: getEnvResponse.statusText,
      });
      return NextResponse.json(
        { error: "Failed to update Vercel env var" },
        { status: 500 },
      );
    }

    const envData = await getEnvResponse.json();
    const envVars = envData.envs || [];

    // ============================================
    // 5. FIND EXISTING WAHA_API_URL ENV VAR
    // ============================================
    const existingEnv = envVars.find((env: any) => env.key === "WAHA_API_URL");

    // ============================================
    // 6. UPDATE OR CREATE ENV VAR
    // ============================================
    let updateResponse;

    if (existingEnv) {
      // PATCH existing env var
      console.log("[WAHA_URL_API] Updating existing WAHA_API_URL", {
        userId: user.userId,
        envId: existingEnv.id,
      });

      updateResponse = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${existingEnv.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            value: url.trim(),
            target: ["production", "preview", "development"],
          }),
        },
      );
    } else {
      // POST new env var
      console.log("[WAHA_URL_API] Creating new WAHA_API_URL", {
        userId: user.userId,
      });

      updateResponse = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: "WAHA_API_URL",
            value: url.trim(),
            type: "plain",
            target: ["production", "preview", "development"],
          }),
        },
      );
    }

    // ============================================
    // 7. VERIFY UPDATE SUCCESS
    // ============================================
    if (!updateResponse.ok) {
      console.error("[WAHA_URL_API] Failed to update Vercel env var", {
        status: updateResponse.status,
        statusText: updateResponse.statusText,
        userId: user.userId,
      });
      return NextResponse.json(
        { error: "Failed to update Vercel env var" },
        { status: 500 },
      );
    }

    // ============================================
    // 8. SUCCESS RESPONSE
    // ============================================
    console.log("[WAHA_URL_API] WAHA URL updated successfully", {
      userId: user.userId,
      url: url.substring(0, 50),
    });

    return NextResponse.json(
      { success: true, message: "WAHA URL updated successfully" },
      { status: 200 },
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[WAHA_URL_API] Request failed", {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
