import cron from 'node-cron';
import { cleanupPastBookings } from '@/lib/cleanup';

/** Schedules the daily cleanup of past bookings at 00:05 (Node.js runtime only). */
export function startCronJobs() {
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
