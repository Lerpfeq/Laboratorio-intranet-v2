/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Schedules a daily cron job to delete past bookings at 00:05 every day.
 * Only runs in the Node.js runtime (not in Edge runtime / client bundles).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Dynamically import node-cron so it never reaches the client bundle
  const cron = (await import('node-cron')).default;
  const { cleanupPastBookings } = await import('@/lib/cleanup');

  // Run every day at 00:05
  cron.schedule('5 0 * * *', async () => {
    try {
      const result = await cleanupPastBookings();
      console.log(`[cron] Cleanup done: ${result.deleted} booking(s) deleted`);
    } catch (err) {
      console.error('[cron] Cleanup failed:', err);
    }
  });

  console.log('[cron] Daily booking cleanup scheduled (00:05 every day)');
}
