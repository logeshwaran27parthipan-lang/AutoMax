import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/runs
 *
 * Fetch recent workflow runs across all user workflows
 * REQUIRES: Valid JWT auth token in auth-token cookie
 *
 * Query parameters:
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 *
 * Response:
 * {
 *   runs: [
 *     {
 *       id: string,
 *       workflowId: string,
 *       workflowName: string,
 *       status: "running" | "completed" | "failed",
 *       trigger: "schedule" | "webhook" | "manual",
 *       startedAt: string (ISO),
 *       finishedAt: string | null (ISO),
 *       duration: number | null (milliseconds),
 *       stepCount: number,
 *       completedSteps: number
 *     }
 *   ],
 *   total: number,
 *   hasMore: boolean
 * }
 *
 * Production-grade features:
 * - JWT authentication required
 * - Org isolation (only user's workflows)
 * - Pagination support
 * - Ordered by startedAt DESC
 * - Includes step execution metrics
 * - Structured error responses
 */
export async function GET(req: NextRequest) {
  try {
    // ============================================
    // 1. AUTHENTICATION CHECK
    // ============================================
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      console.warn("[RUNS_API] Request without auth token - REJECTED");
      return NextResponse.json(
        { error: "Unauthorized - auth token required" },
        { status: 401 },
      );
    }

    // Verify JWT token and extract user info
    const user = verifyToken(token);
    if (!user || !user.userId) {
      console.warn("[RUNS_API] Token verification failed");
      return NextResponse.json(
        { error: "Unauthorized - invalid token" },
        { status: 401 },
      );
    }

    // ============================================
    // 2. PARSE QUERY PARAMETERS
    // ============================================
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    const limit = Math.min(parseInt(limitParam || "20", 10), 100);
    const offset = Math.max(parseInt(offsetParam || "0", 10), 0);

    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { error: "Invalid limit parameter" },
        { status: 400 },
      );
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: "Invalid offset parameter" },
        { status: 400 },
      );
    }

    console.log("[RUNS_API] Fetching runs", {
      userId: user.userId,
      limit,
      offset,
    });

    // ============================================
    // 3. FETCH TOTAL COUNT (for pagination)
    // ============================================
    const totalRuns = await prisma.workflowRun.count({
      where: {
        workflow: {
          userId: user.userId,
        },
      },
    });

    // ============================================
    // 4. FETCH PAGINATED RUNS
    // ============================================
    const runs = await prisma.workflowRun.findMany({
      where: {
        workflow: {
          userId: user.userId,
        },
      },
      select: {
        id: true,
        workflowId: true,
        workflow: {
          select: {
            name: true,
          },
        },
        status: true,
        trigger: true,
        startedAt: true,
        finishedAt: true,
        steps: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        startedAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    // ============================================
    // 5. TRANSFORM RESPONSE
    // ============================================
    const formattedRuns = runs.map((run) => {
      const completedSteps = run.steps.filter(
        (s) => s.status === "completed",
      ).length;
      const duration =
        run.finishedAt && run.startedAt
          ? new Date(run.finishedAt).getTime() -
            new Date(run.startedAt).getTime()
          : null;

      return {
        id: run.id,
        workflowId: run.workflowId,
        workflowName: run.workflow.name,
        status: run.status,
        trigger: run.trigger,
        startedAt: run.startedAt.toISOString(),
        finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
        duration,
        stepCount: run.steps.length,
        completedSteps,
      };
    });

    console.log("[RUNS_API] Fetched runs successfully", {
      userId: user.userId,
      count: formattedRuns.length,
      total: totalRuns,
    });

    // ============================================
    // 6. RETURN PAGINATED RESPONSE
    // ============================================
    return NextResponse.json(
      {
        runs: formattedRuns,
        total: totalRuns,
        hasMore: offset + limit < totalRuns,
      },
      { status: 200 },
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[RUNS_API] Error fetching runs", {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: "Failed to fetch runs" },
      { status: 500 },
    );
  }
}
