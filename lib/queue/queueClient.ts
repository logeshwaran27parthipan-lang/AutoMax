import { Queue } from "bullmq";

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

// Create BullMQ queue with Upstash Redis connection
export const workflowQueue = new Queue("workflow-queue", {
  connection: {
    host,
    port,
    password,
    tls: {},
    maxRetriesPerRequest: null,
  },
});

// Enqueue a workflow job
export async function enqueueWorkflow(
  workflowId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await workflowQueue.add(
    "run-workflow",
    {
      workflowId,
      payload,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  );
}
