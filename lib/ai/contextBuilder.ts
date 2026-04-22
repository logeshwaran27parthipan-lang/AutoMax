import { prisma } from "@/lib/prisma";
import { distance } from "fastest-levenshtein";

/**
 * LAYER 2 - Account Context
 * Fetches user account snapshot: name, org, workflows, run stats for this week
 * Runs once on page mount. Never re-fetched mid-conversation.
 */
export async function buildAccountContext(userId: string): Promise<string> {
  try {
    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return "Account context unavailable.";
    }

    const userName = user.name || "User";

    // Fetch user's org membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: userId },
      include: { org: true },
    });

    const orgName = membership?.org?.name || "none";

    // Fetch active workflows
    const workflows = await prisma.workflow.findMany({
      where: {
        userId: userId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        triggers: true,
      },
    });

    // Fetch this week's run stats (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const runs = await prisma.workflowRun.findMany({
      where: {
        userId: userId,
        startedAt: {
          gte: weekAgo,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    const totalRuns = runs.length;
    const successCount = runs.filter((r) => r.status === "success").length;
    const failCount = runs.filter((r) => r.status === "failed").length;

    // Build workflow summary
    let workflowSummary = `Active Workflows (${workflows.length}):\n`;

    if (workflows.length === 0) {
      workflowSummary = "No active workflows.";
    } else {
      for (const wf of workflows.slice(0, 10)) {
        // Limit to first 10 for token budget
        const triggerType = (wf.triggers as any)?.trigger_type || "manual";
        const wfRuns = runs.filter(
          (r) => (r as any).workflowId === wf.id,
        ).length;
        const wfFailed = runs.filter(
          (r) => (r as any).workflowId === wf.id && r.status === "failed",
        ).length;

        workflowSummary += `- "${wf.name}" (${triggerType}) — ${wfRuns} runs this week, ${wfFailed} failed\n`;
      }
    }

    // Build final context string
    const context = `User: ${userName} | Org: ${orgName}
${workflowSummary}
Week total: ${totalRuns} runs | ${successCount} success | ${failCount} failed`;

    return context;
  } catch (err) {
    console.error("[buildAccountContext Error]:", err);
    return "Account context unavailable.";
  }
}

/**
 * Fuzzy keyword matching using Levenshtein distance
 * @param word - Single word from user message
 * @param keywords - Array of keywords to match against
 * @returns true if word matches any keyword with distance <= 2
 */
function fuzzyMatchesAny(word: string, keywords: string[]): boolean {
  const lowerWord = word.toLowerCase();
  for (const keyword of keywords) {
    const dist = distance(lowerWord, keyword.toLowerCase());
    if (dist <= 2) {
      return true;
    }
  }
  return false;
}

/**
 * Check if message matches any keywords using fuzzy matching
 * @param message - Full user message
 * @param keywords - Array of keywords to match
 * @returns true if any word in message matches any keyword with distance <= 2
 */
function messageMatchesIntent(message: string, keywords: string[]): boolean {
  const words = message.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (fuzzyMatchesAny(word, keywords)) {
      return true;
    }
  }
  return false;
}

/**
 * LAYER 3 - Dynamic Context
 * Detects user intent and fetches relevant run data if needed
 * Returns compact run summaries (never raw JSON)
 */
