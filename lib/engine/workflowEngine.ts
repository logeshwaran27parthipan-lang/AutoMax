import { prisma } from "@/lib/prisma";
import { actions } from "@/lib/actions";
import { runAI } from "@/lib/ai/aiClient";
import { interpolate } from "@/lib/utils/interpolate";
import { getRecentMessages, saveMessage } from "@/lib/memory/memoryService";
import { extractData } from "@/lib/utils/extractor";
import { createRun, logStep, finishRun } from "@/lib/engine/runLogger";

export async function processEvent(eventName: string, payload: any) {
  console.log("[PROCESS EVENT]:", eventName);

  const workflows = await prisma.workflow.findMany();

  const matchedWorkflows = workflows.filter((wf) => {
    if (payload.workflowId && wf.id === payload.workflowId) {
      return true;
    }
    const triggers = wf.triggers;
    if (Array.isArray(triggers)) {
      return triggers.some((t: any) => (t?.type || t) === eventName);
    }
    if (typeof triggers === "string") {
      return triggers === eventName;
    }
    return false;
  });

  console.log("[MATCHED WORKFLOWS]:", matchedWorkflows.length);

  for (const workflow of matchedWorkflows) {
    console.log("[RUNNING WORKFLOW]:", workflow.id);

    const userId = payload.userId || workflow.userId;

    // Save user message to memory
    if (payload.message) {
      await saveMessage(userId, payload.message, "user");
    }

    // Extract structured data
    const extracted = extractData(payload.message || "");
    console.log("[EXTRACTED]:", extracted);

    const enrichedPayload = {
      ...payload,
      extractedEmail: extracted.primaryEmail,
      extractedPhone: extracted.primaryPhone,
    };

    // Create run record
    const runId = await createRun(
      workflow.id,
      userId,
      eventName,
      enrichedPayload
    );

    let steps: any[] = [];
    try {
      steps = Array.isArray(workflow.steps)
        ? workflow.steps
        : JSON.parse(workflow.steps as any);
    } catch {
      steps = [];
    }

    let runFailed = false;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // =============================
      // 🤖 AI DECISION STEP
      // =============================
      if (step.type === "ai_decision") {
        console.log("[AI STEP]");

        try {
          const history = await getRecentMessages(userId);
          const historyText = history
            .map((m: any) => `${m.role}: ${m.message}`)
            .join("\n");

          const prompt = `Conversation history:
${historyText}

Extracted data from message:
Email: ${extracted.primaryEmail || "not found"}
Phone: ${extracted.primaryPhone || "not found"}

New message:
${interpolate(step.prompt, enrichedPayload)}`;

          let aiResponse = await runAI(prompt);
          console.log("[RAW AI RESPONSE]:", aiResponse);

          if (typeof aiResponse === "string") {
            try {
              aiResponse = JSON.parse(aiResponse);
            } catch {
              console.log("❌ Invalid JSON from AI");
              await logStep(runId, i, "ai_decision", "failed",
                step, null, "Invalid JSON from AI");
              continue;
            }
          }

          if (!aiResponse.steps || !Array.isArray(aiResponse.steps)) {
            console.log("❌ No steps returned by AI");
            await logStep(runId, i, "ai_decision", "failed",
              step, null, "No steps returned");
            continue;
          }

          await logStep(runId, i, "ai_decision", "success",
            step, aiResponse);

          for (const aiStep of aiResponse.steps) {
            const action = actions[aiStep.action as keyof typeof actions];

            if (!action) {
              console.log("❌ Unknown AI action:", aiStep.action);
              continue;
            }

            console.log("🤖 AI step:", aiStep.action);
            console.log("📦 Params:", aiStep.params);

            try {
              const result = await action({
                ...aiStep.params,
                ...enrichedPayload,
              });
              await logStep(runId, i, aiStep.action, "success",
                aiStep.params, result);
            } catch (err: any) {
              console.log("❌ Action error:", err?.message || err);
              await logStep(runId, i, aiStep.action, "failed",
                aiStep.params, null, err?.message || String(err));
            }
          }

          await saveMessage(userId, JSON.stringify(aiResponse), "ai");

        } catch (err: any) {
          console.log("AI step error:", err);
          await logStep(runId, i, "ai_decision", "failed",
            step, null, err?.message || String(err));
          runFailed = true;
        }

        continue;
      }

      // =============================
      // 🧠 CONDITION STEP
      // =============================
      if (step.type === "condition") {
        const actual = enrichedPayload[step.field];
        let conditionPassed = false;

        if (step.operator === "includes") {
          conditionPassed =
            typeof actual === "string" && actual.includes(step.value);
        } else if (step.operator === "equals") {
          conditionPassed = actual === step.value;
        } else if (step.operator === "not_equals") {
          conditionPassed = actual !== step.value;
        }

        console.log("[CONDITION]:", conditionPassed);

        await logStep(
          runId, i, "condition",
          conditionPassed ? "success" : "skipped",
          step, { conditionPassed }
        );

        if (!conditionPassed) {
          console.log("❌ Condition failed → stopping workflow");
          break;
        }

        console.log("✅ Condition passed → continuing");
        continue;
      }

      // =============================
      // ⚙️ NORMAL ACTION STEP
      // =============================
      const action = actions[step.type as keyof typeof actions];

      if (!action) {
        console.log("No action:", step.type);
        await logStep(runId, i, step.type, "failed",
          step, null, `Unknown action: ${step.type}`);
        continue;
      }

      try {
        const result = await action({
          ...step,
          ...enrichedPayload,
        });
        await logStep(runId, i, step.type, "success", step, result);
      } catch (err: any) {
        console.log("Step error:", err);
        await logStep(runId, i, step.type, "failed",
          step, null, err?.message || String(err));
        runFailed = true;
      }
    }

    // Finish run
    await finishRun(runId, runFailed ? "failed" : "completed");
  }
}