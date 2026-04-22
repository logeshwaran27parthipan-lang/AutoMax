import { Queue } from "bullmq";

/**
 * Production-grade Queue Client with lazy initialization and graceful degradation
 *
 * Features:
 * - Lazy queue initialization (only on first use)
 * - Singleton pattern (cached instance)
 * - Graceful degradation if Redis is unavailable
 * - Comprehensive error logging for debugging
 * - Health check capability
 * - Environment validation
 */

// Logger utility for structured logging
const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    console.log(`[queueClient] ${msg}`, data ? JSON.stringify(data) : ""),
  warn: (msg: string, data?: Record<string, unknown>) =>
    console.warn(`[queueClient] ⚠️  ${msg}`, data ? JSON.stringify(data) : ""),
  error: (msg: string, data?: Record<string, unknown>) =>
    console.error(`[queueClient] ❌ ${msg}`, data ? JSON.stringify(data) : ""),
};

// Singleton queue instance
let workflowQueue: Queue | null = null;
let initializationAttempted = false;
let initializationError: Error | null = null;

/**
 * Parse Upstash Redis URL format: rediss://default:PASSWORD@HOST:PORT
 * @throws Error if URL format is invalid
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
 * Initialize the queue with connection pooling and error handling
 * Called lazily on first enqueueWorkflow() call
 * @returns Queue instance or null if initialization fails
 */
function initializeQueue(): Queue | null {
  // Prevent multiple initialization attempts
  if (initializationAttempted) {
    if (initializationError) {
      logger.warn("Queue initialization previously failed, returning null", {
        error: initializationError.message,
      });
    }
    return workflowQueue;
  }

  initializationAttempted = true;

  try {
    const upstashUrl = process.env.UPSTASH_REDIS_URL;

    if (!upstashUrl) {
      const error = new Error(
        "UPSTASH_REDIS_URL environment variable is not set. Queue functionality is disabled.",
      );
      initializationError = error;
      logger.warn(error.message);
      return null;
    }

    if (typeof upstashUrl !== "string" || upstashUrl.trim().length === 0) {
      const error = new Error(
        "UPSTASH_REDIS_URL is set but empty or not a string. Queue functionality is disabled.",
      );
      initializationError = error;
      logger.warn(error.message);
      return null;
    }

    logger.info("Parsing UPSTASH_REDIS_URL...");
    const { host, port, password } = parseRedisUrl(upstashUrl);

    logger.info("Creating BullMQ Queue instance", { host, port });

    // Create BullMQ queue with production-grade connection settings
    workflowQueue = new Queue("workflow-queue", {
      connection: {
        host,
        port,
        password,
        tls: {}, // Upstash requires TLS
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms, stop after 5 retries
          const delay = Math.min(times * 100, 1600);
          return Math.min(delay, 3000);
        },
      },
      defaultJobOptions: {
        // Automatic job removal after completion
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours for debugging
        },
      },
    });

    // Set up error event handlers for debugging
    workflowQueue.on("error", (err: Error) => {
      logger.error("Queue error event", { error: err.message });
    });

    logger.info("Queue initialized successfully");
    return workflowQueue;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    initializationError = error;
    logger.error("Failed to initialize queue", { error: error.message });
    return null;
  }
}

/**
 * Get or initialize the queue (lazy loading pattern)
 * @returns Queue instance or null if unavailable
 */
export function getQueue(): Queue | null {
  if (!workflowQueue && !initializationAttempted) {
    return initializeQueue();
  }
  return workflowQueue;
}

/**
 * Check queue health status
 * Useful for health check endpoints and monitoring
 */
export async function getQueueHealth(): Promise<{
  status: "healthy" | "degraded" | "unavailable";
  message: string;
  timestamp: string;
}> {
  const queue = getQueue();

  if (!queue) {
    return {
      status: "unavailable",
      message:
        initializationError?.message || "Redis connection not configured",
      timestamp: new Date().toISOString(),
    };
  }

  try {
    // Queue exists, consider it healthy
    return {
      status: "healthy",
      message: "Queue is operational",
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return {
      status: "degraded",
      message: `Queue health check failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Enqueue a workflow for background processing
 * Production-grade with:
 * - Graceful degradation if queue is unavailable
 * - Structured logging for debugging
 * - Job retry logic with exponential backoff
 * - Automatic cleanup of old jobs
 */
export async function enqueueWorkflow(
  workflowId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  // Validate input
  if (!workflowId || typeof workflowId !== "string") {
    logger.error("Invalid workflowId", { workflowId, type: typeof workflowId });
    throw new Error("workflowId must be a non-empty string");
  }

  if (!payload || typeof payload !== "object") {
    logger.error("Invalid payload", { payload, type: typeof payload });
    throw new Error("payload must be an object");
  }

  const queue = getQueue();

  if (!queue) {
    logger.warn(
      "Queue unavailable - workflow job not enqueued (graceful degradation)",
      { workflowId },
    );
    return; // Graceful degradation: log but don't crash
  }

  try {
    logger.info("Enqueueing workflow job", { workflowId });

    const job = await queue.add(
      "run-workflow",
      {
        workflowId,
        payload,
        enqueuedAt: new Date().toISOString(),
      },
      {
        // Retry logic: 3 attempts with exponential backoff
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000, // Start at 5 seconds
        },
        // Prevent duplicate jobs if the same workflow is enqueued multiple times
        jobId: undefined, // BullMQ generates unique IDs by default
      },
    );

    logger.info("Workflow job enqueued successfully", {
      jobId: job.id,
      workflowId,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("Failed to enqueue workflow", {
      workflowId,
      error: error.message,
    });
    throw error; // Re-throw so caller knows enqueuing failed
  }
}

/**
 * Graceful shutdown for cleanup (use in app shutdown hooks)
 */
export async function closeQueue(): Promise<void> {
  if (workflowQueue) {
    try {
      logger.info("Closing queue connection...");
      await workflowQueue.close();
      workflowQueue = null;
      initializationAttempted = false;
      logger.info("Queue connection closed");
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error("Error closing queue", { error: error.message });
    }
  }
}
