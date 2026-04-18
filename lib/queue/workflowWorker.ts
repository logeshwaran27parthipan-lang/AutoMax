import { Worker } from "bullmq";
import { processEvent } from "@/lib/engine/workflowEngine";

// Parse Upstash Redis URL format: rediss://default:PASSWORD@HOST:PORT
function parseRedisUrl(url: string) {
  const urlObj = new URL(url);

  const password = urlObj.password;
  const host = urlObj.hostname;
  const port = parseInt(urlObj.port, 10);

  if (!host || !port) {
    throw new Error("Invalid UPSTASH_REDIS_URL format");
  }

  return { host, port, password };
}

const upstashUrl = process.env.UPSTASH_REDIS_URL;

if (!upstashUrl) {
  throw new Error("UPSTASH_REDIS_URL is not set");
}

const { host, port, password } = parseRedisUrl(upstashUrl);

// Create BullMQ worker
export const workflowWorker = new Worker(
  "workflow-queue",
  async (job) => {
    const { workflowId, payload } = job.data;

    // Process the workflow event
    await processEvent("schedule", {
      workflowId,
      ...payload,
    });
  },
  {
    connection: {
      host,
      port,
      password,
      tls: {},
      maxRetriesPerRequest: null,
    },
  },
);

// Event listeners
workflowWorker.on("completed", (job) => {
  console.log(`Worker: job ${job.id} completed`);
});

workflowWorker.on("failed", (job, err) => {
  console.log(`Worker: job ${job?.id} failed — ${err?.message}`);
});
