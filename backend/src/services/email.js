import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function nodemailerTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendMagicLink(email, name, token) {
  const url = `${process.env.APP_URL}/auth/verify?token=${token}`;
  const subject = 'Jouw Streetfeed inloglink';
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#E8FF47;background:#0F0F0F;padding:12px 20px;border-radius:8px;display:inline-block">
        Street<span>feed</span>
      </h2>
      <p>Hoi ${name || 'bewoner'},</p>
      <p>Klik op de knop hieronder om in te loggen op Streetfeed. De link is <strong>15 minuten geldig</strong>.</p>
      <a href="${url}" style="display:inline-block;background:#E8FF47;color:#000;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;margin:16px 0">
        Inloggen op Streetfeed →
      </a>
      <p style="color:#888;font-size:12px">Als je deze e-mail niet hebt aangevraagd, kun je hem negeren.</p>
      <p style="color:#888;font-size:12px">Directe link: ${url}</p>
    </div>
  `;

  if (resend) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Streetfeed <noreply@streetfeed.nl>',
      to: email,
      subject,
      html,
    });
  } else {
    const transport = nodemailerTransport();
    await transport.sendMail({
      from: process.env.EMAIL_FROM || 'Streetfeed <noreply@streetfeed.nl>',
      to: email,
      subject,
      html,
    });
  }
}
