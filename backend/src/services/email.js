import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const smtpReady = !!(process.env.SMTP_HOST && process.env.SMTP_USER);

if (!resend && !smtpReady) {
  console.warn('[email] Geen RESEND_API_KEY of SMTP geconfigureerd — e-mails worden niet verstuurd');
}

// FRE-352: a required-but-blank env var (this and VAPID_*, per FRE-345/FRE-324)
// doesn't stop the app from booting, it just silently degrades a feature — the
// startup console.warn above is easy to miss in Portainer. /api/diagnostics
// exposes this same check so it's verifiable without digging through logs.
export function emailStatus() {
  return { configured: !!(resend || smtpReady), provider: resend ? 'resend' : smtpReady ? 'smtp' : null };
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Dark-mode strategy (see FRE ticket for the magic-link email polish):
// - `color-scheme`/`supported-color-schemes` meta tags opt us out of Gmail's
//   own heuristic auto-dark-mode inversion, which otherwise mangles an
//   undesigned template's colors.
// - Actual dark colors come from a real `@media (prefers-color-scheme: dark)`
//   block (Apple Mail, Gmail app, modern webmail) plus a `[data-ogsc]`
//   selector (the class Outlook.com/Yahoo add to <body> in dark mode instead
//   of honoring the media query).
// - Every class also has an inline-style light-mode default, so clients that
//   strip <style> blocks entirely (old Outlook desktop) just render light
//   mode — a safe, non-broken fallback rather than a broken one.
const EMAIL_FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function emailDocument({ title, bodyHtml }) {
  return `
<!DOCTYPE html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${title}</title>
    <style>
      body { margin:0; padding:0; }
      .sf-bg { background:#ffffff; }
      .sf-text, .sf-footer, .sf-logo-street { color:#1C1A18; }
      .sf-callout { background:rgba(108,104,96,0.05); }
      .sf-link { color:#7692CD; }
      @media (prefers-color-scheme: dark) {
        .sf-bg { background:#1C1A18 !important; }
        .sf-text, .sf-footer, .sf-logo-street { color:#ffffff !important; }
        .sf-callout { background:rgba(108,104,96,0.2) !important; }
      }
      [data-ogsc] .sf-bg { background:#1C1A18 !important; }
      [data-ogsc] .sf-text, [data-ogsc] .sf-footer, [data-ogsc] .sf-logo-street { color:#ffffff !important; }
      [data-ogsc] .sf-callout { background:rgba(108,104,96,0.2) !important; }
    </style>
  </head>
  <body class="sf-bg" style="margin:0;padding:0;background:#ffffff">
    <div class="sf-bg" style="background:#ffffff;font-family:${EMAIL_FONT_STACK};max-width:480px;margin:0 auto;padding:24px">
      ${bodyHtml}
    </div>
  </body>
</html>`;
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
  const safeName = escapeHtml(name || 'bewoner');
  const bodyHtml = `
      <div style="margin:0 0 24px">
        <span class="sf-logo-street" style="font-size:24px;font-weight:800;color:#1C1A18">Street</span><span style="font-size:24px;font-weight:800;color:#FF0066">feed</span>
      </div>
      <div class="sf-text" style="color:#1C1A18;font-size:16px;line-height:24px;margin:0 0 24px">
        <p style="margin:0 0 8px">Hoi ${safeName},</p>
        <p style="margin:0">Klik op de knop hieronder om in te loggen op Streetfeed. De link is <strong>15 minuten geldig</strong>.</p>
      </div>
      <div style="margin:0 0 24px">
        <a href="${url}" style="text-decoration:none">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
            <tr>
              <td bgcolor="#FF0066" style="background:#FF0066;border-radius:999px;padding:14px 28px" align="center">
                <font color="#ffffff" face="${EMAIL_FONT_STACK}"><b style="color:#ffffff;font-weight:500;font-size:16px;text-decoration:none">Inloggen op Streetfeed</b></font>
              </td>
            </tr>
          </table>
        </a>
      </div>
      <div class="sf-text" style="color:#1C1A18;font-size:12px;line-height:18px;margin:0 0 24px">
        Werkt de knop niet? Gebruik dan deze link:<br />
        <a href="${url}" class="sf-link" style="color:#7692CD;text-decoration:underline;word-break:break-all">${url}</a>
      </div>
      <div class="sf-callout" style="background:rgba(108,104,96,0.05);border-radius:20px;padding:16px;margin:0 0 24px">
        <div class="sf-text" style="color:#1C1A18;font-size:12px;line-height:18px">
          <p style="margin:0 0 8px"><strong>Gebruik je een iPhone?</strong><br />Pushmeldingen werken op iOS alleen als Streetfeed aan je beginscherm is toegevoegd.</p>
          <ol style="margin:0 0 8px;padding-left:18px">
            <li>Open Streetfeed.nl in Safari.</li>
            <li>Tik op het deel-icoon.</li>
            <li>Kies '<strong>Zet op beginscherm</strong>'.</li>
          </ol>
          <p style="margin:0 0 8px"><strong>Gebruik je een Android-toestel?</strong><br />Voeg Streetfeed toe aan je startscherm voor de snelste toegang.</p>
          <ol style="margin:0;padding-left:18px">
            <li>Open Streetfeed.nl in Chrome.</li>
            <li>Tik op het menu (⋮)</li>
            <li>Kies '<strong>Toevoegen aan startscherm</strong>'. Zie je 'App installeren'? Kies dan die optie.</li>
          </ol>
        </div>
      </div>
      <div class="sf-footer" style="color:#1C1A18;font-size:10px">
        Als je deze e-mail niet hebt aangevraagd, kun je dit bericht als niet verzonden beschouwen en negeren.
      </div>`;

  await sendEmail({
    to: email,
    subject: 'Jouw Streetfeed inloglink',
    html: emailDocument({ title: 'Streetfeed', bodyHtml }),
  });
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
      <a href="${url}" style="text-decoration:none">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:16px 0">
          <tr>
            <td bgcolor="#FF0066" style="background:#FF0066;border-radius:10px;padding:14px 28px" align="center">
              <font color="#ffffff" face="sans-serif"><b style="color:#ffffff;font-weight:700;font-size:15px;text-decoration:none">Open Streetfeed →</b></font>
            </td>
          </tr>
        </table>
      </a>
    </div>
  `;

  await sendEmail({ to: email, subject: 'Je aanvraag is goedgekeurd — welkom bij Streetfeed', html });
}
