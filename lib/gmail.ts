import nodemailer from "nodemailer";

/**
 * Simple email integration helper.
 * Exports a single function `sendEmail(to, subject, body)` which reads SMTP
 * credentials from environment variables `GMAIL_SMTP_USER` and `GMAIL_SMTP_PASS`.
 *
 * This module intentionally contains no business/workflow logic — callers
 * should implement retries, logging, or persistence as needed.
 */
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

  const smtpUser = process.env.GMAIL_SMTP_USER;
  const smtpPass = process.env.GMAIL_SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    throw new Error(
      "sendEmail: missing SMTP credentials (GMAIL_SMTP_USER/GMAIL_SMTP_PASS)",
    );
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    const result = await transporter.sendMail({
      from: smtpUser,
      to,
      subject,
      text: body,
    });
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: String(err) };
  }
}
