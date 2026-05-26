import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

/**
 * GET /api/test-email
 *   — Diagnostic: shows env var status (no email sent)
 *
 * POST /api/test-email
 *   — Sends a real test email to the logged-in user's address
 *   — Admin only
 *
 * Both return detailed step-by-step diagnostic info.
 */

/* ─── helpers ─── */
function ts() {
  return new Date().toISOString();
}

function mask(val: string | undefined): string {
  if (!val) return "(undefined/empty)";
  if (val.length <= 4) return "****";
  return val.slice(0, 3) + "****" + val.slice(-3);
}

/* ─── GET: environment check (any authenticated user) ─── */
export async function GET() {
  const steps: { time: string; step: string; result: string }[] = [];
  const log = (step: string, result: string) => {
    steps.push({ time: ts(), step, result });
    console.log(`[test-email] ${step}: ${result}`);
  };

  try {
    // Step 1: Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    log("Auth", `Authenticated as userId=${session.user.id}`);

    // Step 2: Check env vars
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const nodeEnv = process.env.NODE_ENV;

    log("EMAIL_USER", emailUser ? `"${emailUser}"` : "⚠️  NOT SET (undefined)");
    log("EMAIL_PASS", emailPass ? `SET (masked: ${mask(emailPass)}, length=${emailPass.length})` : "⚠️  NOT SET (undefined)");
    log("NODE_ENV", nodeEnv || "(not set)");

    // Step 3: Check all env vars that contain EMAIL
    const allEmailEnvs: Record<string, string> = {};
    for (const key of Object.keys(process.env)) {
      if (key.toLowerCase().includes("email") || key.toLowerCase().includes("mail") || key.toLowerCase().includes("smtp")) {
        allEmailEnvs[key] = mask(process.env[key]);
      }
    }
    log("Related env vars", JSON.stringify(allEmailEnvs));

    // Step 4: Try creating transporter
    let transporterOk = false;
    let transporterError = "";
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
        });
        log("Create transporter", "✅ Created (port 587 STARTTLS)");

        // Step 5: Verify transporter (SMTP handshake)
        await transporter.verify();
        transporterOk = true;
        log("SMTP verify", "✅ Connection verified — SMTP is working");
        transporter.close();
      } catch (err: any) {
        transporterError = err?.message || String(err);
        log("SMTP verify", `❌ FAILED: ${transporterError}`);
      }
    } else {
      log("Create transporter", "⏭️  Skipped — missing EMAIL_USER or EMAIL_PASS");
    }

    // Step 6: Check user info
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    log("User info", `name="${user?.name}", email="${user?.email}", category="${user?.category}"`);

    return NextResponse.json({
      success: true,
      diagnostic: {
        emailUserSet: !!emailUser,
        emailPassSet: !!emailPass,
        emailUser: emailUser || null,
        emailPassMasked: emailPass ? mask(emailPass) : null,
        emailPassLength: emailPass?.length || 0,
        smtpVerified: transporterOk,
        smtpError: transporterError || null,
        nodeEnv: nodeEnv || null,
        userEmail: user?.email || null,
        userName: user?.name || null,
        isAdmin: user?.category === "Admin",
      },
      steps,
      instructions: {
        toSendTestEmail: "POST /api/test-email (Admin only) — sends a real test email to your address",
        renderEnvVars: "Go to Render Dashboard → lerp-intranet → Environment → add EMAIL_USER and EMAIL_PASS",
        renderLogs: "Go to Render Dashboard → lerp-intranet → Logs → look for '[Email]' or '[test-email]' entries",
      },
    });
  } catch (error: any) {
    log("Fatal error", error?.message || String(error));
    return NextResponse.json({ success: false, error: error?.message, steps }, { status: 500 });
  }
}

