import { sendEmail } from "@/lib/gmail";

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export async function sendEmailAction(data: SendEmailInput) {
  const { to, subject, body } = data;

  // ✅ VALIDATION
  if (!to) throw new Error("Missing 'to' email");
  if (!subject) throw new Error("Missing 'subject'");
  if (!body) throw new Error("Missing 'body'");

  console.log("[ACTION] send_email →", to);

  const res = await sendEmail(to, subject, body);

  if (!res.success) {
    throw new Error(res.error || "Email sending failed");
  }

  return res.result;
}