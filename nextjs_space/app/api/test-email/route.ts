import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET  /api/test-email — Diagnostic (no email sent)
 * POST /api/test-email — Send a real test email (Admin only)
 *
 * Transport priority:
 *   1. SendGrid  (SENDGRID_API_KEY)  — recommended, works on Render ✅
 *   2. Resend    (RESEND_API_KEY)    — requires domain for other recipients
 *   3. SMTP      (EMAIL_PASS)        — blocked on Render ❌
 */

const ts   = () => new Date().toISOString();
const mask = (v: string | undefined) => {
  if (!v) return "(not set)";
  if (v.length <= 6) return `****(len=${v.length})`;
  return `${v.slice(0, 4)}...${v.slice(-4)} (len=${v.length})`;
};

/* ═══════════════════════════════════════════════════════════════ */
/* GET: diagnostic                                                 */
/* ═══════════════════════════════════════════════════════════════ */
export async function GET() {
  const steps: { time: string; step: string; result: string }[] = [];
  const log = (step: string, result: string) => {
    steps.push({ time: ts(), step, result });
    console.log(`[test-email-GET] ${step}: ${result}`);
  };

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    log("Auth", `userId=${session.user.id}`);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, isAdmin: true },
    });
    log("User", `${user?.name} <${user?.email}> isAdmin=${user?.isAdmin}`);

    // ─── Env var inspection ───
    const sgKey  = process.env.SENDGRID_API_KEY;
    const rsKey  = process.env.RESEND_API_KEY;
    const emUser = process.env.EMAIL_USER;
    const emPass = process.env.EMAIL_PASS;

    log("SENDGRID_API_KEY", mask(sgKey));
    log("RESEND_API_KEY",   mask(rsKey));
    log("EMAIL_USER",       emUser || "(not set)");
    log("EMAIL_PASS",       mask(emPass));

    // ─── Determine transport ───
    let transport: string;
    if (sgKey && sgKey.trim().length > 0) {
      transport = "sendgrid";
      log("Transport selected", "SENDGRID ✅");
    } else if (rsKey && rsKey.trim().length > 0) {
      transport = "resend";
      log("Transport selected", "RESEND (may be limited without domain)");
    } else if (emPass && emPass.trim().length > 0) {
      transport = "smtp";
      log("Transport selected", "SMTP ⚠️ (BLOCKED on Render — will fail)");
    } else {
      transport = "none";
      log("Transport selected", "NONE ❌ — no credentials configured");
    }

    const allRelatedEnvVars: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (/email|mail|smtp|resend|sendgrid/i.test(k)) {
        allRelatedEnvVars[k] = mask(v);
      }
    }
    log("All email-related env vars", JSON.stringify(allRelatedEnvVars));
    log("nodeVersion", process.env.npm_config_node_version || process.version);

    return NextResponse.json({
      success: true,
      transport,
      user: { email: user?.email, name: user?.name, isAdmin: user?.isAdmin },
      envVars: {
        SENDGRID_API_KEY: mask(sgKey),
        RESEND_API_KEY:   mask(rsKey),
        EMAIL_USER:       emUser || "(not set)",
        EMAIL_PASS:       mask(emPass),
      },
      allRelatedEnvVars,
      steps,
      howToFix: {
        sendgrid: "1) Create free account at sendgrid.com, 2) Verify lerpfeq@gmail.com as sender at sendgrid.com/ui/account/sender-management, 3) Create API key at sendgrid.com/ui/account/billing → API Keys, 4) Add SENDGRID_API_KEY to Render env vars",
        resend: "Resend free tier only sends to own email without domain. Use SendGrid instead.",
        smtp: "SMTP ports (587/465) are BLOCKED on Render.com. Use SendGrid instead.",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════════════ */
/* POST: send test email                                           */
/* ═══════════════════════════════════════════════════════════════ */
export async function POST(req: NextRequest) {
  const steps: { time: string; step: string; result: string }[] = [];
  const log = (step: string, result: string) => {
    steps.push({ time: ts(), step, result });
    console.log(`[test-email-POST] ${step}: ${result}`);
  };

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    log("User", `${user.name} <${user.email}>`);

    const body = await req.json().catch(() => ({}));
    const recipient = body.to || user.email || "lerpfeq@gmail.com";
    const subject   = body.subject || `[LERP] Test Email — ${ts()}`;

    log("Recipient", recipient);

    const sgKey  = process.env.SENDGRID_API_KEY?.trim();
    const rsKey  = process.env.RESEND_API_KEY?.trim();
    const emPass = process.env.EMAIL_PASS?.trim();
    const emUser = process.env.EMAIL_USER || "lerpfeq@gmail.com";

    // ─── Select transport ───
    const useSendGrid = !!(sgKey && sgKey.length > 0);
    const useResend   = !useSendGrid && !!(rsKey && rsKey.length > 0);
    const useSmtp     = !useSendGrid && !useResend && !!(emPass && emPass.length > 0);

    if (!useSendGrid && !useResend && !useSmtp) {
      return NextResponse.json({
        success: false,
        error: "No email transport configured. Add SENDGRID_API_KEY to Render env vars.",
        howToFix: "Create free SendGrid account → verify lerpfeq@gmail.com as sender → create API key → add SENDGRID_API_KEY to Render",
        steps,
      }, { status: 500 });
    }

    const method = useSendGrid ? "SendGrid API" : useResend ? "Resend API" : "Gmail SMTP";
    log("Method selected", method);

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;padding:20px;background:#f4f4f4;">
  <div style="max-width:500px;margin:0 auto;background:white;border-radius:8px;padding:30px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <h2 style="color:#667eea;">✅ LERP Email Test — ${method}</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555;"><strong>Transport</strong></td><td style="padding:8px;border-bottom:1px solid #eee;">${method}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555;"><strong>Sent at</strong></td><td style="padding:8px;border-bottom:1px solid #eee;">${ts()}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555;"><strong>From</strong></td><td style="padding:8px;border-bottom:1px solid #eee;">${emUser}</td></tr>
      <tr><td style="padding:8px;color:#555;"><strong>To</strong></td><td style="padding:8px;">${recipient}</td></tr>
    </table>
    <p style="margin-top:20px;color:#888;font-size:13px;">This is an automated test from LERP Intranet.</p>
  </div>
</body></html>`;

    // ─── SendGrid ───
    if (useSendGrid) {
      log("SendGrid send", `Calling SendGrid API for ${recipient}...`);
      const startMs = Date.now();

      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sgKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipient }] }],
          from: { email: emUser, name: "LERP — FEQ/UNICAMP" },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });

      const ms = Date.now() - startMs;
      log("SendGrid response", `HTTP ${res.status} in ${ms}ms`);

      if (res.status === 202) {
        const msgId = res.headers.get("x-message-id") || "N/A";
        log("SendGrid result", `✅ SUCCESS — message id: ${msgId}`);
        return NextResponse.json({
          success: true,
          transport: "sendgrid",
          message: `✅ Test email sent to ${recipient} via SendGrid!`,
          messageId: msgId,
          ms,
          steps,
        });
      }

      let errBody = "";
      try { errBody = await res.text(); } catch {}
      log("SendGrid error", `HTTP ${res.status}: ${errBody}`);

      // Common error diagnosis
      let diagnosis = "";
      if (res.status === 401) diagnosis = "Invalid API key. Check SENDGRID_API_KEY in Render env vars.";
      else if (res.status === 403) diagnosis = "Sender not verified. Go to sendgrid.com/ui/account/sender-management and verify lerpfeq@gmail.com";
      else if (res.status === 429) diagnosis = "Rate limited. Free tier: 100/day.";
      else diagnosis = `HTTP ${res.status}. Check SendGrid dashboard for details.`;

      return NextResponse.json({
        success: false,
        transport: "sendgrid",
        error: `SendGrid error ${res.status}: ${errBody.slice(0, 300)}`,
        diagnosis,
        steps,
      }, { status: 500 });
    }

    // ─── Resend (fallback) ───
    if (useResend) {
      log("Resend send", `Calling Resend API for ${recipient}...`);
      const { Resend } = await import("resend");
      const resend = new Resend(rsKey!);
      const startMs = Date.now();
      const { data, error } = await resend.emails.send({
        from: "LERP <onboarding@resend.dev>",
        to: [recipient],
        subject,
        html,
      });
      const ms = Date.now() - startMs;

      if (error) {
        log("Resend error", error.message);
        return NextResponse.json({
          success: false,
          transport: "resend",
          error: error.message,
          diagnosis: "Resend free tier only sends to lerpfeq@gmail.com without domain verification. Use SendGrid instead.",
          steps,
        }, { status: 500 });
      }

      log("Resend result", `✅ id=${data?.id} (${ms}ms)`);
      return NextResponse.json({
        success: true,
        transport: "resend",
        message: `✅ Test email sent to ${recipient} via Resend!`,
        messageId: data?.id,
        ms,
        steps,
      });
    }

    // ─── SMTP (last resort, will fail on Render) ───
    log("SMTP", "⚠️ Attempting SMTP — likely BLOCKED on Render");
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: emUser, pass: emPass },
      connectionTimeout: 20000,
    });
    const startMs = Date.now();
    try {
      const info = await Promise.race([
        transporter.sendMail({ from: `"LERP" <${emUser}>`, to: recipient, subject, html }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("SMTP connection timed out — port 587 is likely blocked on Render")), 22000)
        ),
      ]);
      const ms = Date.now() - startMs;
      log("SMTP result", `✅ sent (${ms}ms) id=${info.messageId}`);
      return NextResponse.json({
        success: true,
        transport: "smtp",
        message: `✅ Test email sent to ${recipient} via Gmail SMTP!`,
        messageId: info.messageId,
        ms,
        steps,
      });
    } catch (err: any) {
      const ms = Date.now() - startMs;
      log("SMTP error", err?.message);
      return NextResponse.json({
        success: false,
        transport: "smtp",
        error: `SMTP failed: ${err?.message}`,
        diagnosis: "SMTP ports are BLOCKED on Render. Add SENDGRID_API_KEY to Render env vars instead.",
        fix: "1) sendgrid.com → free account, 2) verify lerpfeq@gmail.com as sender, 3) create API key, 4) add SENDGRID_API_KEY to Render",
        ms,
        steps,
      }, { status: 500 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