/* ─── POST: send a real test email (Admin only) ─── */
export async function POST(request: NextRequest) {
  const steps: { time: string; step: string; result: string }[] = [];
  const log = (step: string, result: string) => {
    steps.push({ time: ts(), step, result });
    console.log(`[test-email] ${step}: ${result}`);
  };

  try {
    // Step 1: Auth
    log("Start", "POST /api/test-email initiated");
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    log("Auth", `userId=${session.user.id}`);

    // Step 2: Admin check
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category !== "Admin") {
      log("Admin check", "❌ Not admin");
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    log("Admin check", `✅ Admin user: ${user.name} (${user.email})`);

    // Optional: custom recipient from body
    let recipient = user.email || "";
    try {
      const body = await request.json().catch(() => ({}));
      if ((body as any)?.to) {
        recipient = (body as any).to;
        log("Custom recipient", recipient);
      }
    } catch {
      // body is optional
    }

    if (!recipient) {
      log("Recipient", "❌ No email address found for user");
      return NextResponse.json({ error: "No recipient email", steps }, { status: 400 });
    }
    log("Recipient", recipient);

    // Step 3: Check env vars
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    log("EMAIL_USER", emailUser ? `"${emailUser}"` : "⚠️  NOT SET");
    log("EMAIL_PASS", emailPass ? `SET (length=${emailPass.length}, masked=${mask(emailPass)})` : "⚠️  NOT SET");

    if (!emailPass) {
      log("Abort", "Cannot send — EMAIL_PASS is not configured");
      return NextResponse.json({
        success: false,
        error: "EMAIL_PASS is not configured in environment variables",
        steps,
        fix: "Add EMAIL_PASS to Render environment variables (Render Dashboard → Environment)",
      }, { status: 500 });
    }

    // Step 4: Create transporter
    log("Transporter", "Creating Gmail SMTP transporter...");
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: emailUser || "lerpfeq@gmail.com", pass: emailPass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
      tls: { rejectUnauthorized: false },
    });
    log("Transporter", "✅ Created (port 587 STARTTLS)");

    // Step 5: Verify SMTP connection
    log("SMTP verify", "Verifying connection...");
    try {
      await transporter.verify();
      log("SMTP verify", "✅ Connection verified");
    } catch (verifyErr: any) {
      log("SMTP verify", `❌ FAILED: ${verifyErr?.message}`);
      transporter.close();
      return NextResponse.json({
        success: false,
        error: `SMTP verification failed: ${verifyErr?.message}`,
        steps,
        possibleCauses: [
          "Gmail App Password is invalid or revoked",
          "2-Factor Authentication not enabled on Gmail account",
          "Less Secure Apps access issues",
          "Network/firewall blocking port 587 (STARTTLS)",
        ],
      }, { status: 500 });
    }

    // Step 6: Build email
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
      <p style="font-size:16px;color:#333;"><strong>✅ Email system is working correctly!</strong></p>
      <p style="color:#555;">This is an automated test from the LERP Intranet.</p>
      <ul style="color:#555;">
        <li><strong>SMTP:</strong> Gmail via App Password</li>
        <li><strong>Sender:</strong> ${emailUser || "lerpfeq@gmail.com"}</li>
        <li><strong>Date:</strong> ${dateStr}</li>
      </ul>
      <div style="text-align:center;margin:25px 0;">
        <a href="https://laborat-rio-intranet.onrender.com/agendamentos"
           target="_blank"
           style="display:inline-block;background:#4285f4;color:white;padding:14px 28px;
                  text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
          📅 Open Scheduling
        </a>
      </div>
      <p style="color:#888;font-size:13px;">If you received this email, the scheduling notifications should also work.</p>
    </div>
    <div style="background:#f9f9f9;padding:15px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;">LERP — Laboratório de Engenharia de Reações Poliméricas</p>
    </div>
  </div>
</body>
</html>`;

    const from = `"LERP — FEQ/UNICAMP" <${emailUser || "lerpfeq@gmail.com"}>`;
    const subject = `📧 LERP Email Test — ${dateStr}`;

    log("Send email", `Sending to ${recipient}...`);

    // Step 7: Send
    const startTime = Date.now();
    const info = await transporter.sendMail({ from, to: recipient, subject, html });
    const elapsed = Date.now() - startTime;

    log("Send email", `✅ Sent in ${elapsed}ms — messageId: ${info.messageId}`);
    log("SMTP response", info.response || "(no response string)");

    transporter.close();
    log("Cleanup", "Transporter closed");

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${recipient}`,
      messageId: info.messageId,
      smtpResponse: info.response,
      elapsedMs: elapsed,
      steps,
    });
  } catch (error: any) {
    log("Fatal error", `${error?.message || error}`);
    console.error("[test-email] Fatal error:", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Unknown error",
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      steps,
    }, { status: 500 });
  }
}
