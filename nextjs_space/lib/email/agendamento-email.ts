// ════════════════════════════════════════════════════════════════════════
// Email notification utility for LERP equipment bookings
//
// TRANSPORT STRATEGY (priority order):
//   1. SendGrid (SENDGRID_API_KEY) — HTTP API, works everywhere, any recipient ✅
//   2. Resend (RESEND_API_KEY) — HTTP API, but requires domain for other recipients
//   3. Gmail SMTP (EMAIL_USER + EMAIL_PASS) — BLOCKED on Render.com
//
// WHY SENDGRID?
//   Render.com blocks outbound SMTP ports (465 & 587). SendGrid uses HTTPS
//   API calls instead, so it works on Render. Free tier: 100 emails/day.
//   Only requires Single Sender Verification (no domain needed) — just verify
//   lerpfeq@gmail.com as a sender at sendgrid.com/ui/account/sender-management
// ════════════════════════════════════════════════════════════════════════

import { Resend } from 'resend';
import nodemailer from 'nodemailer';

/* ─────────── Types ─────────── */
interface BookingEmailData {
  equipamentoNome: string;
  sopLink?: string | null;
  inicio: string;          // Already formatted "dd/mm/yyyy HH:mm"
  fim: string;
  criadoPor: string;
  criadoPorEmail: string;
  paraQuem: string;
  paraQuemEmail?: string;
  emailOrientador?: string | null;
  observacoes?: string | null;
  inicioRaw?: string;      // ISO string
  fimRaw?: string;
}

/* ─────────── Timestamp helper ─────────── */
const NOW = () => new Date().toISOString();

/* ─────────── Transport Detection ─────────── */
type Transport = 'sendgrid' | 'resend' | 'smtp' | 'none';

function detectTransport(): { transport: Transport; details: string } {
  const sgKey   = process.env.SENDGRID_API_KEY;
  const rawKey  = process.env.RESEND_API_KEY;
  const rawPass = process.env.EMAIL_PASS;

  console.log(`[Email][${NOW()}] ┌─── detectTransport() ───`);
  console.log(`[Email][${NOW()}] │ SENDGRID_API_KEY defined: ${!!sgKey}, len: ${sgKey?.length ?? 'N/A'}`);
  console.log(`[Email][${NOW()}] │ RESEND_API_KEY   defined: ${!!rawKey}, len: ${rawKey?.length ?? 'N/A'}`);
  console.log(`[Email][${NOW()}] │ EMAIL_PASS       defined: ${!!rawPass}, len: ${rawPass?.length ?? 'N/A'}`);

  let transport: Transport;
  let details: string;

  if (sgKey && sgKey.trim().length > 0) {
    transport = 'sendgrid';
    details = `SENDGRID (key: ${sgKey.trim().slice(0, 10)}..., len=${sgKey.trim().length})`;
  } else if (rawKey && rawKey.trim().length > 0) {
    transport = 'resend';
    details = `RESEND (key: ${rawKey.trim().slice(0, 10)}..., len=${rawKey.trim().length})`;
  } else if (rawPass && rawPass.trim().length > 0) {
    transport = 'smtp';
    details = `SMTP (EMAIL_PASS len=${rawPass.length}) — ⚠️ BLOCKED on Render`;
  } else {
    transport = 'none';
    details = 'NONE — no SENDGRID_API_KEY, RESEND_API_KEY, or EMAIL_PASS configured';
  }

  console.log(`[Email][${NOW()}] │ ✅ Selected: ${transport.toUpperCase()} — ${details}`);
  console.log(`[Email][${NOW()}] └─── detectTransport() ───`);

  return { transport, details };
}