export async function buildDynamicContext(
  userId: string,
  message: string,
  workflows: { id: string; name: string }[],
): Promise<string> {
  try {
    // FAILURE QUERY - detect failed workflow issues
    if (
      messageMatchesIntent(message, [
        "failed",
        "faild",
        "error",
        "eror",
        "not working",
        "not workng",
        "didn't run",
        "didnt run",
        "didn't send",
        "didnt send",
        "not received",
        "not recieved",
        "missed",
        "not sent",
        "wasnt sent",
        "didn't get",
        "didnt get",
        "no message",
        "no whatsapp",
        "whatsapp failed",
        "whatsap failed",
      ])
    ) {
      const failedRuns = await prisma.workflowRun.findMany({
        where: {
          userId: userId,
          status: "failed",
        },
        orderBy: {
          startedAt: "desc",
        },
        take: 10,
        include: {
          steps: {
            where: { status: "failed" },
          },
        },
      });

      if (failedRuns.length === 0) {
        return "No failed runs found.";
      }

      let context = "Recent failed runs:\n";
      for (let i = 0; i < failedRuns.length; i++) {
        const run = failedRuns[i];
        const wf = workflows.find((w) => w.id === run.workflowId);
        const workflowName = wf?.name || "Unknown";
        const time = run.startedAt
          ? new Date(run.startedAt).toLocaleTimeString()
          : "unknown time";

        context += `Run #${i + 1}: ${run.status} | Workflow: ${workflowName} | Time: ${time}\n`;

        // Try to extract step error
        if (run.steps && run.steps.length > 0) {
          const errorStep = run.steps[0];
          context += `Failed at step ${errorStep.stepIndex} (${errorStep.stepType}): ${errorStep.error || "error details unavailable"}\n`;
        } else {
          context += `Error: error details unavailable\n`;
        }

        // Extract phone/name from payload if present
        const payload = run.payload as any;
        if (payload?.phone) {
          context += `Contact: ${payload.phone}\n`;
        } else if (payload?.name) {
          context += `Contact: ${payload.name}\n`;
        }

        context += "\n";
      }

      return context.trim();
    }

    // WORKFLOW QUERY - fuzzy match workflow names
    const matchedWorkflows = workflows.filter((wf) =>
      messageMatchesIntent(message, [wf.name]),
    );

    if (matchedWorkflows.length > 0) {
      const runs = await prisma.workflowRun.findMany({
        where: {
          workflowId: {
            in: matchedWorkflows.map((w) => w.id),
          },
        },
        orderBy: {
          startedAt: "desc",
        },
        take: 10,
        select: {
          id: true,
          workflowId: true,
          status: true,
          startedAt: true,
          payload: true,
          steps: true,
        },
      });

      if (runs.length === 0) {
        return "No runs found for this workflow.";
      }

      let context = `Recent runs for: ${matchedWorkflows.map((w) => w.name).join(", ")}\n`;
      for (let i = 0; i < runs.length; i++) {
        const run = runs[i];
        const wf = workflows.find((w) => w.id === run.workflowId);
        const workflowName = wf?.name || "Unknown";
        const time = run.startedAt
          ? new Date(run.startedAt).toLocaleTimeString()
          : "unknown";

        context += `Run #${i + 1}: ${run.status} | Workflow: ${workflowName} | Time: ${time}\n`;

        const payload = run.payload as any;
        if (payload?.phone) {
          context += `Contact: ${payload.phone}\n`;
        } else if (payload?.name) {
          context += `Contact: ${payload.name}\n`;
        }

        context += "\n";
      }

      return context.trim();
    }

    // TIME QUERY - recent runs (last 60 minutes)
    if (
      messageMatchesIntent(message, [
        "today",
        "this hour",
        "right now",
        "just now",
        "recent",
        "latest",
      ])
    ) {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const recentRuns = await prisma.workflowRun.findMany({
        where: {
          userId: userId,
          startedAt: {
            gte: oneHourAgo,
          },
        },
        orderBy: {
          startedAt: "desc",
        },
        take: 10,
        select: {
          id: true,
          workflowId: true,
          status: true,
          startedAt: true,
          payload: true,
        },
      });

      if (recentRuns.length === 0) {
        return "No runs in the last hour.";
      }

      let context = "Recent runs (last hour):\n";
      for (let i = 0; i < recentRuns.length; i++) {
        const run = recentRuns[i];
        const wf = workflows.find((w) => w.id === run.workflowId);
        const workflowName = wf?.name || "Unknown";
        const time = run.startedAt
          ? new Date(run.startedAt).toLocaleTimeString()
          : "unknown";

        context += `Run #${i + 1}: ${run.status} | Workflow: ${workflowName} | Time: ${time}\n`;
      }

      return context.trim();
    }

    // PAYLOAD QUERY - search for phone number or name in payloads
    const phoneMatch = message.match(/\d{10}/);
    const words = message.split(/\s+/);
    const nameCandidate = words.find(
      (w) => w.length > 3 && /^[a-zA-Z]+$/.test(w),
    );

    if (phoneMatch || nameCandidate) {
      const searchPhone = phoneMatch ? phoneMatch[0] : null;
      const searchName = nameCandidate ? nameCandidate.toLowerCase() : null;

      const payloadRuns = await prisma.workflowRun.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          startedAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          workflowId: true,
          status: true,
          startedAt: true,
          payload: true,
        },
      });

      const matchedRuns = payloadRuns.filter((run) => {
        const payload = run.payload as any;
        if (
          searchPhone &&
          payload?.phone &&
          String(payload.phone).includes(searchPhone)
        ) {
          return true;
        }
        if (
          searchName &&
          payload?.name &&
          String(payload.name).toLowerCase().includes(searchName)
        ) {
          return true;
        }
        return false;
      });

      if (matchedRuns.length === 0) {
        return "No runs found for this contact.";
      }

      let context = `Runs matching: ${searchPhone || searchName}\n`;
      for (let i = 0; i < matchedRuns.slice(0, 10).length; i++) {
        const run = matchedRuns[i];
        const wf = workflows.find((w) => w.id === run.workflowId);
        const workflowName = wf?.name || "Unknown";
        const time = run.startedAt
          ? new Date(run.startedAt).toLocaleTimeString()
          : "unknown";

        context += `Run #${i + 1}: ${run.status} | Workflow: ${workflowName} | Time: ${time}\n`;
      }

      return context.trim();
    }

    // BUILD/SUGGEST QUERY - no data fetch needed
    if (
      messageMatchesIntent(message, [
        "create",
        "build",
        "suggest",
        "how do i",
        "how to",
        "make",
        "setup",
        "set up",
      ])
    ) {
      return "None";
    }

    // Default - no context needed
    return "None";
  } catch (err) {
    console.error("[buildDynamicContext Error]:", err);
    return "None";
  }
}

/**
 * LAYER 1 - Trim conversation history
 * Keeps only last 20 messages to stay within token budget
 */
export function trimHistory(
  messages: { role: string; content: string }[],
): { role: string; content: string }[] {
  if (messages.length <= 20) {
    return messages;
  }
  return messages.slice(-20);
}
