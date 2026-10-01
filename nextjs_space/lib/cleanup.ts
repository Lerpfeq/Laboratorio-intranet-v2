import { prisma } from '@/lib/prisma';

/**
 * Deletes all past bookings (where `fim` < now).
 * Called by the internal cron job (instrumentation.ts) and the admin API route.
 */
export async function cleanupPastBookings(): Promise<{ deleted: number; timestamp: string }> {
  const now = new Date();
  const result = await prisma.agendamento.deleteMany({
    where: { fim: { lt: now } },
  });
  const timestamp = now.toISOString();
  console.log(`[cleanup] Deleted ${result.count} past booking(s) at ${timestamp}`);
  return { deleted: result.count, timestamp };
}
