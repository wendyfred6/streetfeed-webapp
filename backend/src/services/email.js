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
      <h2 style="margin:0 0 16px">
        <span style="color:#1C1A18">Street</span><span style="color:#FF0066">feed</span>
      </h2>
      <p>Hoi ${name || 'bewoner'},</p>
      <p>Klik op de knop hieronder om in te loggen op Streetfeed. De link is <strong>15 minuten geldig</strong>.</p>
      <a href="${url}" style="display:inline-block;background:#FF0066;color:#fff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;margin:16px 0">
        Inloggen op Streetfeed →
      </a>
      <p style="color:#888;font-size:12px">Als je deze e-mail niet hebt aangevraagd, kun je hem negeren.</p>
      <p style="color:#888;font-size:12px">Directe link: ${url}</p>
      <div style="margin-top:24px;padding:16px;background:#f7f7f7;border-radius:10px;font-size:13px;color:#555">
        📱 <strong>Gebruik je een iPhone?</strong> Pushmeldingen werken op iOS alleen als
        Streetfeed aan je beginscherm is toegevoegd. Open streetfeed.nl in Safari, tik op het
        deel-icoon en kies "Zet op beginscherm".
      </div>
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
      <h2 style="margin:0 0 16px">
        <span style="color:#1C1A18">Street</span><span style="color:#FF0066">feed</span>
      </h2>
      <p>Hoi ${name || 'bewoner'},</p>
      <p>Goed nieuws — je aanvraag voor Streetfeed is goedgekeurd. Je hebt nu toegang tot de buurtfeed.</p>
      <a href="${url}" style="display:inline-block;background:#FF0066;color:#fff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;margin:16px 0">
        Open Streetfeed →
      </a>
    </div>
  `;

  await sendEmail({ to: email, subject: 'Je aanvraag is goedgekeurd — welkom bij Streetfeed', html });
}
