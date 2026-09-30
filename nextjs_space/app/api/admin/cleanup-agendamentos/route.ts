import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Cleanup route — deletes all past bookings (where `fim` < now).
 *
 * Protected by the CLEANUP_SECRET env var. The secret can be provided via:
 *   - Header:  X-Cleanup-Secret: <secret>
 *   - Query:   ?secret=<secret>
 *
 * Accepts both GET (e.g. for cron/uptime pings) and POST.
 * Returns: { deleted: number, timestamp: string }
 */
async function handleCleanup(request: NextRequest) {
  const expected = process.env.CLEANUP_SECRET;

  if (!expected) {
    console.error('[cleanup-agendamentos] CLEANUP_SECRET is not configured');
    return NextResponse.json(
      { error: 'Cleanup is not configured on the server' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const provided =
    request.headers.get('x-cleanup-secret') || searchParams.get('secret') || '';

  if (provided !== expected) {
    console.warn('[cleanup-agendamentos] Rejected request with invalid secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const result = await prisma.agendamento.deleteMany({
    where: { fim: { lt: now } },
  });

  const timestamp = now.toISOString();
  console.log(
    `[cleanup-agendamentos] Deleted ${result.count} past booking(s) at ${timestamp}`
  );

  return NextResponse.json({ deleted: result.count, timestamp });
}

export async function GET(request: NextRequest) {
  try {
    return await handleCleanup(request);
  } catch (error: any) {
    console.error('[cleanup-agendamentos] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleCleanup(request);
  } catch (error: any) {
    console.error('[cleanup-agendamentos] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
