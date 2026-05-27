// ════════════════════════════════════════════════════════════════════════
// Email notification utility for LERP equipment bookings
//
// TRANSPORT STRATEGY (priority order):
//   1. Resend (RESEND_API_KEY) — HTTP API, works everywhere (recommended)
//   2. Gmail SMTP (EMAIL_USER + EMAIL_PASS) — legacy fallback
//
// WHY RESEND?
//   Render.com blocks outbound SMTP ports (465 & 587). Resend uses HTTPS
//   API calls instead, so it works on any cloud platform without firewall
//   issues. Free tier: 100 emails/day — more than enough for a lab intranet.
//
// HOW TO SET UP RESEND:
//   1. Create free account at https://resend.com
//   2. Go to API Keys → Create API Key
//   3. Add RESEND_API_KEY to Render environment variables
//   4. (Optional) Verify a custom domain for branded "from" addresses
//      Without a verified domain, use "onboarding@resend.dev" as sender
//
// NOTE: With Resend, EMAIL_USER / EMAIL_PASS are no longer needed.
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
  // Raw dates for Google Calendar link
  inicioRaw?: string;      // ISO string
  fimRaw?: string;
}

/* ─────────── Transport Detection ─────────── */
type Transport = 'resend' | 'smtp' | 'none';

function detectTransport(): Transport {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.EMAIL_PASS) return 'smtp';
  return 'none';
}

/* ─────────── Resend Client ─────────── */
function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

/* ─────────── Gmail SMTP Transporter (legacy fallback) ─────────── */
function createSmtpTransporter() {
  const user = process.env.EMAIL_USER || 'lerpfeq@gmail.com';
  const pass = process.env.EMAIL_PASS || '';

  if (!pass) return null;

  console.log(`[Email] SMTP fallback: user=${user}, port=587, STARTTLS`);

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

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <div style="max-width:600px;margin:20px auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;">📅 Scheduling Confirmed</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0 0;font-size:14px;">
        LERP — Laboratory of Engineering of Polymeric Reactions
      </p>
    </div>

    <!-- Body -->
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

    <!-- Footer -->
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

/* ─────────── Timeout helper ─────────── */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[Email] ⏱️ ${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/* ─────────── Send via Resend ─────────── */
async function sendViaResend(
  resend: Resend,
  to: string,
  subject: string,
  html: string,
  fromAddress: string,
): Promise<{ ok: boolean; id?: string; error?: string; ms: number }> {
  const startMs = Date.now();
  try {
    // Resend requires a verified domain OR use "onboarding@resend.dev" for testing.
    // If EMAIL_USER is set and domain is verified in Resend, we use it.
    // Otherwise default to onboarding@resend.dev which Resend provides for free.
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html,
    });

    const ms = Date.now() - startMs;

    if (error) {
      console.error(`[Email/Resend] ❌ API error for ${to}: ${error.message}`);
      return { ok: false, error: error.message, ms };
    }

    console.log(`[Email/Resend] ✅ Sent to ${to} in ${ms}ms — id: ${data?.id}`);
    return { ok: true, id: data?.id, ms };
  } catch (err: any) {
    const ms = Date.now() - startMs;
    console.error(`[Email/Resend] ❌ Exception for ${to}: ${err?.message}`);
    return { ok: false, error: err?.message || String(err), ms };
  }
}

/* ─────────── Send via SMTP (legacy fallback) ─────────── */
async function sendViaSmtp(
  transporter: nodemailer.Transporter,
  to: string,
  subject: string,
  html: string,
  from: string,
): Promise<{ ok: boolean; messageId?: string; error?: string; ms: number }> {
  const startMs = Date.now();
  try {
    const info = await withTimeout(
      transporter.sendMail({ from, to, subject, html }),
      20000,
      `sendMail(${to})`
    );
    const ms = Date.now() - startMs;
    console.log(`[Email/SMTP] ✅ Sent to ${to} in ${ms}ms — messageId: ${info.messageId}`);
    return { ok: true, messageId: info.messageId, ms };
  } catch (err: any) {
    const ms = Date.now() - startMs;
    console.error(`[Email/SMTP] ❌ Failed for ${to} after ${ms}ms: ${err?.message}`);
    return { ok: false, error: err?.message || String(err), ms };
  }
}

/* ═════════════════════════════════════════════════════════════════════
   MAIN EXPORT — sendAgendamentoEmails()
   Same signature as before — drop-in replacement.
   ═════════════════════════════════════════════════════════════════════ */
