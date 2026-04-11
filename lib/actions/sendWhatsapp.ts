import { sendWhatsAppMessage } from "@/lib/integrations/whatsapp";

export type SendWhatsappInput = {
  to: string;
  message: string;
};

export async function sendWhatsappAction(data: SendWhatsappInput) {
  const { to, message } = data;

  // ✅ VALIDATION
  if (!to) throw new Error("Missing phone number");
  if (!message) throw new Error("Missing message");

  console.log("[ACTION] send_whatsapp →", to);

  const res = await sendWhatsAppMessage(to, message);

  if (!res.success) {
    throw new Error(res.error || "WhatsApp sending failed");
  }

  return res.result;
}