/* ─────────── Send via SendGrid HTTP API (with optional CC) ─────────── */
async function sendOneViaSendGrid(
  to: string,
  subject: string,
  html: string,
  fromEmail: string,
  fromName: string,
  cc?: string[],
): Promise<{ ok: boolean; id?: string; error?: string; ms: number }> {
  const startMs = Date.now();
  const apiKey = process.env.SENDGRID_API_KEY!.trim();

  console.log(`[Email/SendGrid][${NOW()}] Sending to: ${to}${cc?.length ? ` | CC: ${cc.join(', ')}` : ''}`);

  const personalization: any = { to: [{ email: to }] };
  if (cc && cc.length > 0) {
    personalization.cc = cc.map(e => ({ email: e }));
  }

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [personalization],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    const ms = Date.now() - startMs;

    if (res.status === 202) {
      const msgId = res.headers.get('x-message-id') || undefined;
      console.log(`[Email/SendGrid][${NOW()}] ✅ Sent in ${ms}ms — id: ${msgId}`);
      return { ok: true, id: msgId, ms };
    }

    let errBody = '';
    try { errBody = await res.text(); } catch {}
    console.error(`[Email/SendGrid][${NOW()}] ❌ HTTP ${res.status}: ${errBody}`);
    return { ok: false, error: `HTTP ${res.status}: ${errBody.slice(0, 200)}`, ms };

  } catch (err: any) {
    const ms = Date.now() - startMs;
    console.error(`[Email/SendGrid][${NOW()}] ❌ Exception: ${err?.message}`);
    return { ok: false, error: err?.message || String(err), ms };
  }
}

/* ─────────── Resend Client ─────────── */
function getResendClient(): { client: Resend; key: string } | null {
  const rawKey = process.env.RESEND_API_KEY;
  if (!rawKey || rawKey.trim().length === 0) return null;
  const key = rawKey.trim();
  return { client: new Resend(key), key };
}

/* ─────────── Send via Resend ─────────── */
async function sendOneViaResend(
  resend: Resend,
  to: string,
  subject: string,
  html: string,
  fromAddress: string,
): Promise<{ ok: boolean; id?: string; error?: string; ms: number }> {
  const startMs = Date.now();
  console.log(`[Email/Resend][${NOW()}] Sending to: ${to}`);

  try {
    const result = await resend.emails.send({ from: fromAddress, to: [to], subject, html });
    const ms = Date.now() - startMs;
    const { data, error } = result;
    if (error) {
      console.error(`[Email/Resend][${NOW()}] ❌ ${error.message} (${ms}ms)`);
      return { ok: false, error: error.message, ms };
    }
    console.log(`[Email/Resend][${NOW()}] ✅ Sent in ${ms}ms — id: ${data?.id}`);
    return { ok: true, id: data?.id, ms };
  } catch (err: any) {
    const ms = Date.now() - startMs;
    console.error(`[Email/Resend][${NOW()}] ❌ Exception: ${err?.message} (${ms}ms)`);
    return { ok: false, error: err?.message || String(err), ms };
  }
}

/* ─────────── Gmail SMTP Transporter (legacy / blocked on Render) ─────────── */
function createSmtpTransporter() {
  const user = process.env.EMAIL_USER || 'lerpfeq@gmail.com';
  const pass = process.env.EMAIL_PASS || '';
  if (!pass) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
    tls: { rejectUnauthorized: false },
  });
}

async function sendOneViaSmtp(
  transporter: nodemailer.Transporter,
  to: string,
  subject: string,
  html: string,
  from: string,
): Promise<{ ok: boolean; messageId?: string; error?: string; ms: number }> {
  const startMs = Date.now();
  console.log(`[Email/SMTP][${NOW()}] Sending to ${to}...`);
  try {
    const info = await Promise.race([
      transporter.sendMail({ from, to, subject, html }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SMTP timeout after 20s')), 20000)
      ),
    ]);
    const ms = Date.now() - startMs;
    console.log(`[Email/SMTP][${NOW()}] ✅ Sent in ${ms}ms — id: ${info.messageId}`);
    return { ok: true, messageId: info.messageId, ms };
  } catch (err: any) {
    const ms = Date.now() - startMs;
    console.error(`[Email/SMTP][${NOW()}] ❌ ${err?.message} (${ms}ms)`);
    return { ok: false, error: err?.message || String(err), ms };
  }
}

