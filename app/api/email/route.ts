import nodemailer from "nodemailer";
import type { EmailPayload } from "../../../types/index";

export async function POST(req: Request) {
  try {
    const payload: EmailPayload = await req.json();
    const { to, subject, html, text } = payload;
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "to and subject required" }),
        { status: 400 },
      );
    }

    // Try Gmail (OAuth) if credentials present - otherwise fallback to SMTP via env
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const smtpUser = process.env.GMAIL_SMTP_USER;
    const smtpPass = process.env.GMAIL_SMTP_PASS;

    if (clientId && clientSecret) {
      // NOTE: This implementation expects an access token or refresh token setup in env for production.
      // For now, attempt a simple SMTP fallback below if OAuth flow isn't configured.
    }

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: smtpUser,
        to,
        subject,
        text,
        html,
      });
      return new Response(JSON.stringify({ messageId: info.messageId }), {
        status: 200,
      });
    }

    return new Response(
      JSON.stringify({ error: "No valid email configuration found" }),
      { status: 500 },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Failed to send email" }), {
      status: 500,
    });
  }
}
