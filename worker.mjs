/**
 * DEPRECATED - This file is no longer used
 *
 * Production deployment should directly run:
 *   npx tsx lib/queue/workflowWorker.ts
 *
 * OR in Railway service start command:
 *   npx tsx lib/queue/workflowWorker.ts
 *
 * Why this changed:
 * - spawnSync blocks entire process (causes crash loops)
 * - Direct execution is cleaner and logs errors properly
 * - Railway can restart the actual process (better crash recovery)
 *
 * To deploy:
 * 1. Update Railway "AutoMax" service start command to:
 *    npx tsx lib/queue/workflowWorker.ts
 * 2. Redeploy
 * 3. Worker will run directly without wrapper
 *
 * Migration note: This file is kept for reference only
 */

console.error(
  "[WORKER] ERROR: worker.mjs is deprecated. Railway should run: npx tsx lib/queue/workflowWorker.ts",
);
process.exit(1);