/* ─────────── Google Calendar Link ─────────── */
function generateGoogleCalendarLink(
  title: string,
  description: string,
  startISO: string,
  endISO: string,
  location: string = ''
): string {
  const fmt = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    dates: `${fmt(startISO)}/${fmt(endISO)}`,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/* ─────────── HTML Template ─────────── */
function formatEmailHtml(data: BookingEmailData, googleCalLink: string | null): string {
  const sopSection = data.sopLink
    ? `<tr style="border-bottom:1px solid #eee;">
         <td style="padding:12px;font-weight:bold;color:#555;width:35%;">📋 SOP</td>
         <td style="padding:12px;"><a href="${data.sopLink}" style="color:#4285f4;" target="_blank">View SOP</a></td>
       </tr>`
    : '';

  const notesSection = data.observacoes
    ? `<tr style="border-bottom:1px solid #eee;">
         <td style="padding:12px;font-weight:bold;color:#555;">📝 Notes</td>
         <td style="padding:12px;color:#333;">${data.observacoes}</td>
       </tr>`
    : '';

  const calendarButton = googleCalLink
    ? `<div style="text-align:center;margin:25px 0;">
         <a href="${googleCalLink}" target="_blank"
            style="display:inline-block;background:#4285f4;color:white;padding:14px 28px;
                   text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
           📅 Add to Google Calendar
         </a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <div style="max-width:600px;margin:20px auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;">📅 Scheduling Confirmed</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0 0;font-size:14px;">
        LERP — Laboratory of Engineering of Polymeric Reactions
      </p>
    </div>
    <div style="padding:25px 30px;">
      <p style="font-size:16px;color:#333;">Hello <strong>${data.paraQuem}</strong>,</p>
      <p style="color:#555;">Your equipment scheduling has been confirmed. Details below:</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:12px;font-weight:bold;color:#555;width:35%;">🔬 Equipment</td>
          <td style="padding:12px;color:#333;font-weight:bold;">${data.equipamentoNome}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:12px;font-weight:bold;color:#555;">🕐 Start</td>
          <td style="padding:12px;color:#333;">${data.inicio}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:12px;font-weight:bold;color:#555;">🕑 End</td>
          <td style="padding:12px;color:#333;">${data.fim}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:12px;font-weight:bold;color:#555;">👤 Booked by</td>
          <td style="padding:12px;color:#333;">${data.criadoPor} (${data.criadoPorEmail})</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:12px;font-weight:bold;color:#555;">👥 For</td>
          <td style="padding:12px;color:#333;">${data.paraQuem}${data.paraQuemEmail ? ` (${data.paraQuemEmail})` : ''}</td>
        </tr>
        ${notesSection}
        ${sopSection}
      </table>
      ${calendarButton}
      <p style="color:#888;font-size:13px;margin-top:20px;">
        <strong>Important:</strong> Please arrive 5 minutes before your scheduled time.
        If you need to cancel or reschedule, please do so through the intranet.
      </p>
    </div>
    <div style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;color:#666;font-size:14px;font-weight:bold;">LERP — FEQ/UNICAMP</p>
      <p style="margin:4px 0 0 0;color:#999;font-size:12px;">
        Laboratório de Engenharia de Reações Poliméricas — Prof. Dr. Roniérik Pioli Vieira
      </p>
      <p style="margin:8px 0 0 0;color:#bbb;font-size:11px;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/* ═════════════════════════════════════════════════════════════════════
   MAIN EXPORT — sendAgendamentoEmails()
   ═════════════════════════════════════════════════════════════════════ */
export async function sendAgendamentoEmails(
  data: BookingEmailData,
  responsavelEmails: string[],
  isExterno: boolean
): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   📧 sendAgendamentoEmails() CALLED                         ║');
  console.log(`║   ${NOW()}                                    ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const { transport, details } = detectTransport();
  console.log(`║ Transport  : ${details}`);
  console.log(`║ Equipment  : ${data.equipamentoNome}`);
  console.log(`║ isExterno  : ${isExterno}`);
  console.log(`║ Creator    : ${data.criadoPor} <${data.criadoPorEmail}>`);
  console.log(`║ Target     : ${data.paraQuem} <${data.paraQuemEmail || 'N/A'}>`);
  console.log(`║ Advisor    : ${data.emailOrientador || 'N/A'}`);
  console.log(`║ Managers   : ${responsavelEmails.length} [${responsavelEmails.join(', ')}]`);

  if (transport === 'none') {
    console.log('║ ❌ NO EMAIL TRANSPORT CONFIGURED!');
    console.log('║ ❌ Add SENDGRID_API_KEY to Render environment variables');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    return;
  }

  // ── Determine TO and CC ──
  // TO  : the person who was booked (internal email or external email)
  // CC  : advisor email (only for external users)
  const toEmail = data.paraQuemEmail?.trim();
  const ccEmails: string[] = [];
  if (isExterno && data.emailOrientador?.trim()) {
    ccEmails.push(data.emailOrientador.trim());
  }

  console.log(`║ TO  : ${toEmail || '(none)'}`);
  console.log(`║ CC  : ${ccEmails.length > 0 ? ccEmails.join(', ') : '(none)'}`);

  if (!toEmail) {
    console.log('║ ⚠️ No TO recipient — skipping email');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    return;
  }

  // ── Google Calendar link ──
  let googleCalLink: string | null = null;
  if (data.inicioRaw && data.fimRaw) {
    const desc = [
      `Equipment: ${data.equipamentoNome}`,
      `Booked by: ${data.criadoPor}`,
      `For: ${data.paraQuem}`,
      data.observacoes ? `Notes: ${data.observacoes}` : '',
    ].filter(Boolean).join('\n');
    googleCalLink = generateGoogleCalendarLink(
      `LERP — ${data.equipamentoNome}`, desc,
      data.inicioRaw, data.fimRaw, 'LERP — FEQ/UNICAMP'
    );
  }

  const html    = formatEmailHtml(data, googleCalLink);
  const subject = `📅 LERP — Scheduling Confirmed: ${data.equipamentoNome} — ${data.inicio}`;
  const FROM_EMAIL  = process.env.EMAIL_USER || 'lerpfeq@gmail.com';
  const FROM_NAME   = 'LERP — FEQ/UNICAMP';
  const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'LERP <onboarding@resend.dev>';
  const SMTP_FROM   = `"${FROM_NAME}" <${FROM_EMAIL}>`;

  const results: { email: string; ok: boolean; error?: string; id?: string; ms: number }[] = [];
  const batchStart = Date.now();

  console.log(`║ ═══ Sending to: ${toEmail}${ccEmails.length ? ` (CC: ${ccEmails.join(', ')})` : ''} ═══`);

  if (transport === 'sendgrid') {
    const r = await sendOneViaSendGrid(toEmail, subject, html, FROM_EMAIL, FROM_NAME, ccEmails.length > 0 ? ccEmails : undefined);
    results.push({ email: toEmail, ok: r.ok, error: r.error, id: r.id, ms: r.ms });

  } else if (transport === 'resend') {
    // Resend: send TO first, then CC separately (Resend free doesn't support CC natively)
    const resendResult = getResendClient();
    if (!resendResult) {
      results.push({ email: toEmail, ok: false, error: 'Resend client unavailable', ms: 0 });
    } else {
      const r = await sendOneViaResend(resendResult.client, toEmail, subject, html, RESEND_FROM);
      results.push({ email: toEmail, ok: r.ok, error: r.error, id: r.id, ms: r.ms });
      // Send CC separately
      for (const ccEmail of ccEmails) {
        const rc = await sendOneViaResend(resendResult.client, ccEmail, `[CC] ${subject}`, html, RESEND_FROM);
        results.push({ email: ccEmail, ok: rc.ok, error: rc.error, id: rc.id, ms: rc.ms });
      }
    }

  } else {
    // SMTP — will fail on Render (ports blocked)
    const transporter = createSmtpTransporter();
    if (!transporter) {
      results.push({ email: toEmail, ok: false, error: 'No SMTP credentials', ms: 0 });
    } else {
      const r = await sendOneViaSmtp(transporter, toEmail, subject, html, SMTP_FROM);
      results.push({ email: toEmail, ok: r.ok, error: r.error, id: r.messageId, ms: r.ms });
      transporter.close();
    }
  }

  const batchMs  = Date.now() - batchStart;
  const okCount  = results.filter(r => r.ok).length;
  const failCount = results.length - okCount;

  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║ 📊 BATCH SUMMARY — Transport: ${transport.toUpperCase()}`);
  console.log(`║    Total: ${results.length} | ✅ Sent: ${okCount} | ❌ Failed: ${failCount} | Time: ${batchMs}ms`);
  for (const r of results) {
    if (r.ok) console.log(`║    ✅ ${r.email} (${r.ms}ms)`);
    else      console.error(`║    ❌ ${r.email}: ${r.error}`);
  }
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}
