// Email notification utility for agendamentos
// Sends emails asynchronously - failures do NOT cancel the booking

interface AgendamentoEmailData {
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

function formatEmailHtml(data: AgendamentoEmailData): string {
  const sopSection = data.sopLink
    ? `<p><strong>SOP:</strong> <a href="${data.sopLink}" target="_blank">${data.sopLink}</a></p>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0c2340, #1b3a5c); padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0;">LERP - Agendamento de Equipamento</h2>
      </div>
      <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #333;">Um novo agendamento foi realizado:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #555; width: 40%;">Equipamento</td>
            <td style="padding: 10px; color: #333;">${data.equipamentoNome}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #555;">Inicio</td>
            <td style="padding: 10px; color: #333;">${data.inicio}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #555;">Fim</td>
            <td style="padding: 10px; color: #333;">${data.fim}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #555;">Agendado por</td>
            <td style="padding: 10px; color: #333;">${data.criadoPor} (${data.criadoPorEmail})</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #555;">Para</td>
            <td style="padding: 10px; color: #333;">${data.paraQuem}${data.paraQuemEmail ? ` (${data.paraQuemEmail})` : ''}</td>
          </tr>
          ${data.observacoes ? `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #555;">Observacoes</td>
            <td style="padding: 10px; color: #333;">${data.observacoes}</td>
          </tr>
          ` : ''}
        </table>

        ${sopSection}

        <p style="font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
          Este e-mail foi enviado automaticamente pelo sistema LERP Intranet.
        </p>
      </div>
    </div>
  `;
}

export async function sendAgendamentoEmails(
  data: AgendamentoEmailData,
  responsavelEmails: string[],
  isExterno: boolean
): Promise<void> {
  // Collect all recipients
  const recipients = new Set<string>();

  // Quem agendou sempre recebe
  if (data.criadoPorEmail) recipients.add(data.criadoPorEmail);

  // Responsáveis pelo equipamento
  for (const email of responsavelEmails) {
    if (email) recipients.add(email);
  }

  // Se externo: externo + orientador
  if (isExterno) {
    if (data.paraQuemEmail) recipients.add(data.paraQuemEmail);
    if (data.emailOrientador) recipients.add(data.emailOrientador);
  }

  const html = formatEmailHtml(data);
  const subject = `LERP - Agendamento: ${data.equipamentoNome} - ${data.inicio}`;

  // Send emails asynchronously - fire and forget
  const sendPromises = Array.from(recipients).map(async (email) => {
    try {
      // Using a simple fetch to an email API endpoint
      // In production, configure SMTP or use a service like Resend/SendGrid
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
