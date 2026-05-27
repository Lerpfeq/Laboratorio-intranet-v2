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

/* ─────────── Transport Detection (with extensive logging) ─────────── */
type Transport = 'resend' | 'smtp' | 'none';

function detectTransport(): { transport: Transport; details: string } {
  const rawKey = process.env.RESEND_API_KEY;
  const rawPass = process.env.EMAIL_PASS;

  console.log(`[Email][${NOW()}] ┌─── detectTransport() ───`);
  console.log(`[Email][${NOW()}] │ RESEND_API_KEY env var:`);
  console.log(`[Email][${NOW()}] │   typeof    = ${typeof rawKey}`);
  console.log(`[Email][${NOW()}] │   undefined = ${rawKey === undefined}`);
  console.log(`[Email][${NOW()}] │   null      = ${rawKey === null}`);
  console.log(`[Email][${NOW()}] │   empty str = ${rawKey === ''}`);
  console.log(`[Email][${NOW()}] │   length    = ${rawKey?.length ?? 'N/A'}`);
  console.log(`[Email][${NOW()}] │   trimmed   = ${rawKey?.trim()?.length ?? 'N/A'}`);
  console.log(`[Email][${NOW()}] │   first 10  = "${rawKey?.slice(0, 10) ?? ''}"...`);
  console.log(`[Email][${NOW()}] │   starts re_= ${rawKey?.startsWith('re_') ?? false}`);
  console.log(`[Email][${NOW()}] │   truthy?   = ${!!rawKey}`);

  console.log(`[Email][${NOW()}] │ EMAIL_PASS env var:`);
  console.log(`[Email][${NOW()}] │   defined   = ${rawPass !== undefined}`);
  console.log(`[Email][${NOW()}] │   length    = ${rawPass?.length ?? 'N/A'}`);
  console.log(`[Email][${NOW()}] │   truthy?   = ${!!rawPass}`);

  // Check for trimming issues
  if (rawKey && rawKey !== rawKey.trim()) {
    console.warn(`[Email][${NOW()}] │ ⚠️ RESEND_API_KEY has leading/trailing whitespace!`);
    console.warn(`[Email][${NOW()}] │   raw length=${rawKey.length}, trimmed=${rawKey.trim().length}`);
  }

  let transport: Transport;
  let details: string;

  if (rawKey && rawKey.trim().length > 0) {
    transport = 'resend';
    details = `RESEND (key: ${rawKey.trim().slice(0, 10)}..., len=${rawKey.trim().length})`;
  } else if (rawPass && rawPass.trim().length > 0) {
    transport = 'smtp';
    details = `SMTP (EMAIL_PASS len=${rawPass.length})`;
  } else {
    transport = 'none';
    details = 'NONE — no RESEND_API_KEY or EMAIL_PASS configured';
  }

  console.log(`[Email][${NOW()}] │ ✅ Selected: ${transport.toUpperCase()} — ${details}`);
  console.log(`[Email][${NOW()}] └─── detectTransport() ───`);

  return { transport, details };
}

/* ─────────── Resend Client (with validation) ─────────── */
function getResendClient(): { client: Resend; key: string } | null {
  const rawKey = process.env.RESEND_API_KEY;
  if (!rawKey || rawKey.trim().length === 0) {
    console.log(`[Email][${NOW()}] getResendClient: NO KEY — returning null`);
    return null;
  }

  const key = rawKey.trim(); // Trim to handle accidental whitespace in env vars
  console.log(`[Email][${NOW()}] getResendClient: Creating Resend client`);
  console.log(`[Email][${NOW()}]   key prefix: "${key.slice(0, 10)}..."`);
  console.log(`[Email][${NOW()}]   key length: ${key.length}`);
  console.log(`[Email][${NOW()}]   starts with re_: ${key.startsWith('re_')}`);

  if (!key.startsWith('re_')) {
    console.warn(`[Email][${NOW()}]   ⚠️ WARNING: Resend API keys usually start with "re_" — this key starts with "${key.slice(0, 3)}"`);
  }

  return { client: new Resend(key), key };
}

