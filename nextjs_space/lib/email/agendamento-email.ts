// Email notification utility for equipment bookings
// Sends emails asynchronously - failures do NOT cancel the booking

interface BookingEmailData {
  equipamentoNome: string;
  sopLink?: string | null;
  inicio: string;
  fim: string;
  criadoPor: string;
  criadoPorEmail: string;
  paraQuem: string;
  paraQuemEmail?: string;
  emailOrientador?: string | null;
  observacoes?: string | null;
}

function formatEmailHtml(data: BookingEmailData): string {
  const sopSection = data.sopLink
    ? `<p><strong>SOP:</strong> <a href="${data.sopLink}" target="_blank">${data.sopLink}</a></p>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0c2340, #1b3a5c); padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0;">LERP - Equipment Booking</h2>
      </div>
      <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #333;">A new booking has been created:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #555; width: 40%;">Equipment</td>
            <td style="padding: 10px; color: #333;">${data.equipamentoNome}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #555;">Start</td>
            <td style="padding: 10px; color: #333;">${data.inicio}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #555;">End</td>
            <td style="padding: 10px; color: #333;">${data.fim}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #555;">Booked by</td>
            <td style="padding: 10px; color: #333;">${data.criadoPor} (${data.criadoPorEmail})</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #555;">For</td>
            <td style="padding: 10px; color: #333;">${data.paraQuem}${data.paraQuemEmail ? ` (${data.paraQuemEmail})` : ''}</td>
          </tr>
          ${data.observacoes ? `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #555;">Notes</td>
            <td style="padding: 10px; color: #333;">${data.observacoes}</td>
          </tr>
          ` : ''}
        </table>

        ${sopSection}

        <p style="font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
          This email was sent automatically by the LERP Intranet system.
        </p>
      </div>
    </div>
  `;
}

export async function sendAgendamentoEmails(
  data: BookingEmailData,
  responsavelEmails: string[],
  isExterno: boolean
): Promise<void> {
  // Collect all recipients
  const recipients = new Set<string>();

  // Creator always receives
  if (data.criadoPorEmail) recipients.add(data.criadoPorEmail);

  // Equipment managers
  for (const email of responsavelEmails) {
    if (email) recipients.add(email);
  }

  // If external: external user + advisor
  if (isExterno) {
    if (data.paraQuemEmail) recipients.add(data.paraQuemEmail);
    if (data.emailOrientador) recipients.add(data.emailOrientador);
  }

  const html = formatEmailHtml(data);
  const subject = `LERP - Booking: ${data.equipamentoNome} - ${data.inicio}`;

  // Send emails asynchronously - fire and forget
  const sendPromises = Array.from(recipients).map(async (email) => {
    try {
      console.log(`[Email] Sending to: ${email} | Subject: ${subject}`);

      // If SMTP is configured, use nodemailer
      if (process.env.SMTP_HOST) {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'lerp@noreply.com',
          to: email,
          subject,
          html,
        });
        console.log(`[Email] Sent successfully to: ${email}`);
      } else {
        console.log(`[Email] SMTP not configured - skipping email to: ${email}`);
      }
    } catch (err) {
      console.error(`[Email] Failed to send to ${email}:`, err);
      // Don't throw - emails are best-effort
    }
  });

  // Fire and forget - don't await
  Promise.all(sendPromises).catch((err) => {
    console.error('[Email] Batch send error:', err);
  });
}
