import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Cron Job - Run daily at 00:05
// Deletes past bookings
// Can be called via external cron (e.g. cron-job.org) or Render Cron
export async function GET(request: NextRequest) {
  try {
    // Verify security token (for external calls)
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const cronSecret = process.env.CRON_SECRET || 'lerp-cron-2026';

    if (token !== cronSecret) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const now = new Date();

    // Delete bookings where end time has passed
    const result = await prisma.agendamento.deleteMany({
      where: {
        fim: { lt: now },
      },
    });

    console.log(`[Cron] Deleted ${result.count} past bookings at ${now.toISOString()}`);

    return NextResponse.json({
      success: true,
      deleted: result.count,
      executedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup error' }, { status: 500 });
  }
}