export async function sendAgendamentoEmails(
  data: BookingEmailData,
  responsavelEmails: string[],
  isExterno: boolean
): Promise<void> {
  const transport = detectTransport();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   📧 sendAgendamentoEmails()                            ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║ Timestamp  : ${new Date().toISOString()}`);
  console.log(`║ Transport  : ${transport.toUpperCase()}${transport === 'resend' ? ' ✅ (recommended)' : transport === 'smtp' ? ' ⚠️ (legacy)' : ' ❌'}`);
  console.log(`║ Equipment  : ${data.equipamentoNome}`);
  console.log(`║ isExterno  : ${isExterno}`);
  console.log(`║ Creator    : ${data.criadoPor} <${data.criadoPorEmail}>`);
  console.log(`║ Target     : ${data.paraQuem} <${data.paraQuemEmail || 'N/A'}>`);
  console.log(`║ Advisor    : ${data.emailOrientador || 'N/A'}`);
  console.log(`║ Managers   : ${responsavelEmails.length} [${responsavelEmails.join(', ')}]`);

  if (transport === 'none') {
    console.log('║ ❌ No email transport configured!');
    console.log('║   Set RESEND_API_KEY (recommended) or EMAIL_PASS (legacy)');
    console.log('╚══════════════════════════════════════════════════════════╝');
    return;
  }

  // ── Collect recipients ──
  const recipients = new Set<string>();

  if (data.criadoPorEmail) {
    recipients.add(data.criadoPorEmail);
    console.log(`║ + Creator : ${data.criadoPorEmail}`);
  }
  if (data.paraQuemEmail) {
    recipients.add(data.paraQuemEmail);
    console.log(`║ + Target  : ${data.paraQuemEmail}`);
  }
  for (const email of responsavelEmails) {
    if (email) {
      recipients.add(email);
      console.log(`║ + Manager : ${email}`);
    }
  }
  if (isExterno && data.emailOrientador) {
    recipients.add(data.emailOrientador);
    console.log(`║ + Advisor : ${data.emailOrientador}`);
  }

  const recipientList = Array.from(recipients);
  console.log(`║ Recipients : ${recipientList.length} unique`);

  if (recipientList.length === 0) {
    console.log('║ ⚠️ No recipients — skipping');
    console.log('╚══════════════════════════════════════════════════════════╝');
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
      `LERP — ${data.equipamentoNome}`,
      desc,
      data.inicioRaw,
      data.fimRaw,
      'LERP — FEQ/UNICAMP'
    );
    console.log('║ Calendar link generated ✅');
  }

  const html = formatEmailHtml(data, googleCalLink);
  const subject = `📅 LERP — Scheduling Confirmed: ${data.equipamentoNome} — ${data.inicio}`;

  // ── Determine "from" address ──
  // Resend: use onboarding@resend.dev (always works) OR a verified domain
  // SMTP: use EMAIL_USER
  const resendFrom = process.env.RESEND_FROM_EMAIL
    || 'LERP — FEQ/UNICAMP <onboarding@resend.dev>';
  const smtpFrom = `"LERP — FEQ/UNICAMP" <${process.env.EMAIL_USER || 'lerpfeq@gmail.com'}>`;

  // ── SEND ──
  const results: { email: string; ok: boolean; error?: string; id?: string; ms: number }[] = [];
  const batchStart = Date.now();

  if (transport === 'resend') {
    const resend = getResendClient()!;
    console.log(`║ Using Resend API (from: ${resendFrom})`);

    for (const email of recipientList) {
      console.log(`║ ─── 📤 ${email} ───`);
      const r = await sendViaResend(resend, email, subject, html, resendFrom);
      results.push({ email, ...r });
    }
  } else {
    // SMTP fallback
    const transporter = createSmtpTransporter()!;
    console.log(`║ Using SMTP fallback (from: ${smtpFrom})`);
    console.log('║ ⚠️ SMTP may fail if Render blocks port 587');

    for (const email of recipientList) {
      console.log(`║ ─── 📤 ${email} ───`);
      const r = await sendViaSmtp(transporter, email, subject, html, smtpFrom);
      results.push({ email, ok: r.ok, error: r.error, id: r.messageId, ms: r.ms });
    }
    transporter.close();
  }

  const batchMs = Date.now() - batchStart;
  const ok = results.filter(r => r.ok).length;
  const fail = results.length - ok;

  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║ 📊 SUMMARY: ${ok}/${results.length} sent, ${fail} failed (${batchMs}ms)`);
  if (fail > 0) {
    for (const r of results.filter(r => !r.ok)) {
      console.error(`║   ❌ ${r.email}: ${r.error}`);
    }
  }
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
}
