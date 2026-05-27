import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import * as dns from "dns";
import * as net from "net";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Allow up to 30s for this diagnostic endpoint

/**
 * GET /api/test-email — Ultra-verbose diagnostic (no email sent)
 * POST /api/test-email — Sends a real test email with full SMTP debug
 *
 * Both return detailed step-by-step diagnostic info for Render logs.
 */

/* ─── helpers ─── */
const ts = () => new Date().toISOString();
const mask = (val: string | undefined): string => {
  if (!val) return "(undefined/empty)";
  if (val.length <= 4) return "****";
  return val.slice(0, 3) + "****" + val.slice(-3);
};

/** Try a raw TCP connection to host:port to test firewall */
async function testTcpPort(host: string, port: number, timeoutMs = 5000): Promise<{ ok: boolean; ms: number; error?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => {
      const ms = Date.now() - start;
      socket.destroy();
      resolve({ ok: true, ms });
    });
    socket.on("timeout", () => {
      const ms = Date.now() - start;
      socket.destroy();
      resolve({ ok: false, ms, error: `TCP timeout after ${ms}ms` });
    });
    socket.on("error", (err) => {
      const ms = Date.now() - start;
      resolve({ ok: false, ms, error: err.message });
    });
    socket.connect(port, host);
  });
}

/** DNS lookup */
async function dnsLookup(hostname: string): Promise<{ ok: boolean; addresses?: string[]; error?: string }> {
  return new Promise((resolve) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) resolve({ ok: false, error: err.message });
      else resolve({ ok: true, addresses });
    });
  });
}

