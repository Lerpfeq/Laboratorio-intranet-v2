import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET  /api/test-email — Diagnostic: env vars + transport detection
 * POST /api/test-email — Send a real test email (Admin only)
 *
 * Supports Resend (preferred) and SMTP (legacy fallback).
 */

/* helpers */
const ts = () => new Date().toISOString();
const mask = (v: string | undefined) => {
  if (!v) return "(undefined)";
  if (v.length <= 6) return `****${v.length > 2 ? v.slice(-2) : ""}`;
  return v.slice(0, 4) + "****" + v.slice(-4);
};

type Transport = "resend" | "smtp" | "none";
function detectTransport(): Transport {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.EMAIL_PASS) return "smtp";
  return "none";
}

/* ═══════ GET: diagnostic ═══════ */
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

    // Transport detection
    const transport = detectTransport();
    log("Transport", `${transport.toUpperCase()}${transport === "resend" ? " ✅" : transport === "smtp" ? " ⚠️ (may be blocked)" : " ❌"}`);

    // Env vars
    const resendKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    log("RESEND_API_KEY", resendKey ? `SET (masked: ${mask(resendKey)}, len=${resendKey.length})` : "⚠️ NOT SET");
    log("RESEND_FROM_EMAIL", resendFrom || "(not set — will use onboarding@resend.dev)");
    log("EMAIL_USER", emailUser || "⚠️ NOT SET");
    log("EMAIL_PASS", emailPass ? `SET (len=${emailPass.length})` : "NOT SET");

    // Test Resend connectivity
    let resendOk = false;
    let resendError = "";
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        // Resend doesn't have a "verify" method, but we can list domains to test the key
        const { data: domains, error } = await resend.domains.list();
        if (error) {
          resendError = error.message;
          log("Resend API test", `❌ ${error.message}`);
        } else {
          resendOk = true;
          const domainNames = domains?.data?.map((d: any) => `${d.name} (${d.status})`) || [];
          log("Resend API test", `✅ API key valid — domains: ${domainNames.length > 0 ? domainNames.join(", ") : "(none — will use onboarding@resend.dev)"}`);
        }
      } catch (err: any) {
        resendError = err?.message || String(err);
        log("Resend API test", `❌ ${resendError}`);
      }
    }

    // User info
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    log("User", `${user?.name} <${user?.email}>, category=${user?.category}`);

    return NextResponse.json({
      success: true,
      transport: transport,
      diagnostic: {
        resendApiKeySet: !!resendKey,
        resendApiKeyMasked: resendKey ? mask(resendKey) : null,
        resendFromEmail: resendFrom || "onboarding@resend.dev (default)",
        resendApiValid: resendOk,
        resendError: resendError || null,
        emailUser: emailUser || null,
        emailPassSet: !!emailPass,
        nodeEnv: process.env.NODE_ENV || null,
        userEmail: user?.email || null,
        isAdmin: user?.category === "Admin",
      },
      steps,
      instructions: {
        setupResend: [
          "1. Go to https://resend.com — create free account",
          "2. API Keys → Create API Key → copy it",
          "3. Render Dashboard → lerp-intranet → Environment",
          "4. Add: RESEND_API_KEY = re_xxxxxxxxxx",
          "5. (Optional) Add: RESEND_FROM_EMAIL = LERP <noreply@yourdomain.com>",
          "6. Redeploy (or it auto-deploys)",
        ],
        sendTestEmail: "POST /api/test-email — sends a real email (Admin only)",
      },
    });
  } catch (error: any) {
    log("FATAL", error?.message || String(error));
    return NextResponse.json({ success: false, error: error?.message, steps }, { status: 500 });
  }
}

