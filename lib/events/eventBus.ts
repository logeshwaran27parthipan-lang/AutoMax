import { processEvent } from "@/lib/engine/workflowEngine";

export async function emitEvent(eventName: string, payload: any) {
  console.log("[EVENT]:", eventName, payload);

  try {
    await processEvent(eventName, payload);
  } catch (err) {
    console.error("[EVENT ERROR]:", err);
  }
}