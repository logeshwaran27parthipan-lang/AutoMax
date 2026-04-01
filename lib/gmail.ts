import nodemailer from "nodemailer";

export async function sendEmailWithSmtp(
  smtpUser: string,
  smtpPass: string,
  to: string,
  subject: string,
  text?: string,
  html?: string,
) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });
  return transporter.sendMail({ from: smtpUser, to, subject, text, html });
}
