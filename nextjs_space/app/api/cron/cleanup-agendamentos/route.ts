import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Cron Job - Run daily at 00:05
// Deleta bookings que já passaram
// Can be called via external cron (e.g. cron-job.org) or Render Cron
export async function GET(request: NextRequest) {
  try {
    // Verificar token de segurança (para chamadas externas)
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const cronSecret = process.env.CRON_SECRET || 'lerp-cron-2026';

    if (token !== cronSecret) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const now = new Date();

    // Deletar bookings onde o fim já passou
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
