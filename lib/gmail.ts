import { Resend } from "resend";

/**
 * Simple email integration helper using Resend.
 * Exports a single function `sendEmail(to, subject, body)` which reads the
 * Resend API key from environment variable `RESEND_API_KEY`.
 *
 * This module intentionally contains no business/workflow logic — callers
 * should implement retries, logging, or persistence as needed.
 */

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; result?: any; error?: string }> {
  if (!to || typeof to !== "string") {
    throw new Error('sendEmail: "to" is required');
  }
  if (!subject || typeof subject !== "string") {
    throw new Error('sendEmail: "subject" is required');
  }
  if (typeof body !== "string") {
    throw new Error('sendEmail: "body" must be a string');
  }

  try {
    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject,
      text: body,
    });
    return { success: true, result: data };
  } catch (err: any) {
    // ============================================
    // SECURITY: Sanitize error messages
    // Resend API errors can contain sensitive info
    // ============================================
    let sanitized = String(err);

    // Remove Resend API key if present (pattern: re_XXXX...)
    sanitized = sanitized.replace(/re_[a-zA-Z0-9_]{20,}/g, "[REDACTED_KEY]");

    // Remove Bearer tokens if present
    sanitized = sanitized.replace(
      /Bearer\s+[a-zA-Z0-9_.=-]+/g,
      "[REDACTED_TOKEN]",
    );

    console.error("[GMAIL] Email send failed - sanitized error:", {
      sanitizedError: sanitized,
      recipient: to,
      subject: subject.substring(0, 50),
    });

    return { success: false, error: sanitized };
  }
}
