import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET  /api/test-email — Ultra-verbose diagnostic (no email sent)
 * POST /api/test-email — Send a real test email (Admin only)
 *
 * Supports Resend (preferred) and SMTP (legacy fallback).
 * FROM email hardcoded to "onboarding@resend.dev" for Resend testing.
 */

/* ─── helpers ─── */
const ts = () => new Date().toISOString();
const mask = (v: string | undefined) => {
  if (!v) return "(undefined)";
  if (v.length <= 6) return `****(len=${v.length})`;
  return v.slice(0, 4) + "****" + v.slice(-4) + ` (len=${v.length})`;
};

/* ─── FROM address for Resend (hardcoded for reliability) ─── */
const RESEND_FROM = "LERP <onboarding@resend.dev>";

/* ═══════════════════════════════════════════════════════════════ */
/* GET: full diagnostic — env vars, key validation, API test     */
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

    // ─── RESEND_API_KEY deep inspection ───
    const rawKey = process.env.RESEND_API_KEY;
    log("RESEND_API_KEY typeof", typeof rawKey);
    log("RESEND_API_KEY undefined?", String(rawKey === undefined));
    log("RESEND_API_KEY null?", String(rawKey === null));
    log("RESEND_API_KEY empty?", String(rawKey === ""));
    log("RESEND_API_KEY length", String(rawKey?.length ?? "N/A"));
    log("RESEND_API_KEY trimmed length", String(rawKey?.trim()?.length ?? "N/A"));
    log("RESEND_API_KEY first 10", rawKey ? `"${rawKey.slice(0, 10)}..."` : "N/A");
    log("RESEND_API_KEY starts re_?", String(rawKey?.startsWith("re_") ?? "N/A"));
    log("RESEND_API_KEY truthy?", String(!!rawKey));

    // Check for whitespace issues
    if (rawKey && rawKey !== rawKey.trim()) {
      log("⚠️ WHITESPACE", `Key has extra whitespace! raw="${rawKey.length}" trimmed="${rawKey.trim().length}"`);
    }

    // ─── Other env vars ───
    const resendFrom = process.env.RESEND_FROM_EMAIL;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    log("RESEND_FROM_EMAIL", resendFrom || `(not set — will use "${RESEND_FROM}")`);
    log("EMAIL_USER", emailUser || "NOT SET");
    log("EMAIL_PASS", emailPass ? `SET (len=${emailPass.length})` : "NOT SET");
    log("NODE_ENV", process.env.NODE_ENV || "not set");

    // ─── Transport decision ───
    const trimmedKey = rawKey?.trim();
    let transport: string;
    if (trimmedKey && trimmedKey.length > 0) {
      transport = "RESEND ✅";
    } else if (emailPass) {
      transport = "SMTP ⚠️ (legacy, may be blocked)";
    } else {
      transport = "NONE ❌ (no RESEND_API_KEY or EMAIL_PASS)";
    }
    log("Selected transport", transport);
    log("FROM email (Resend)", RESEND_FROM);

    // ─── Scan ALL env vars for email/smtp/resend ───
    const relatedVars: Record<string, string> = {};
    for (const key of Object.keys(process.env).sort()) {
      if (/email|mail|smtp|resend/i.test(key)) {
        relatedVars[key] = mask(process.env[key]);
      }
    }
    log("All related env vars", JSON.stringify(relatedVars));

    // ─── Test Resend API key validity ───
    let resendValid = false;
    let resendError = "";
    let resendDomains: string[] = [];

    if (trimmedKey && trimmedKey.length > 0) {
      log("Resend API test", "Testing API key by calling resend.domains.list()...");
      try {
        const resend = new Resend(trimmedKey);
        const listStart = Date.now();
        const { data: domainsData, error: domainsError } = await resend.domains.list();
        const listMs = Date.now() - listStart;

        if (domainsError) {
          resendError = domainsError.message;
          log("Resend API test", `❌ API returned error in ${listMs}ms: ${domainsError.message}`);
          log("Resend error details", JSON.stringify(domainsError));

          // Diagnose
          if (domainsError.message.includes("invalid") || domainsError.message.includes("unauthorized")) {
            log("🔍 Diagnosis", "API key appears INVALID. Go to resend.com/api-keys and create a new one");
          }
        } else {
          resendValid = true;
          resendDomains = domainsData?.data?.map((d: any) => `${d.name} (${d.status})`) || [];
          log("Resend API test", `✅ API key VALID in ${listMs}ms`);
          log("Resend domains", resendDomains.length > 0 ? resendDomains.join(", ") : "(none — using onboarding@resend.dev)");
        }
      } catch (err: any) {
        resendError = err?.message || String(err);
        log("Resend API test", `❌ EXCEPTION: ${resendError}`);
        log("Resend error type", err?.name || "unknown");
        log("Resend error code", err?.statusCode || err?.status || err?.code || "N/A");

        try {
          log("Resend error full", JSON.stringify(err, Object.getOwnPropertyNames(err)));
        } catch {
          log("Resend error string", String(err));
        }
      }
    } else {
      log("Resend API test", "⏭️ Skipped — no RESEND_API_KEY set");
    }

    // ─── User info ───
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    log("User", `${user?.name} <${user?.email}>, category=${user?.category}`);

    return NextResponse.json({
      success: true,
      transport,
      fromEmail: RESEND_FROM,
      diagnostic: {
        resendApiKey: {
          set: !!rawKey,
          length: rawKey?.length ?? 0,
          trimmedLength: trimmedKey?.length ?? 0,
          hasWhitespace: rawKey ? rawKey !== rawKey.trim() : false,
          startsWithRe: rawKey?.startsWith("re_") ?? false,
          first10: rawKey ? rawKey.slice(0, 10) + "..." : null,
          valid: resendValid,
          error: resendError || null,
          domains: resendDomains,
        },
        fromEmail: RESEND_FROM,
        emailUser: emailUser || null,
        emailPassSet: !!emailPass,
        nodeEnv: process.env.NODE_ENV || null,
        nodeVersion: process.version,
        userEmail: user?.email || null,
        isAdmin: user?.category === "Admin",
      },
      allRelatedEnvVars: relatedVars,
      steps,
      howToFix: {
        noApiKey: "Add RESEND_API_KEY to Render env vars (go to resend.com → API Keys → Create)",
        invalidKey: "Go to resend.com/api-keys, delete old key, create new one, update in Render",
        fromError: `Using "${RESEND_FROM}" — this always works without domain verification`,
        smtpBlocked: "SMTP ports are blocked on Render — use Resend instead",
      },
    });
  } catch (error: any) {
    log("FATAL", error?.message || String(error));
    console.error("[test-email-GET] Fatal:", error);
    return NextResponse.json({ success: false, error: error?.message, steps }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════════════ */
/* POST: send a real test email (Admin only)                     */
/* ═══════════════════════════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  const steps: { time: string; step: string; result: string }[] = [];
  const log = (step: string, result: string) => {
    steps.push({ time: ts(), step, result });
    console.log(`[test-email-POST] ${step}: ${result}`);
  };

  try {
    log("START", `POST /api/test-email at ${ts()}`);

    // Auth + Admin check
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
    log("Recipient (TO)", recipient);

    // ─── Transport detection with deep logging ───
    const rawKey = process.env.RESEND_API_KEY;
    const trimmedKey = rawKey?.trim();
    const emailPass = process.env.EMAIL_PASS;

    log("RESEND_API_KEY", rawKey ? `SET (first10="${rawKey.slice(0, 10)}...", len=${rawKey.length}, trimmed=${trimmedKey?.length})` : "❌ NOT SET");
    log("EMAIL_PASS", emailPass ? `SET (len=${emailPass.length})` : "NOT SET");

    const useResend = !!(trimmedKey && trimmedKey.length > 0);
    const useSmtp = !useResend && !!(emailPass && emailPass.length > 0);

    log("Method selected", useResend ? "RESEND ✅" : useSmtp ? "SMTP ⚠️" : "NONE ❌");

    if (!useResend && !useSmtp) {
      return NextResponse.json({
        success: false,
        error: "No email transport configured",
        steps,
        fix: "Add RESEND_API_KEY to Render env vars. Get one at resend.com/api-keys",
        envState: {
          RESEND_API_KEY: rawKey === undefined ? "UNDEFINED" : rawKey === "" ? "EMPTY_STRING" : `SET(len=${rawKey?.length})`,
          EMAIL_PASS: emailPass === undefined ? "UNDEFINED" : emailPass === "" ? "EMPTY_STRING" : `SET(len=${emailPass?.length})`,
        },
      }, { status: 500 });
    }

    // ─── Build test email HTML ───
    const now = new Date();
    const dateStr = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const method = useResend ? "Resend API" : "Gmail SMTP";

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
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
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${method} ✅</td></tr>
        <tr><td style="padding:8px 12px;color:#666;border-bottom:1px solid #eee;"><strong>From</strong></td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${useResend ? RESEND_FROM : "lerpfeq@gmail.com"}</td></tr>
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
</body></html>`;

    const subject = `📧 LERP Email Test — ${dateStr}`;

    // ═══════════════════════════════════════════
    // RESEND PATH
    // ═══════════════════════════════════════════
    if (useResend) {
      log("Resend", `Creating client with key "${trimmedKey!.slice(0, 10)}..." (${trimmedKey!.length} chars)`);
      log("Resend FROM", RESEND_FROM);
      log("Resend TO", recipient);
      log("Resend SUBJECT", subject);

      const resend = new Resend(trimmedKey!);

      // Step 1: Validate API key by listing domains
      log("Resend validate", "Calling resend.domains.list() to verify API key...");
      try {
        const validateStart = Date.now();
        const { data: domData, error: domError } = await resend.domains.list();
        const validateMs = Date.now() - validateStart;

        if (domError) {
          log("Resend validate", `❌ API key ERROR in ${validateMs}ms: ${domError.message}`);
          log("Resend validate detail", JSON.stringify(domError));
          return NextResponse.json({
            success: false,
            transport: "resend",
            error: `Resend API key validation failed: ${domError.message}`,
            steps,
            fix: "Your RESEND_API_KEY appears invalid. Go to resend.com/api-keys and create a new one.",
          }, { status: 500 });
        }

        const domains = domData?.data?.map((d: any) => `${d.name}(${d.status})`) || [];
        log("Resend validate", `✅ API key VALID in ${validateMs}ms — domains: [${domains.join(", ")}]`);
      } catch (valErr: any) {
        log("Resend validate", `❌ EXCEPTION: ${valErr?.message}`);
        // Don't return — still try to send (some Resend plans may not have domains.list)
        log("Resend validate", "Continuing to try send anyway...");
      }

      // Step 2: Actually send the email
      log("Resend send", `Calling resend.emails.send() NOW...`);
      const sendStart = Date.now();

      try {
        const sendResult = await resend.emails.send({
          from: RESEND_FROM,
          to: [recipient],
          subject,
          html,
        });

        const sendMs = Date.now() - sendStart;

        log("Resend send", `API call completed in ${sendMs}ms`);
        log("Resend raw result", JSON.stringify(sendResult));

        const { data: sendData, error: sendError } = sendResult;

        if (sendError) {
          log("Resend send ERROR", `message: ${sendError.message}`);
          log("Resend send ERROR name", (sendError as any).name || "N/A");
          log("Resend send ERROR statusCode", String((sendError as any).statusCode || "N/A"));
          log("Resend send ERROR full", JSON.stringify(sendError));

          // Diagnose specific errors
          let diagnosis = "";
          const msg = sendError.message.toLowerCase();
          if (msg.includes("api key")) {
            diagnosis = "API key is invalid or revoked. Create a new one at resend.com/api-keys";
          } else if (msg.includes("domain") || msg.includes("not verified") || msg.includes("not allowed")) {
            diagnosis = `FROM address domain not verified. Current FROM is "${RESEND_FROM}" which should work without verification. If you changed RESEND_FROM_EMAIL, remove it and use default.`;
          } else if (msg.includes("rate") || msg.includes("limit")) {
            diagnosis = "Rate limited. Free tier is 2 emails/second, 100/day. Wait and retry.";
          } else if (msg.includes("validation") || msg.includes("invalid")) {
            diagnosis = `Validation error. Check TO address "${recipient}" is valid.`;
          } else {
            diagnosis = "Unknown error. Check the full error details above.";
          }
          log("🔍 Diagnosis", diagnosis);

          return NextResponse.json({
            success: false,
            transport: "resend",
            error: sendError.message,
            errorDetails: sendError,
            sendMs,
            fromUsed: RESEND_FROM,
            toUsed: recipient,
            diagnosis,
            steps,
          }, { status: 500 });
        }

        // SUCCESS!
        log("Resend send", `✅ SUCCESS in ${sendMs}ms`);
        log("Resend email id", sendData?.id || "N/A");
        log("Resend full data", JSON.stringify(sendData));

        return NextResponse.json({
          success: true,
          transport: "resend",
          message: `✅ Test email sent to ${recipient} via Resend!`,
          emailId: sendData?.id,
          fromUsed: RESEND_FROM,
          sendMs,
          steps,
        });

      } catch (sendErr: any) {
        const sendMs = Date.now() - sendStart;

        log("Resend send EXCEPTION", `${sendErr?.message}`);
        log("Resend exception name", sendErr?.name || "N/A");
        log("Resend exception statusCode", String(sendErr?.statusCode || sendErr?.status || "N/A"));
        log("Resend exception code", sendErr?.code || "N/A");

        try {
          log("Resend exception full", JSON.stringify(sendErr, Object.getOwnPropertyNames(sendErr)));
        } catch {
          log("Resend exception string", String(sendErr));
        }

        return NextResponse.json({
          success: false,
          transport: "resend",
          error: sendErr?.message || String(sendErr),
          errorType: sendErr?.name,
          sendMs,
          fromUsed: RESEND_FROM,
          toUsed: recipient,
          steps,
        }, { status: 500 });
      }
    }

    // ═══════════════════════════════════════════
    // SMTP FALLBACK PATH
    // ═══════════════════════════════════════════
    const emailUser = process.env.EMAIL_USER || "lerpfeq@gmail.com";
    const from = `"LERP — FEQ/UNICAMP" <${emailUser}>`;

    log("SMTP", `host=smtp.gmail.com, port=587, user=${emailUser}`);
    log("⚠️", "SMTP is typically BLOCKED on Render. Consider using Resend instead.");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: emailUser, pass: emailPass! },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 20000,
      tls: { rejectUnauthorized: false },
    });

    try {
      log("SMTP verify", "Testing connection...");
      await transporter.verify();
      log("SMTP verify", "✅ OK");
    } catch (err: any) {
      log("SMTP verify", `❌ FAILED: ${err?.message}`);
      transporter.close();
      return NextResponse.json({
        success: false,
        transport: "smtp",
        error: `SMTP connection failed: ${err?.message}`,
        steps,
        fix: "SMTP ports are blocked on Render. Add RESEND_API_KEY env var instead.",
      }, { status: 500 });
    }

    const sendStart = Date.now();
    const info = await transporter.sendMail({ from, to: recipient, subject, html });
    const sendMs = Date.now() - sendStart;
    transporter.close();

    log("SMTP send", `✅ OK in ${sendMs}ms — ${info.messageId}`);

    return NextResponse.json({
      success: true,
      transport: "smtp",
      message: `✅ Test email sent to ${recipient} via SMTP`,
      messageId: info.messageId,
      sendMs,
      steps,
    });

  } catch (error: any) {
    log("FATAL", `${error?.message || error}`);
    console.error("[test-email-POST] Fatal:", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Unknown error",
      steps,
    }, { status: 500 });
  }
}
