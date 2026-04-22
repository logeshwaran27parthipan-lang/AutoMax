import { sendWhatsAppMessage } from "@/lib/integrations/whatsapp";

export type SendWhatsappInput = {
  to: string; // Single number or comma-separated list (format: +919876543210)
  message: string;
};

/**
 * Send WhatsApp message to one or more recipients
 *
 * Production-grade features:
 * - Supports single number: "+919876543210"
 * - Supports multiple numbers: "+919876543210, +919876543211"
 * - Validates phone format (E.164 standard)
 * - Sends to each recipient independently
 * - Detailed success/failure reporting
 * - Structured error messages
 */
export async function sendWhatsappAction(data: SendWhatsappInput) {
  const { to, message } = data;

  // ============================================
  // 1. VALIDATION
  // ============================================
  if (!to || typeof to !== "string") {
    throw new Error("Missing or invalid 'to' phone number (must be string)");
  }

  if (!message || typeof message !== "string") {
    throw new Error("Missing or invalid 'message' (must be string)");
  }

  // ============================================
  // 2. PARSE RECIPIENTS
  // ============================================
  // Split by comma and trim whitespace
  const recipients = to
    .split(",")
    .map((phone) => phone.trim())
    .filter((phone) => phone.length > 0);

  if (recipients.length === 0) {
    throw new Error("No valid phone numbers");
  }

  // Validate phone format (E.164: +country code + number)
  // Example: +919876543210 (India)
  const phoneRegex = /^\+\d{1,3}\d{4,14}$/;
  const invalidRecipients = recipients.filter(
    (phone) => !phoneRegex.test(phone),
  );

  if (invalidRecipients.length > 0) {
    throw new Error(
      `Invalid phone format (expected E.164 like +919876543210): ${invalidRecipients.join(", ")}`,
    );
  }

  console.log("[ACTION] send_whatsapp", {
    recipients: recipients.length,
    messageLength: message.length,
  });

  // ============================================
  // 3. SEND TO EACH RECIPIENT
  // ============================================
  const results = [];
  const errors = [];

  for (const recipient of recipients) {
    try {
      console.log("[ACTION] Sending WhatsApp to:", recipient);
      const res = await sendWhatsAppMessage(recipient, message);

      if (!res.success) {
        errors.push({ recipient, error: res.error });
        console.error("[ACTION] WhatsApp failed for:", recipient, res.error);
      } else {
        results.push({ recipient, success: true });
        console.log("[ACTION] WhatsApp sent to:", recipient);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push({ recipient, error });
      console.error("[ACTION] WhatsApp exception for:", recipient, error);
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
    console.warn("[ACTION] WhatsApp partial failure:", {
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
