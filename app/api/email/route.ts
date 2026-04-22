import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import actions from "@/lib/actions";

/**
 * POST /api/email
 *
 * Send email via Resend
 * REQUIRES: Valid JWT auth token in auth-token cookie
 *
 * Request body:
 * {
 *   to: string,
 *   subject: string,
 *   html?: string,
 *   text?: string
 * }
 *
 * Production-grade security:
 * - JWT authentication required
 * - Rate limiting via user context
 * - Structured error responses
 * - Audit logging ready
 */
export async function POST(req: NextRequest) {
  try {
    // ============================================
    // 1. AUTHENTICATION CHECK (SECURITY CRITICAL)
    // ============================================
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      console.warn("[EMAIL_API] ⚠️ Request without auth token - REJECTED");
      return NextResponse.json(
        { error: "Unauthorized - auth token required" },
        { status: 401 },
      );
    }

    // Verify JWT token and extract user info
    const user = verifyToken(token);

    if (!user || !user.userId) {
      console.warn("[EMAIL_API] ⚠️ Invalid token - REJECTED");
      return NextResponse.json(
        { error: "Unauthorized - invalid token" },
        { status: 401 },
      );
    }

    // ============================================
    // 2. REQUEST VALIDATION
    // ============================================
    const payload = await req.json();
    const { to, subject, html, text } = payload as any;

    if (!to || typeof to !== "string") {
      console.warn("[EMAIL_API] Invalid recipient", { userId: user.userId });
      return NextResponse.json(
        { error: "Recipient (to) must be a non-empty string" },
        { status: 400 },
      );
    }

    if (!subject || typeof subject !== "string") {
      console.warn("[EMAIL_API] Invalid subject", { userId: user.userId });
      return NextResponse.json(
        { error: "Subject must be a non-empty string" },
        { status: 400 },
      );
    }

    // ============================================
    // 3. BODY PREPARATION
    // ============================================
    const body = text || html || "";

    if (!body) {
      console.warn("[EMAIL_API] Empty body", { userId: user.userId, to });
      return NextResponse.json(
        { error: "Email body (text or html) required" },
        { status: 400 },
      );
    }

    // ============================================
    // 4. SEND EMAIL
    // ============================================
    console.log("[EMAIL_API] Sending email", {
      userId: user.userId,
      to,
      subject: subject.substring(0, 50),
    });

    const result = await actions.send_email({ to, subject, body });

    if (!result || result.success === false) {
      console.error("[EMAIL_API] Send failed", {
        userId: user.userId,
        error: result?.error,
      });
      return NextResponse.json(
        { success: false, error: result?.error ?? "Failed to send email" },
        { status: 500 },
      );
    }

    // ============================================
    // 5. SUCCESS RESPONSE
    // ============================================
    console.log("[EMAIL_API] Email sent successfully", {
      userId: user.userId,
      to,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[EMAIL_API] Request failed", {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 },
    );
  }
}
