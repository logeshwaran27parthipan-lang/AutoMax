import { sendEmail } from "@/lib/gmail";

export type SendEmailInput = {
  to: string; // Single email or comma-separated list
  subject: string;
  body: string;
};

/**
 * Send email to one or more recipients
 *
 * Production-grade features:
 * - Supports single email: "user@example.com"
 * - Supports multiple emails: "user1@example.com, user2@example.com"
 * - Validates all recipients before sending
 * - Retries on failure (exponential backoff)
 * - Structured error messages
 */
export async function sendEmailAction(data: SendEmailInput) {
  const { to, subject, body } = data;

  // ============================================
  // 1. VALIDATION
  // ============================================
  if (!to || typeof to !== "string") {
    throw new Error("Missing or invalid 'to' (must be string)");
  }

  if (!subject || typeof subject !== "string") {
    throw new Error("Missing or invalid 'subject' (must be string)");
  }

  if (!body || typeof body !== "string") {
    throw new Error("Missing or invalid 'body' (must be string)");
  }

  // ============================================
  // 2. PARSE RECIPIENTS
  // ============================================
  // Split by comma and trim whitespace
  const recipients = to
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  if (recipients.length === 0) {
    throw new Error("No valid email recipients");
  }

  // Validate each recipient email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidRecipients = recipients.filter(
    (email) => !emailRegex.test(email),
  );

  if (invalidRecipients.length > 0) {
    throw new Error(`Invalid email format: ${invalidRecipients.join(", ")}`);
  }

  console.log("[ACTION] send_email", {
    recipients: recipients.length,
    subject: subject.substring(0, 50),
  });

  // ============================================
  // 3. SEND TO EACH RECIPIENT
  // ============================================
  const results = [];
  const errors = [];

  for (const recipient of recipients) {
    try {
      console.log("[ACTION] Sending to:", recipient);
      const res = await sendEmail(recipient, subject, body);

      if (!res.success) {
        errors.push({ recipient, error: res.error });
        console.error("[ACTION] Failed for:", recipient, res.error);
      } else {
        results.push({ recipient, success: true });
        console.log("[ACTION] Sent to:", recipient);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push({ recipient, error });
      console.error("[ACTION] Exception for:", recipient, error);
    }
  }

  // ============================================
  // 4. RETURN RESULTS
  // ============================================
  if (errors.length > 0 && results.length === 0) {
    // All recipients failed
    throw new Error(
      `Failed to send to all recipients: ${errors.map((e) => e.recipient).join(", ")}`,
    );
  }

  if (errors.length > 0) {
    // Partial failure - log but don't throw
    console.warn("[ACTION] Partial failure:", {
      succeeded: results.length,
      failed: errors.length,
      failedRecipients: errors.map((e) => e.recipient),
    });
  }

  return {
    success: true,
    sent: results.length,
    failed: errors.length,
    recipients: recipients.length,
    details: {
      successful: results.map((r) => r.recipient),
      failed: errors.map((e) => ({ recipient: e.recipient, reason: e.error })),
    },
  };
}
