import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const smtpReady = !!(process.env.SMTP_HOST && process.env.SMTP_USER);

if (!resend && !smtpReady) {
  console.warn('[email] Geen RESEND_API_KEY of SMTP geconfigureerd — e-mails worden niet verstuurd');
}

function nodemailerTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Email timeout na 10 seconden')), ms)
    ),
  ]);
}

async function sendEmail({ to, subject, html }) {
  if (!resend && !smtpReady) {
    throw new Error('Geen e-mailservice geconfigureerd (RESEND_API_KEY ontbreekt)');
  }

  if (resend) {
    const { data, error } = await withTimeout(resend.emails.send({
      from: process.env.EMAIL_FROM || 'Streetfeed <noreply@streetfeed.nl>',
      to,
      subject,
      html,
    }));
    if (error) {
      console.error('[Resend] Failed to send email:', error);
      throw new Error(`Email send failed: ${error.message}`);
    }
    console.log('[Resend] Email sent, id:', data?.id);
  } else {
    const transport = nodemailerTransport();
    await withTimeout(transport.sendMail({
      from: process.env.EMAIL_FROM || 'Streetfeed <noreply@streetfeed.nl>',
      to,
      subject,
      html,
    }));
  }
}

export async function sendMagicLink(email, name, token) {
  const url = `${process.env.APP_URL}/auth?token=${token}`;
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

  await sendEmail({ to: email, subject: 'Jouw Streetfeed inloglink', html });
}

// Verstuurd zodra een straat-admin een aanvraag goedkeurt — de bewoner heeft
// op dat moment vaak geen actieve sessie meer open (PendingPage doet niet aan
// polling), dus e-mail is het enige betrouwbare kanaal om dit te melden.
export async function sendApprovalEmail(email, name) {
  const url = process.env.APP_URL;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#E8FF47;background:#0F0F0F;padding:12px 20px;border-radius:8px;display:inline-block">
        Street<span>feed</span>
      </h2>
      <p>Hoi ${name || 'bewoner'},</p>
      <p>Goed nieuws — je aanvraag voor Streetfeed is goedgekeurd. Je hebt nu toegang tot de buurtfeed.</p>
      <a href="${url}" style="display:inline-block;background:#E8FF47;color:#000;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;margin:16px 0">
        Open Streetfeed →
      </a>
    </div>
  `;

  await sendEmail({ to: email, subject: 'Je aanvraag is goedgekeurd — welkom bij Streetfeed', html });
}
