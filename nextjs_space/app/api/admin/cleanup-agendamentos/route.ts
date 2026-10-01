import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cleanupPastBookings } from '@/lib/cleanup';

export const dynamic = 'force-dynamic';

/**
 * Admin-only endpoint to manually trigger a past-booking cleanup.
 * The daily cleanup is handled automatically by the built-in cron job
 * registered in instrumentation.ts (runs at 00:05 every day).
 */
async function handleCleanup(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.category !== 'Admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const result = await cleanupPastBookings();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  try { return await handleCleanup(request); }
  catch (error: any) {
    console.error('[cleanup-agendamentos] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try { return await handleCleanup(request); }
  catch (error: any) {
    console.error('[cleanup-agendamentos] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
