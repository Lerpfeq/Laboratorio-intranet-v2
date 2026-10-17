/**
 * Next.js instrumentation hook — runs once when the server starts.
 * The import must live inside the `NEXT_RUNTIME === 'nodejs'` branch so webpack
 * drops it from the Edge build (node-cron needs child_process/path).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCronJobs } = await import('./lib/cron');
    startCronJobs();
  }
}
