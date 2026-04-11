import { analyzeMessage } from "@/lib/integrations/ai";

export async function analyzeAIAction(data: any) {
  const message =
    typeof data?.message === "string" && data.message.trim()
      ? data.message
      : typeof data?.prompt === "string" && data.prompt.trim()
      ? data.prompt
      : null;

  if (!message) {
    throw new Error("message or prompt is required");
  }

  console.log("[ACTION] ai_process");

  const result = await analyzeMessage(message);

  return {
    intent: result.intent,
    response: result.response,
  };
}