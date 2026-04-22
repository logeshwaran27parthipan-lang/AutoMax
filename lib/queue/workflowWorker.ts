import { Worker } from "bullmq";
import { processEvent } from "../engine/workflowEngine";

/**
 * Production-grade Worker with lazy initialization
 * Processes workflow jobs from BullMQ queue
 */

const logger = {
  info: (msg: string) => console.log(`[workflowWorker] ${msg}`),
  warn: (msg: string) => console.warn(`[workflowWorker] ⚠️  ${msg}`),
  error: (msg: string) => console.error(`[workflowWorker] ❌ ${msg}`),
};

/**
 * Parse Upstash Redis URL format: rediss://default:PASSWORD@HOST:PORT
 */
function parseRedisUrl(url: string) {
  try {
    const urlObj = new URL(url);
    const password = urlObj.password;
    const host = urlObj.hostname;
    const port = parseInt(urlObj.port, 10);

    if (!host || !port || isNaN(port)) {
      throw new Error(
        `Invalid Redis URL: missing host (${host}), port (${port}), or port is not a number`,
      );
    }

    return { host, port, password };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse UPSTASH_REDIS_URL: ${message}`);
  }
}

/**
 * Initialize and start the worker
 */
function startWorker(): Worker | null {
  try {
    const upstashUrl = process.env.UPSTASH_REDIS_URL;

    if (!upstashUrl) {
      logger.error("UPSTASH_REDIS_URL is not set - worker cannot start");
      process.exit(1); // Worker must have Redis, exit immediately
    }

    logger.info("Parsing UPSTASH_REDIS_URL...");
    const { host, port, password } = parseRedisUrl(upstashUrl);

    logger.info("Starting BullMQ worker...");

    const worker = new Worker(
      "workflow-queue",
      async (job) => {
        try {
          const { workflowId, payload } = job.data;
          logger.info(`Processing job ${job.id} for workflow ${workflowId}`);

          // Process the workflow event
          await processEvent("schedule", {
            workflowId,
            ...payload,
          });

          logger.info(`Job ${job.id} completed successfully`);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          logger.error(`Job ${job.id} failed: ${error.message}`);
          throw error; // Re-throw to mark job as failed
        }
      },
      {
        connection: {
          host,
          port,
          password,
          tls: {},
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          enableOfflineQueue: false,
        },
      },
    );

    // Error handling
    worker.on("error", (err) => {
      logger.error(`Worker error: ${err.message}`);
    });

    worker.on("failed", (job, err) => {
      logger.warn(`Job ${job?.id} failed: ${err.message}`);
    });

    worker.on("completed", (job) => {
      logger.info(`Job ${job.id} completed`);
    });

    logger.info("Worker started successfully");
    return worker;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`Failed to start worker: ${error.message}`);
    process.exit(1);
  }
}

// Start the worker when this module is loaded
logger.info("AutoMax worker initializing...");
const workflowWorkerInstance = startWorker();
export const workflowWorker = workflowWorkerInstance;

// Set up event listeners
if (workflowWorker) {
  workflowWorker.on("error", (err) => {
    logger.error(`Worker error: ${err.message}`);
  });

  workflowWorker.on("failed", (job, err) => {
    logger.warn(`Job ${job?.id} failed: ${err.message}`);
  });

  workflowWorker.on("completed", (job) => {
    logger.info(`Job ${job.id} completed`);
  });
}
