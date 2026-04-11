import { runAI } from "@/lib/ai/aiClient";

export async function aiDecisionAction(data: any) {
  const message = data?.message || "";
  const promptTemplate = data?.prompt || "";

  if (!promptTemplate) {
    throw new Error("prompt is required");
  }

  const finalPrompt = promptTemplate.replace("{{message}}", message);

  console.log("[ACTION] ai_decision");

  const aiRaw = await runAI(finalPrompt);

  let parsed;

  try {
    parsed = typeof aiRaw === "string" ? JSON.parse(aiRaw) : aiRaw;
  } catch {
    throw new Error("AI did not return valid JSON");
  }

  if (!parsed.action && !parsed.steps) {
    throw new Error("AI response missing action/steps");
  }

  return parsed;
}