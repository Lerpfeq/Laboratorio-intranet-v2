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

  console.log(`[Email] createTransporter: user=${user}, pass=${pass ? '***configured***' : '⚠️ EMPTY'}`);

  if (!pass) {
    console.warn('[Email] EMAIL_PASS not configured — emails will be skipped');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    connectionTimeout: 10000,  // 10s to establish connection
    greetingTimeout: 10000,    // 10s for SMTP greeting
    socketTimeout: 10000,      // 10s for socket inactivity
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

/* ─────────── Main Send Function ─────────── */
export async function sendAgendamentoEmails(
  data: BookingEmailData,
  responsavelEmails: string[],
  isExterno: boolean
): Promise<void> {
  const transporter = createTransporter();

  if (!transporter) {
    console.log('[Email] Transporter not available — skipping all emails');
    return;
  }

  // Collect all recipients
  const recipients = new Set<string>();

  // Creator always receives
  if (data.criadoPorEmail) recipients.add(data.criadoPorEmail);

  // Target user
  if (data.paraQuemEmail) recipients.add(data.paraQuemEmail);

  // Equipment managers / responsáveis
  for (const email of responsavelEmails) {
    if (email) recipients.add(email);
  }

  // External: also send to advisor
  if (isExterno && data.emailOrientador) {
    recipients.add(data.emailOrientador);
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
  }

  const html = formatEmailHtml(data, googleCalLink);
  const subject = `📅 LERP — Scheduling Confirmed: ${data.equipamentoNome} — ${data.inicio}`;
  const from = `"LERP — FEQ/UNICAMP" <${process.env.EMAIL_USER || 'lerpfeq@gmail.com'}>`;

  const recipientList = Array.from(recipients);
  console.log(`[Email] Total recipients (${recipientList.length}):`, recipientList);

  // Send each email with a per-recipient 10s timeout
  const sendPromises = recipientList.map(async (email) => {
    try {
      console.log(`[Email] Sending to: ${email}`);
      const info = await withTimeout(
        transporter.sendMail({ from, to: email, subject, html }),
        10000,
        `sendMail(${email})`
      );
      console.log(`[Email] ✅ Sent to ${email} — messageId: ${info.messageId}`);
    } catch (err: any) {
      console.error(`[Email] ❌ Failed to send to ${email}:`, err?.message || err);
      // Don't throw — emails are best-effort
    }
  });

  // Global 15s timeout for the entire batch
  try {
    await withTimeout(Promise.all(sendPromises), 15000, 'all emails batch');
    console.log(`[Email] ✅ All ${recipientList.length} emails processed`);
  } catch (err: any) {
    console.error('[Email] ⏱️ Batch timed out or failed:', err?.message || err);
  } finally {
    // Close transporter to release socket — prevents hanging connections
    transporter.close();
  }
}
