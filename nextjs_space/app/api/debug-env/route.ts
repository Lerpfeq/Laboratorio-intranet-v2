import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug-env
 * Shows all environment details relevant to email configuration.
 * Admin only. All secrets masked.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category !== "Admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const mask = (val: string | undefined): string => {
      if (!val) return "(undefined)";
      if (val.length <= 4) return `****(len=${val.length})`;
      return `${val.slice(0, 3)}****${val.slice(-3)} (len=${val.length})`;
    };

    // Email-specific variables
    const emailVars: Record<string, any> = {};
    const emailKeys = ["EMAIL_USER", "EMAIL_PASS", "SMTP_HOST", "SMTP_PORT", "SMTP_SECURE",
                       "SENDGRID_API_KEY", "RESEND_API_KEY", "MAILGUN_API_KEY"];
    for (const key of emailKeys) {
      const val = process.env[key];
      emailVars[key] = {
        defined: val !== undefined,
        value: key === "EMAIL_USER" ? val : mask(val),
        length: val?.length || 0,
        ...(key === "EMAIL_PASS" && val ? {
          hasSpaces: val.includes(" "),
          isAlphaOnly: /^[a-z]+$/i.test(val),
          charCodes: val.split("").map(c => c.charCodeAt(0)).join(","),
        } : {}),
      };
    }

    // Check for stale / conflicting vars
    const staleVars = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE"].filter(k => process.env[k] !== undefined);

    // All env vars that mention email/smtp/mail (masked)
    const allRelated: Record<string, string> = {};
    for (const key of Object.keys(process.env).sort()) {
      if (/email|mail|smtp/i.test(key)) {
        allRelated[key] = mask(process.env[key]);
      }
    }

    // Database check
    const totalUsers = await prisma.user.count();
    const adminUsers = await prisma.user.count({ where: { category: "Admin" } });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),

      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        nodeEnv: process.env.NODE_ENV || "(not set)",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        uptime: `${Math.round(process.uptime())}s`,
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },

      emailConfig: emailVars,

      warnings: [
        ...(staleVars.length > 0
          ? [`⚠️ STALE VARS still defined (should delete from Render): ${staleVars.join(", ")}`]
          : []),
        ...(!process.env.EMAIL_PASS ? ["❌ EMAIL_PASS is NOT defined — emails will NOT send"] : []),
        ...(process.env.EMAIL_PASS && process.env.EMAIL_PASS.includes(" ")
          ? ["⚠️ EMAIL_PASS contains SPACES — may cause authentication failure"]
          : []),
        ...(process.env.EMAIL_PASS && process.env.EMAIL_PASS.length !== 16
          ? [`⚠️ EMAIL_PASS length=${process.env.EMAIL_PASS.length} (expected 16 for Gmail App Password)`]
          : []),
      ],

      allEmailRelatedEnvVars: allRelated,

      database: {
        totalUsers,
        adminUsers,
        currentUser: {
          name: user?.name,
          email: user?.email,
          category: user?.category,
        },
      },

      expectedConfig: {
        note: "The code should be using these settings:",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: "EMAIL_USER + EMAIL_PASS from env",
        tls: "rejectUnauthorized: false",
        timeouts: "20000ms (connection, greeting, socket)",
        debug: true,
        logger: true,
      },
    });
  } catch (error: any) {
    console.error("[debug-env] Error:", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Unknown error",
    }, { status: 500 });
  }
}