/* ─────────── Gmail SMTP Transporter (legacy fallback) ─────────── */
function createSmtpTransporter() {
  const user = process.env.EMAIL_USER || 'lerpfeq@gmail.com';
  const pass = process.env.EMAIL_PASS || '';

  if (!pass) return null;

  console.log(`[Email][${NOW()}] SMTP transporter: user=${user}, port=587, secure=false, STARTTLS`);

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

/* ─────────── Timeout helper ─────────── */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[Email] ⏱️ ${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/* ─────────── Send ONE email via Resend (with full debug) ─────────── */
async function sendOneViaResend(
  resend: Resend,
  to: string,
  subject: string,
  html: string,
  fromAddress: string,
): Promise<{ ok: boolean; id?: string; error?: string; errorName?: string; statusCode?: number; ms: number }> {
  const startMs = Date.now();

  console.log(`[Email/Resend][${NOW()}] ┌─── sendOneViaResend ───`);
  console.log(`[Email/Resend][${NOW()}] │ FROM    : "${fromAddress}"`);
  console.log(`[Email/Resend][${NOW()}] │ TO      : "${to}"`);
  console.log(`[Email/Resend][${NOW()}] │ SUBJECT : "${subject.slice(0, 60)}..."`);
  console.log(`[Email/Resend][${NOW()}] │ HTML len: ${html.length} chars`);
  console.log(`[Email/Resend][${NOW()}] │ Calling resend.emails.send() NOW...`);

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html,
    });

    const ms = Date.now() - startMs;

    console.log(`[Email/Resend][${NOW()}] │ API call completed in ${ms}ms`);
    console.log(`[Email/Resend][${NOW()}] │ Raw result: ${JSON.stringify(result)}`);

    const { data, error } = result;

    if (error) {
      console.error(`[Email/Resend][${NOW()}] │ ❌ API returned error object:`);
      console.error(`[Email/Resend][${NOW()}] │   message   : ${error.message}`);
      console.error(`[Email/Resend][${NOW()}] │   name      : ${(error as any).name || 'N/A'}`);
      console.error(`[Email/Resend][${NOW()}] │   statusCode: ${(error as any).statusCode || 'N/A'}`);
      console.error(`[Email/Resend][${NOW()}] │   full error: ${JSON.stringify(error)}`);
      console.error(`[Email/Resend][${NOW()}] └─── sendOneViaResend (FAILED) ───`);

      return {
        ok: false,
        error: error.message,
        errorName: (error as any).name,
        statusCode: (error as any).statusCode,
        ms,
      };
    }

    console.log(`[Email/Resend][${NOW()}] │ ✅ SUCCESS`);
    console.log(`[Email/Resend][${NOW()}] │   id: ${data?.id}`);
    console.log(`[Email/Resend][${NOW()}] │   full data: ${JSON.stringify(data)}`);
    console.log(`[Email/Resend][${NOW()}] └─── sendOneViaResend (OK ${ms}ms) ───`);

    return { ok: true, id: data?.id, ms };
  } catch (err: any) {
    const ms = Date.now() - startMs;

    console.error(`[Email/Resend][${NOW()}] │ ❌ EXCEPTION thrown:`);
    console.error(`[Email/Resend][${NOW()}] │   message   : ${err?.message}`);
    console.error(`[Email/Resend][${NOW()}] │   name      : ${err?.name}`);
    console.error(`[Email/Resend][${NOW()}] │   statusCode: ${err?.statusCode}`);
    console.error(`[Email/Resend][${NOW()}] │   code      : ${err?.code}`);
    console.error(`[Email/Resend][${NOW()}] │   status    : ${err?.status}`);
    console.error(`[Email/Resend][${NOW()}] │   type      : ${typeof err}`);
    console.error(`[Email/Resend][${NOW()}] │   keys      : ${err ? Object.keys(err).join(', ') : 'N/A'}`);

    // Try to get more details from the error
    try {
      console.error(`[Email/Resend][${NOW()}] │   JSON      : ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
    } catch {
      console.error(`[Email/Resend][${NOW()}] │   toString  : ${String(err)}`);
    }

    console.error(`[Email/Resend][${NOW()}] │   stack     : ${err?.stack?.split('\n').slice(0, 3).join(' | ')}`);
    console.error(`[Email/Resend][${NOW()}] └─── sendOneViaResend (EXCEPTION ${ms}ms) ───`);

    return {
      ok: false,
      error: err?.message || String(err),
      errorName: err?.name,
      statusCode: err?.statusCode || err?.status,
      ms,
    };
  }
}

/* ─────────── Send ONE email via SMTP (legacy fallback) ─────────── */
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
    const info = await withTimeout(
      transporter.sendMail({ from, to, subject, html }),
      20000,
      `sendMail(${to})`
    );
    const ms = Date.now() - startMs;
    console.log(`[Email/SMTP][${NOW()}] ✅ Sent to ${to} in ${ms}ms — messageId: ${info.messageId}`);
    return { ok: true, messageId: info.messageId, ms };
  } catch (err: any) {
    const ms = Date.now() - startMs;
    console.error(`[Email/SMTP][${NOW()}] ❌ Failed for ${to} after ${ms}ms: ${err?.message}`);
    return { ok: false, error: err?.message || String(err), ms };
  }
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

  // ── Detect transport with full logging ──
  const { transport, details } = detectTransport();

  console.log(`║ Transport  : ${details}`);
  console.log(`║ Equipment  : ${data.equipamentoNome}`);
  console.log(`║ isExterno  : ${isExterno}`);
  console.log(`║ Creator    : ${data.criadoPor} <${data.criadoPorEmail}>`);
  console.log(`║ Target     : ${data.paraQuem} <${data.paraQuemEmail || 'N/A'}>`);
  console.log(`║ Advisor    : ${data.emailOrientador || 'N/A'}`);
  console.log(`║ Managers   : ${responsavelEmails.length} [${responsavelEmails.join(', ')}]`);

  if (transport === 'none') {
    console.log('║');
    console.log('║ ❌ NO EMAIL TRANSPORT CONFIGURED!');
    console.log('║ ❌ Set RESEND_API_KEY in Render environment variables');
    console.log('║ ❌ Current state of env vars:');
    console.log(`║    RESEND_API_KEY = ${process.env.RESEND_API_KEY === undefined ? 'UNDEFINED' : process.env.RESEND_API_KEY === '' ? 'EMPTY STRING' : `"${process.env.RESEND_API_KEY?.slice(0, 5)}..." (len=${process.env.RESEND_API_KEY?.length})`}`);
    console.log(`║    EMAIL_PASS     = ${process.env.EMAIL_PASS === undefined ? 'UNDEFINED' : process.env.EMAIL_PASS === '' ? 'EMPTY STRING' : `SET (len=${process.env.EMAIL_PASS?.length})`}`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
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
  console.log(`║ Total unique recipients: ${recipientList.length}`);

  if (recipientList.length === 0) {
    console.log('║ ⚠️ No recipients — skipping');
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

  const html = formatEmailHtml(data, googleCalLink);
  const subject = `📅 LERP — Scheduling Confirmed: ${data.equipamentoNome} — ${data.inicio}`;

  // ── FROM address ──
  // HARDCODED to onboarding@resend.dev — Resend's free test sender that works without domain verification
  // To use a custom domain: verify it in Resend dashboard, then set RESEND_FROM_EMAIL env var
  const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'LERP <onboarding@resend.dev>';
  console.log(`║ FROM (Resend): "${RESEND_FROM}"`);
  const SMTP_FROM = `"LERP — FEQ/UNICAMP" <${process.env.EMAIL_USER || 'lerpfeq@gmail.com'}>`;

  // ── SEND ──
  const results: { email: string; ok: boolean; error?: string; id?: string; ms: number }[] = [];
  const batchStart = Date.now();

  if (transport === 'resend') {
    const resendResult = getResendClient();
    if (!resendResult) {
      console.error(`║ ❌ CRITICAL: detectTransport said 'resend' but getResendClient returned null!`);
      console.error(`║    RESEND_API_KEY = "${process.env.RESEND_API_KEY}"`);
      console.log('╚══════════════════════════════════════════════════════════════╝');
      return;
    }

    const { client: resend, key } = resendResult;
    console.log(`║`);
    console.log(`║ 🚀 USING RESEND API`);
    console.log(`║   API key  : "${key.slice(0, 10)}..." (${key.length} chars)`);
    console.log(`║   FROM     : "${RESEND_FROM}"`);
    console.log(`║   Subject  : "${subject.slice(0, 60)}..."`);
    console.log(`║   HTML len : ${html.length} chars`);
    console.log(`║`);

    for (const email of recipientList) {
      console.log(`║ ═══ Sending to: ${email} ═══`);
      const r = await sendOneViaResend(resend, email, subject, html, RESEND_FROM);
      results.push({ email, ok: r.ok, error: r.error, id: r.id, ms: r.ms });

      if (!r.ok) {
        console.error(`║ ❌ RESEND SEND FAILED for ${email}:`);
        console.error(`║    error     : ${r.error}`);
        console.error(`║    errorName : ${r.errorName}`);
        console.error(`║    statusCode: ${r.statusCode}`);
        console.error(`║    time      : ${r.ms}ms`);

        // Diagnose common Resend errors
        if (r.error?.includes('API key is invalid') || r.statusCode === 401 || r.statusCode === 403) {
          console.error('║    🔍 DIAGNOSIS: API key is invalid or expired. Regenerate at resend.com/api-keys');
        } else if (r.error?.includes('not verified') || r.error?.includes('not allowed') || r.error?.includes('domain')) {
          console.error('║    🔍 DIAGNOSIS: FROM domain not verified. Use "onboarding@resend.dev" or verify your domain');
        } else if (r.error?.includes('rate limit') || r.statusCode === 429) {
          console.error('║    🔍 DIAGNOSIS: Rate limited. Wait and retry, or upgrade Resend plan');
        } else if (r.error?.includes('validation') || r.statusCode === 422) {
          console.error('║    🔍 DIAGNOSIS: Validation error. Check FROM/TO email format');
        }
      }
    }
  } else {
    // SMTP fallback
    const transporter = createSmtpTransporter()!;
    console.log(`║ Using SMTP fallback (from: ${SMTP_FROM})`);
    console.log('║ ⚠️ SMTP may fail if Render blocks port 587');

    for (const email of recipientList) {
      console.log(`║ ═══ Sending to: ${email} ═══`);
      const r = await sendOneViaSmtp(transporter, email, subject, html, SMTP_FROM);
      results.push({ email, ok: r.ok, error: r.error, id: r.messageId, ms: r.ms });
    }
    transporter.close();
  }

  const batchMs = Date.now() - batchStart;
  const okCount = results.filter(r => r.ok).length;
  const failCount = results.length - okCount;

  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║ 📊 BATCH SUMMARY`);
  console.log(`║    Transport : ${transport.toUpperCase()}`);
  console.log(`║    Total     : ${results.length}`);
  console.log(`║    ✅ Sent   : ${okCount}`);
  console.log(`║    ❌ Failed : ${failCount}`);
  console.log(`║    Time      : ${batchMs}ms`);
  if (failCount > 0) {
    console.log('║    Failed details:');
    for (const r of results.filter(r => !r.ok)) {
      console.error(`║      ❌ ${r.email}: ${r.error}`);
    }
  }
  if (okCount > 0) {
    console.log('║    Sent details:');
    for (const r of results.filter(r => r.ok)) {
      console.log(`║      ✅ ${r.email} (id: ${r.id}, ${r.ms}ms)`);
    }
  }
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}
