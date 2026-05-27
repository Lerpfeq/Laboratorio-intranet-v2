// Email notification utility for equipment bookings
// Uses Gmail SMTP via nodemailer — includes Google Calendar link
// Failures do NOT cancel the booking (fire-and-forget)

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

/* ─────────── Gmail Transporter ─────────── */
function createTransporter() {
  const user = process.env.EMAIL_USER || 'lerpfeq@gmail.com';
  const pass = process.env.EMAIL_PASS || '';

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║        [Email] createTransporter()                  ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║ EMAIL_USER  = "${user}"`);
  console.log(`║ EMAIL_PASS  = ${pass ? `SET (length=${pass.length}, first3="${pass.slice(0,3)}", last3="${pass.slice(-3)}")` : '⚠️ EMPTY / UNDEFINED'}`);
  console.log(`║ Has spaces? = ${pass.includes(' ') ? '⚠️ YES — this may cause auth failure!' : '✅ No spaces'}`);
  console.log(`║ NODE_ENV    = ${process.env.NODE_ENV || '(not set)'}`);

  if (!pass) {
    console.log('║ ❌ EMAIL_PASS not configured — emails will be SKIPPED');
    console.log('╚══════════════════════════════════════════════════════╝');
    return null;
  }

  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false,
    },
    debug: true,   // enable SMTP protocol debug output
    logger: true,  // log SMTP traffic to console
  };

  console.log(`║ Config: host=${config.host}, port=${config.port}, secure=${config.secure}`);
  console.log(`║ Timeouts: conn=${config.connectionTimeout}ms, greet=${config.greetingTimeout}ms, sock=${config.socketTimeout}ms`);
  console.log(`║ TLS: rejectUnauthorized=${config.tls.rejectUnauthorized}`);
  console.log(`║ Debug: ${config.debug}, Logger: ${config.logger}`);
  console.log('╚══════════════════════════════════════════════════════╝');

  return nodemailer.createTransport(config);
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

/* ─────────── Main Send Function ─────────── */
export async function sendAgendamentoEmails(
  data: BookingEmailData,
  responsavelEmails: string[],
  isExterno: boolean
): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   📧 sendAgendamentoEmails() CALLED                     ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║ Timestamp : ${new Date().toISOString()}`);
  console.log(`║ Equipment : ${data.equipamentoNome}`);
  console.log(`║ isExterno : ${isExterno}`);
  console.log(`║ Creator   : ${data.criadoPor} <${data.criadoPorEmail}>`);
  console.log(`║ Target    : ${data.paraQuem} <${data.paraQuemEmail || 'N/A'}>`);
  console.log(`║ Advisor   : ${data.emailOrientador || 'N/A'}`);
  console.log(`║ Responsáveis count: ${responsavelEmails.length}`);
  console.log('╠══════════════════════════════════════════════════════════╣');

  const transporter = createTransporter();

  if (!transporter) {
    console.log('║ ❌ Transporter is NULL — emails will be SKIPPED');
    console.log('║ This means EMAIL_PASS env var is EMPTY or UNDEFINED');
    console.log('╚══════════════════════════════════════════════════════════╝');
    return;
  }
  console.log('║ ✅ Transporter created — now verifying SMTP connection...');

  // ─── SMTP Verify step (NEW: explicitly test connection before sending) ───
  try {
    const verifyStart = Date.now();
    await transporter.verify();
    const verifyMs = Date.now() - verifyStart;
    console.log(`║ ✅ SMTP VERIFY OK in ${verifyMs}ms — connection is alive`);
  } catch (verifyErr: any) {
    console.error(`║ ❌ SMTP VERIFY FAILED: ${verifyErr?.message || verifyErr}`);
    console.error(`║ ❌ Full error:`, verifyErr);
    console.error('║ ⚠️ Will still attempt to send — sometimes verify fails but send works');
  }

  // Collect all recipients
  const recipients = new Set<string>();

  // Creator always receives
  if (data.criadoPorEmail) {
    recipients.add(data.criadoPorEmail);
    console.log('[Email] │ + Creator email:', data.criadoPorEmail);
  } else {
    console.log('[Email] │ ⚠️ No creator email (criadoPorEmail is empty)');
  }

  // Target user
  if (data.paraQuemEmail) {
    recipients.add(data.paraQuemEmail);
    console.log('[Email] │ + Target user email:', data.paraQuemEmail);
  } else {
    console.log('[Email] │ ⚠️ No target email (paraQuemEmail is empty)');
  }

  // Equipment managers / responsáveis
  console.log('[Email] │ Responsável emails received:', responsavelEmails);
  for (const email of responsavelEmails) {
    if (email) {
      recipients.add(email);
      console.log('[Email] │ + Manager email:', email);
    }
  }

  // External: also send to advisor
  if (isExterno && data.emailOrientador) {
    recipients.add(data.emailOrientador);
    console.log('[Email] │ + Advisor email:', data.emailOrientador);
  }

  // Generate Google Calendar link if raw dates available
  let googleCalLink: string | null = null;
  if (data.inicioRaw && data.fimRaw) {
    const description = [
      `Equipment: ${data.equipamentoNome}`,
      `Booked by: ${data.criadoPor}`,
      `For: ${data.paraQuem}`,
      data.observacoes ? `Notes: ${data.observacoes}` : '',
    ].filter(Boolean).join('\n');

    googleCalLink = generateGoogleCalendarLink(
      `LERP — ${data.equipamentoNome}`,
      description,
      data.inicioRaw,
      data.fimRaw,
      'LERP — FEQ/UNICAMP'
    );
    console.log('[Email] │ Google Calendar link generated');
  }

  const html = formatEmailHtml(data, googleCalLink);
  const subject = `📅 LERP — Scheduling Confirmed: ${data.equipamentoNome} — ${data.inicio}`;
  const from = `"LERP — FEQ/UNICAMP" <${process.env.EMAIL_USER || 'lerpfeq@gmail.com'}>`;

  const recipientList = Array.from(recipients);
  console.log(`║ FINAL recipient list (${recipientList.length}):`, recipientList);

  if (recipientList.length === 0) {
    console.log('║ ⚠️ NO RECIPIENTS — no emails will be sent!');
    console.log('╚══════════════════════════════════════════════════════════╝');
    transporter.close();
    return;
  }

  // Send each email individually (sequential — easier to debug)
  const results: { email: string; ok: boolean; error?: string; messageId?: string; ms?: number }[] = [];
  const batchStart = Date.now();

  for (const email of recipientList) {
    console.log(`║ ────────────────────────────────────────────`);
    console.log(`║ 📤 SENDING to: ${email}`);
    const startMs = Date.now();
    try {
      const info = await withTimeout(
        transporter.sendMail({ from, to: email, subject, html }),
        20000,
        `sendMail(${email})`
      );
      const elapsed = Date.now() - startMs;
      console.log(`║ ✅ SENT to ${email} in ${elapsed}ms`);
      console.log(`║    messageId : ${info.messageId}`);
      console.log(`║    response  : ${info.response}`);
      console.log(`║    accepted  : ${JSON.stringify(info.accepted)}`);
      console.log(`║    rejected  : ${JSON.stringify(info.rejected)}`);
      results.push({ email, ok: true, messageId: info.messageId, ms: elapsed });
    } catch (err: any) {
      const elapsed = Date.now() - startMs;
      const errMsg = err?.message || String(err);
      console.error(`║ ❌ FAILED to send to ${email} after ${elapsed}ms`);
      console.error(`║    Error: ${errMsg}`);
      console.error(`║    Code : ${err?.code || 'N/A'}`);
      console.error(`║    Command: ${err?.command || 'N/A'}`);
      results.push({ email, ok: false, error: errMsg, ms: elapsed });
    }
  }

  const batchElapsed = Date.now() - batchStart;

  // Close transporter
  transporter.close();

  const successCount = results.filter(r => r.ok).length;
  console.log(`║ ────────────────────────────────────────────`);
  console.log(`║ 📊 BATCH SUMMARY`);
  console.log(`║    Total: ${recipientList.length} | Sent: ${successCount} | Failed: ${recipientList.length - successCount}`);
  console.log(`║    Total time: ${batchElapsed}ms`);
  console.log(`║    Results: ${JSON.stringify(results)}`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
}
