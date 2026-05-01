import { sendWhatsAppMessage } from "@/lib/integrations/whatsapp";

export type WhatsappReplyInput = {
  message: string;
  phone?: string;
};

/**
 * Reply to the WhatsApp sender who triggered this workflow.
 * Phone number is taken automatically from the workflow context (payload.phone)
 * — the user only configures the message.
 */
export async function whatsappReply(data: WhatsappReplyInput) {
  const { message, phone } = data;

  // ============================================
  // 1. VALIDATION
  // ============================================
  if (!message || typeof message !== "string" || message.trim() === "") {
    throw new Error(
      "Missing or invalid 'message' (must be a non-empty string)",
    );
  }

  if (!phone || typeof phone !== "string" || phone.trim() === "") {
    throw new Error(
      "No phone number found in workflow context. " +
        "whatsapp_reply requires a WhatsApp incoming trigger.",
    );
  }

  const phoneRegex = /^\+\d{1,3}\d{4,14}$/;
  if (!phoneRegex.test(phone.trim())) {
    throw new Error(
      `Invalid phone format in context (expected E.164 like +919876543210): ${phone}`,
    );
  }

  console.log("[ACTION] whatsapp_reply", {
    phone,
    messageLength: message.length,
  });

  // ============================================
  // 2. SEND
  // ============================================
  const res = await sendWhatsAppMessage(phone.trim(), message);

  if (!res.success) {
    throw new Error(`WhatsApp reply failed: ${res.error}`);
  }

  console.log("[ACTION] whatsapp_reply sent to:", phone);

  // ============================================
  // 3. RETURN
  // ============================================
  return {
    success: true,
    phone,
    messageLength: message.length,
  };
}