/* ═══════════════════════════════════════════════════════════════ */
/* ─── GET: environment + connectivity check (any auth user) ─── */
/* ═══════════════════════════════════════════════════════════════ */
export async function GET() {
  const steps: { time: string; step: string; result: string }[] = [];
  const log = (step: string, result: string) => {
    steps.push({ time: ts(), step, result });
    console.log(`[test-email-GET] ${step}: ${result}`);
  };

  try {
    // Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    log("Auth", `userId=${session.user.id}`);

    // Environment Variables
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const nodeEnv = process.env.NODE_ENV;

    log("EMAIL_USER", emailUser ? `"${emailUser}"` : "⚠️ NOT SET");
    log("EMAIL_PASS", emailPass
      ? `SET (length=${emailPass.length}, masked=${mask(emailPass)}, hasSpaces=${emailPass.includes(" ")}, chars=[${emailPass.split("").map(c => c.charCodeAt(0)).join(",")}])`
      : "⚠️ NOT SET");
    log("NODE_ENV", nodeEnv || "(not set)");

    // Scan ALL env vars for email/smtp related
    const relatedEnvs: Record<string, string> = {};
    for (const key of Object.keys(process.env)) {
      if (/email|mail|smtp/i.test(key)) {
        relatedEnvs[key] = mask(process.env[key]);
      }
    }
    log("All email-related env vars", JSON.stringify(relatedEnvs));

    // Check for STALE env vars that should have been deleted
    const staleVars = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE"].filter(k => process.env[k]);
    if (staleVars.length > 0) {
      log("⚠️ STALE VARS", `These should be DELETED from Render: ${staleVars.join(", ")} = ${staleVars.map(k => process.env[k]).join(", ")}`);
    } else {
      log("STALE VARS check", "✅ No stale SMTP_* variables found");
    }

    // DNS Resolution
    const dnsResult = await dnsLookup("smtp.gmail.com");
    log("DNS smtp.gmail.com", dnsResult.ok ? `✅ Resolved: ${dnsResult.addresses?.join(", ")}` : `❌ FAILED: ${dnsResult.error}`);

    // TCP Port Tests
    log("TCP test", "Testing raw TCP connectivity to smtp.gmail.com...");

    const tcp587 = await testTcpPort("smtp.gmail.com", 587, 8000);
    log("TCP :587 (STARTTLS)", tcp587.ok ? `✅ Connected in ${tcp587.ms}ms` : `❌ FAILED: ${tcp587.error}`);

    const tcp465 = await testTcpPort("smtp.gmail.com", 465, 8000);
    log("TCP :465 (SSL)", tcp465.ok ? `✅ Connected in ${tcp465.ms}ms` : `❌ FAILED: ${tcp465.error}`);

    // SMTP Verify (only if credentials present)
    let transporterOk = false;
    let transporterError = "";
    const smtpLogs: string[] = [];

    if (emailUser && emailPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: { user: emailUser, pass: emailPass },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 15000,
          tls: { rejectUnauthorized: false },
          debug: true,
          logger: {
            // Capture SMTP protocol logs
            info: (entry: any) => smtpLogs.push(`[INFO] ${JSON.stringify(entry)}`),
            debug: (entry: any) => smtpLogs.push(`[DEBUG] ${JSON.stringify(entry)}`),
            warn: (entry: any) => smtpLogs.push(`[WARN] ${JSON.stringify(entry)}`),
            error: (entry: any) => smtpLogs.push(`[ERROR] ${JSON.stringify(entry)}`),
            trace: (entry: any) => smtpLogs.push(`[TRACE] ${JSON.stringify(entry)}`),
            fatal: (entry: any) => smtpLogs.push(`[FATAL] ${JSON.stringify(entry)}`),
            log: (entry: any) => smtpLogs.push(`[LOG] ${JSON.stringify(entry)}`),
          } as any,
        });
        log("Transporter", "✅ Created (host=smtp.gmail.com, port=587, secure=false, STARTTLS)");

        const verifyStart = Date.now();
        await transporter.verify();
        const verifyMs = Date.now() - verifyStart;
        transporterOk = true;
        log("SMTP verify", `✅ SMTP handshake OK in ${verifyMs}ms`);
        transporter.close();
      } catch (err: any) {
        transporterError = err?.message || String(err);
        log("SMTP verify", `❌ FAILED: ${transporterError}`);
        log("SMTP error code", err?.code || "N/A");
        log("SMTP error command", err?.command || "N/A");
      }
    } else {
      log("Transporter", "⏭️ Skipped — missing EMAIL_USER or EMAIL_PASS");
    }

    // User info
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    log("User", `name="${user?.name}", email="${user?.email}", category="${user?.category}"`);

    // System info
    log("Node version", process.version);
    log("Platform", process.platform);
    log("Arch", process.arch);

    return NextResponse.json({
      success: true,
      diagnostic: {
        emailUserSet: !!emailUser,
        emailPassSet: !!emailPass,
        emailUser: emailUser || null,
        emailPassMasked: emailPass ? mask(emailPass) : null,
        emailPassLength: emailPass?.length || 0,
        emailPassHasSpaces: emailPass ? emailPass.includes(" ") : null,
        smtpVerified: transporterOk,
        smtpError: transporterError || null,
        dnsOk: dnsResult.ok,
        dnsAddresses: dnsResult.addresses || null,
        tcp587: tcp587,
        tcp465: tcp465,
        staleVars: staleVars.length > 0 ? staleVars : null,
        nodeEnv: nodeEnv || null,
        nodeVersion: process.version,
        userEmail: user?.email || null,
        isAdmin: user?.category === "Admin",
        configUsed: {
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          tls: "rejectUnauthorized: false",
          timeouts: "15000ms each",
        },
      },
      smtpProtocolLogs: smtpLogs.slice(0, 50), // first 50 SMTP protocol entries
      steps,
      instructions: {
        sendTestEmail: "POST /api/test-email — sends a real email (Admin only)",
        renderLogs: "Render Dashboard → lerp-intranet → Logs → filter '[Email]' or '[test-email]'",
      },
    });
  } catch (error: any) {
    log("FATAL", error?.message || String(error));
    console.error("[test-email-GET] Fatal:", error);
    return NextResponse.json({ success: false, error: error?.message, steps }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════ */
/* ─── POST: send a real test email (Admin only)   ────── */
/* ═══════════════════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  const steps: { time: string; step: string; result: string }[] = [];
  const smtpLogs: string[] = [];
  const log = (step: string, result: string) => {
    steps.push({ time: ts(), step, result });
    console.log(`[test-email-POST] ${step}: ${result}`);
  };

  try {
    log("START", "POST /api/test-email — ultra-verbose mode");

    // Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    log("Auth", `userId=${session.user.id}`);

    // Admin check
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category !== "Admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    log("Admin", `✅ ${user.name} (${user.email})`);

    // Recipient
    let recipient = user.email || "";
    try {
      const body = await request.json().catch(() => ({}));
      if ((body as any)?.to) {
        recipient = (body as any).to;
        log("Custom recipient", recipient);
      }
    } catch { /* body optional */ }

    if (!recipient) {
      return NextResponse.json({ error: "No recipient email", steps }, { status: 400 });
    }
    log("Recipient", recipient);

    // Env vars
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    log("EMAIL_USER", emailUser ? `"${emailUser}"` : "⚠️ NOT SET");
    log("EMAIL_PASS", emailPass
      ? `SET (length=${emailPass.length}, masked=${mask(emailPass)}, hasSpaces=${emailPass.includes(" ")})`
      : "⚠️ NOT SET");

    if (!emailPass) {
      return NextResponse.json({
        success: false,
        error: "EMAIL_PASS not configured",
        steps,
        fix: "Add EMAIL_PASS (Gmail App Password, 16 chars, no spaces) to Render env vars",
      }, { status: 500 });
    }

    // DNS check
    const dnsResult = await dnsLookup("smtp.gmail.com");
    log("DNS", dnsResult.ok ? `✅ ${dnsResult.addresses?.join(",")}` : `❌ ${dnsResult.error}`);

    // TCP check
    const tcp587 = await testTcpPort("smtp.gmail.com", 587, 8000);
    log("TCP :587", tcp587.ok ? `✅ ${tcp587.ms}ms` : `❌ ${tcp587.error}`);

    if (!tcp587.ok) {
      // Fallback: try 465
      const tcp465 = await testTcpPort("smtp.gmail.com", 465, 8000);
      log("TCP :465 (fallback)", tcp465.ok ? `✅ ${tcp465.ms}ms` : `❌ ${tcp465.error}`);

      if (!tcp465.ok) {
        return NextResponse.json({
          success: false,
          error: "Cannot reach smtp.gmail.com on port 587 or 465 — firewall or network issue",
          steps,
          tcp: { port587: tcp587, port465: tcp465 },
        }, { status: 500 });
      }
    }

    // Create transporter with full debug
    log("Transporter", "Creating with port=587, secure=false, STARTTLS, debug=true...");
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: emailUser || "lerpfeq@gmail.com", pass: emailPass },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 20000,
      tls: { rejectUnauthorized: false },
      debug: true,
      logger: {
        info: (entry: any) => { smtpLogs.push(`[INFO] ${JSON.stringify(entry)}`); },
        debug: (entry: any) => { smtpLogs.push(`[DEBUG] ${JSON.stringify(entry)}`); },
        warn: (entry: any) => { smtpLogs.push(`[WARN] ${JSON.stringify(entry)}`); },
        error: (entry: any) => { smtpLogs.push(`[ERROR] ${JSON.stringify(entry)}`); },
        trace: (entry: any) => { smtpLogs.push(`[TRACE] ${JSON.stringify(entry)}`); },
        fatal: (entry: any) => { smtpLogs.push(`[FATAL] ${JSON.stringify(entry)}`); },
        log: (entry: any) => { smtpLogs.push(`[LOG] ${JSON.stringify(entry)}`); },
      } as any,
    });
    log("Transporter", "✅ Created");

    // Verify SMTP
    log("SMTP verify", "Starting verify()...");
    const verifyStart = Date.now();
    try {
      await transporter.verify();
      log("SMTP verify", `✅ OK in ${Date.now() - verifyStart}ms`);
    } catch (verifyErr: any) {
      const verifyMs = Date.now() - verifyStart;
      log("SMTP verify", `❌ FAILED after ${verifyMs}ms: ${verifyErr?.message}`);
      log("SMTP verify code", verifyErr?.code || "N/A");
      log("SMTP verify responseCode", verifyErr?.responseCode || "N/A");
      transporter.close();
      return NextResponse.json({
        success: false,
        error: `SMTP verify failed: ${verifyErr?.message}`,
        verifyMs,
        errorCode: verifyErr?.code,
        responseCode: verifyErr?.responseCode,
        smtpProtocolLogs: smtpLogs.slice(0, 80),
        steps,
        possibleCauses: [
          "Gmail App Password invalid/revoked — regenerate at myaccount.google.com/apppasswords",
          "2FA not enabled on Gmail account — required for App Passwords",
          "EMAIL_PASS has trailing spaces or wrong characters",
          `Current EMAIL_PASS length: ${emailPass.length} (expected: 16)`,
          "Render firewall blocking SMTP",
        ],
      }, { status: 500 });
    }

    // Build and send email
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
        <tr><td style="padding:6px 12px;color:#666;border-bottom:1px solid #eee;"><strong>SMTP</strong></td><td style="padding:6px 12px;border-bottom:1px solid #eee;">smtp.gmail.com:587 (STARTTLS)</td></tr>
        <tr><td style="padding:6px 12px;color:#666;border-bottom:1px solid #eee;"><strong>Sender</strong></td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${emailUser || "lerpfeq@gmail.com"}</td></tr>
        <tr><td style="padding:6px 12px;color:#666;border-bottom:1px solid #eee;"><strong>Date</strong></td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${dateStr}</td></tr>
        <tr><td style="padding:6px 12px;color:#666;"><strong>Node</strong></td><td style="padding:6px 12px;">${process.version}</td></tr>
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

    const from = `"LERP — FEQ/UNICAMP" <${emailUser || "lerpfeq@gmail.com"}>`;
    const subject = `📧 LERP Email Test — ${dateStr}`;

    log("Send", `Sending to ${recipient}...`);
    const sendStart = Date.now();
    const info = await transporter.sendMail({ from, to: recipient, subject, html });
    const sendMs = Date.now() - sendStart;

    log("Send", `✅ Sent in ${sendMs}ms`);
    log("messageId", info.messageId);
    log("response", info.response || "(none)");
    log("accepted", JSON.stringify(info.accepted));
    log("rejected", JSON.stringify(info.rejected));

    transporter.close();
    log("Done", "Transporter closed");

    return NextResponse.json({
      success: true,
      message: `✅ Test email sent to ${recipient}`,
      messageId: info.messageId,
      smtpResponse: info.response,
      sendMs,
      config: {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        tls: "STARTTLS",
      },
      smtpProtocolLogs: smtpLogs.slice(0, 50),
      steps,
    });
  } catch (error: any) {
    log("FATAL", `${error?.message || error}`);
    console.error("[test-email-POST] Fatal:", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Unknown error",
      code: error?.code,
      smtpProtocolLogs: smtpLogs.slice(0, 80),
      steps,
    }, { status: 500 });
  }
}