/* ═══════ POST: send real test email ═══════ */
export async function POST(request: NextRequest) {
  const steps: { time: string; step: string; result: string }[] = [];
  const log = (step: string, result: string) => {
    steps.push({ time: ts(), step, result });
    console.log(`[test-email-POST] ${step}: ${result}`);
  };

  try {
    log("START", "POST /api/test-email");

    // Auth + Admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category !== "Admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    log("Admin", `✅ ${user.name} <${user.email}>`);

    // Recipient
    let recipient = user.email || "";
    try {
      const body = await request.json().catch(() => ({}));
      if ((body as any)?.to) recipient = (body as any).to;
    } catch { /* optional */ }

    if (!recipient) {
      return NextResponse.json({ error: "No recipient email", steps }, { status: 400 });
    }
    log("Recipient", recipient);

    // Transport
    const transport = detectTransport();
    log("Transport", transport.toUpperCase());

    if (transport === "none") {
      return NextResponse.json({
        success: false,
        error: "No email transport configured",
        steps,
        fix: "Add RESEND_API_KEY to Render env vars (see GET /api/test-email for instructions)",
      }, { status: 500 });
    }

    // Build email HTML
    const now = new Date();
    const dateStr = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <div style="max-width:550px;margin:20px auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;">📧 Email System Test</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0 0;font-size:14px;">LERP — FEQ/UNICAMP</p>
    </div>
    <div style="padding:25px 30px;">
      <p style="font-size:16px;color:#333;"><strong>✅ Email system is working!</strong></p>
      <p style="color:#555;">Automated test from LERP Intranet.</p>
      <table style="width:100%;border-collapse:collapse;margin:15px 0;">
        <tr><td style="padding:8px 12px;color:#666;border-bottom:1px solid #eee;"><strong>Transport</strong></td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${transport === "resend" ? "Resend API ✅" : "Gmail SMTP (legacy)"}</td></tr>
        <tr><td style="padding:8px 12px;color:#666;border-bottom:1px solid #eee;"><strong>Date</strong></td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${dateStr}</td></tr>
        <tr><td style="padding:8px 12px;color:#666;"><strong>Node</strong></td>
            <td style="padding:8px 12px;">${process.version}</td></tr>
      </table>
      <div style="text-align:center;margin:25px 0;">
        <a href="https://laborat-rio-intranet.onrender.com/agendamentos" target="_blank"
           style="display:inline-block;background:#4285f4;color:white;padding:14px 28px;
                  text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
          📅 Open Scheduling
        </a>
      </div>
      <p style="color:#888;font-size:13px;">If you received this, scheduling notifications will also work.</p>
    </div>
    <div style="background:#f9f9f9;padding:15px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;">LERP — Laboratório de Engenharia de Reações Poliméricas</p>
    </div>
  </div>
</body>
</html>`;

    const subject = `📧 LERP Email Test — ${dateStr}`;
    const sendStart = Date.now();

    // ─── RESEND ───
    if (transport === "resend") {
      const resendKey = process.env.RESEND_API_KEY!;
      const fromAddr = process.env.RESEND_FROM_EMAIL || "LERP — FEQ/UNICAMP <onboarding@resend.dev>";
      log("Resend from", fromAddr);

      const resend = new Resend(resendKey);

      const { data: sendData, error: sendError } = await resend.emails.send({
        from: fromAddr,
        to: [recipient],
        subject,
        html,
      });

      const sendMs = Date.now() - sendStart;

      if (sendError) {
        log("Send", `❌ Resend error: ${sendError.message}`);
        return NextResponse.json({
          success: false,
          transport: "resend",
          error: sendError.message,
          sendMs,
          steps,
          tip: sendError.message.includes("not verified")
            ? "You need to verify your domain in Resend, OR use the default sender (onboarding@resend.dev)"
            : undefined,
        }, { status: 500 });
      }

      log("Send", `✅ Resend OK in ${sendMs}ms — id: ${sendData?.id}`);

      return NextResponse.json({
        success: true,
        transport: "resend",
        message: `✅ Test email sent to ${recipient} via Resend`,
        emailId: sendData?.id,
        sendMs,
        steps,
      });
    }

    // ─── SMTP FALLBACK ───
    const emailUser = process.env.EMAIL_USER || "lerpfeq@gmail.com";
    const emailPass = process.env.EMAIL_PASS!;
    const from = `"LERP — FEQ/UNICAMP" <${emailUser}>`;

    log("SMTP", `host=smtp.gmail.com, port=587, user=${emailUser}`);
    log("⚠️ Warning", "SMTP may be blocked by Render firewall — consider switching to Resend");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: emailUser, pass: emailPass },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 20000,
      tls: { rejectUnauthorized: false },
    });

    try {
      await transporter.verify();
      log("SMTP verify", "✅ OK");
    } catch (err: any) {
      log("SMTP verify", `❌ ${err?.message}`);
      transporter.close();
      return NextResponse.json({
        success: false,
        transport: "smtp",
        error: `SMTP verify failed: ${err?.message}`,
        steps,
        fix: "Switch to Resend — SMTP is blocked on Render. Add RESEND_API_KEY env var.",
      }, { status: 500 });
    }

    const info = await transporter.sendMail({ from, to: recipient, subject, html });
    const sendMs = Date.now() - sendStart;
    transporter.close();

    log("Send", `✅ SMTP OK in ${sendMs}ms — ${info.messageId}`);

    return NextResponse.json({
      success: true,
      transport: "smtp",
      message: `✅ Test email sent to ${recipient} via SMTP`,
      messageId: info.messageId,
      sendMs,
      steps,
    });
  } catch (error: any) {
    log("FATAL", error?.message || String(error));
    console.error("[test-email-POST] Fatal:", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Unknown error",
      steps,
    }, { status: 500 });
  }
}
