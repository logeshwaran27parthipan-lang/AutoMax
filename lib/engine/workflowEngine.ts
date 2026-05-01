import { prisma } from "@/lib/prisma";
import { actions } from "@/lib/actions";
import { runAI } from "@/lib/ai/aiClient";
import { interpolate } from "@/lib/utils/interpolate";
import { getRecentMessages, saveMessage } from "@/lib/memory/memoryService";
import { extractData } from "@/lib/utils/extractor";
import { createRun, logStep, finishRun } from "@/lib/engine/runLogger";

export async function processEvent(eventName: string, payload: any) {
  console.log("[PROCESS EVENT]:", eventName);

  // ============================================
  // FETCH WORKFLOWS WITH ORG ISOLATION
  // ============================================
  // Only load workflows for the specific user (organization isolation)
  // Never load ALL workflows from all users in the database
  const workflows = await prisma.workflow.findMany({
    where: {
      userId: payload.userId,
    },
  });

  const matchedWorkflows = workflows.filter((wf) => {
    // Direct workflowId match for webhook and manual events only
    if (payload.workflowId && wf.id === payload.workflowId) {
      if (eventName === "webhook" || eventName === "manual") return true;
    }

    const triggers = wf.triggers as any;
    const triggerType = triggers?.type || triggers;

    // String match (legacy)
    if (typeof triggers === "string") {
      return triggers === eventName;
    }

    // Schedule trigger — cron route already verified timing, just match by workflowId
    if (eventName === "schedule" && triggerType === "schedule") {
      return payload.workflowId ? wf.id === payload.workflowId : false;
    }

    // WhatsApp incoming message
    if (eventName === "whatsapp_incoming" && triggerType === "whatsapp") {
      const keyword = triggers?.keyword;
      if (!keyword) return true;
      const msg = (payload.message || payload.text || "").toLowerCase();
      return msg.includes(keyword.toLowerCase());
    }


    // Event name matches trigger type (catch-all)
    // But if a specific workflowId was provided, don't match other workflows
    if (triggerType === eventName) {
        if (payload.workflowId) return false;
          return true;
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
      enrichedPayload,
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
    const stepOutputs: Record<string, any> = {};

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

          const stepContext = {
            ...enrichedPayload,
            ...Object.fromEntries(
              Object.entries(stepOutputs).map(([k, v]) => [
                `step_${k}_output`,
                v,
              ]),
            ),
          };

          const prompt = `Conversation history:
${historyText}

Extracted data from message:
Email: ${extracted.primaryEmail || "not found"}
Phone: ${extracted.primaryPhone || "not found"}

New message:
${interpolate(step.prompt, stepContext)}`;

          let aiResponse = await runAI(prompt);
          console.log("[RAW AI RESPONSE]:", aiResponse);

          if (typeof aiResponse === "string") {
            try {
              aiResponse = JSON.parse(aiResponse);
            } catch {
              console.log("❌ Invalid JSON from AI");
              await logStep(
                runId,
                i,
                "ai_decision",
                "failed",
                step,
                null,
                "Invalid JSON from AI",
              );
              continue;
            }
          }

          if (!aiResponse.steps || !Array.isArray(aiResponse.steps)) {
            console.log("❌ No steps returned by AI");
            await logStep(
              runId,
              i,
              "ai_decision",
              "failed",
              step,
              null,
              "No steps returned",
            );
            continue;
          }

          await logStep(runId, i, "ai_decision", "success", step, aiResponse);

          for (
            let subIndex = 0;
            subIndex < aiResponse.steps.length;
            subIndex++
          ) {
            const aiStep = aiResponse.steps[subIndex];
            const action = actions[aiStep.action as keyof typeof actions];

            if (!action) {
              console.log("❌ Unknown AI action:", aiStep.action);
              continue;
            }

            console.log("🤖 AI step:", aiStep.action);
            console.log("📦 Params:", aiStep.params);

            const stepContext = {
              ...enrichedPayload,
              ...Object.fromEntries(
                Object.entries(stepOutputs).map(([k, v]) => [
                  `step_${k}_output`,
                  v,
                ]),
              ),
            };

            try {
              const result = await action({
                ...aiStep.params,
                ...stepContext,
              });
              stepOutputs[`${i}_${subIndex}`] = result;
              await logStep(
                runId,
                i,
                aiStep.action,
                "success",
                aiStep.params,
                result,
              );
            } catch (err: any) {
              console.log("❌ Action error:", err?.message || err);
              await logStep(
                runId,
                i,
                aiStep.action,
                "failed",
                aiStep.params,
                null,
                err?.message || String(err),
              );
            }
          }

          await saveMessage(userId, JSON.stringify(aiResponse), "ai");
        } catch (err: any) {
          console.log("AI step error:", err);
          await logStep(
            runId,
            i,
            "ai_decision",
            "failed",
            step,
            null,
            err?.message || String(err),
          );
          runFailed = true;
        }

        continue;
      }

      // =============================
      // 🧠 CONDITION STEP
      // =============================
      if (step.type === "condition") {
        const stepContext = {
          ...enrichedPayload,
          ...Object.fromEntries(
            Object.entries(stepOutputs).map(([k, v]) => [
              `step_${k}_output`,
              v,
            ]),
          ),
        };

        // Interpolate the field to get the actual value
        const resolvedField = interpolate(step.field, stepContext);
        let conditionPassed = false;

        if (step.operator === "includes") {
          conditionPassed = String(resolvedField)
            .toLowerCase()
            .includes(String(step.value).toLowerCase());
        } else if (step.operator === "equals") {
          conditionPassed = resolvedField === step.value;
        } else if (step.operator === "not_equals") {
          conditionPassed = resolvedField !== step.value;
        }

        console.log("[CONDITION]:", conditionPassed);

        if (conditionPassed) {
          await logStep(runId, i, "condition", "success", step, {
            passed: true,
            field: resolvedField,
          });
          console.log("✅ Condition passed → continuing");
        } else {
          await logStep(runId, i, "condition", "success", step, {
            passed: false,
            field: resolvedField,
            reason: "Condition not met — workflow stopped",
          });
          console.log("❌ Condition failed → stopping workflow");
          break;
        }

        continue;
      }

      // =============================
      // 🔄 FOREACH STEP
      // =============================
      if (step.type === "forEach") {
        const sourceStep = step.sourceStep;
        const itemVariable = step.itemVariable || "item";

        if (sourceStep === undefined || sourceStep === null) {
          console.log("❌ forEach step missing sourceStep");
          await logStep(
            runId,
            i,
            "forEach",
            "failed",
            step,
            null,
            "Missing sourceStep property",
          );
          continue;
        }

        const sourceOutput = stepOutputs[sourceStep];

        if (!Array.isArray(sourceOutput)) {
          console.log(
            `❌ forEach sourceStep ${sourceStep} output is not an array:`,
            sourceOutput,
          );
          await logStep(runId, i, "forEach", "skipped", step, {
            reason: "sourceOutput is not an array",
          });
          continue;
        }

        if (sourceOutput.length === 0) {
          console.log(`⏭️ forEach sourceStep ${sourceStep} array is empty`);
          await logStep(runId, i, "forEach", "skipped", step, {
            reason: "sourceOutput array is empty",
          });
          continue;
        }

        console.log(`[FOREACH] Iterating ${sourceOutput.length} items`);

        // Get remaining steps to execute in the loop
        const remainingSteps = steps.slice(i + 1);
        const iterationResults: any[] = [];

        for (let itemIndex = 0; itemIndex < sourceOutput.length; itemIndex++) {
          const currentItem = sourceOutput[itemIndex];

          console.log(
            `[FOREACH ITERATION ${itemIndex + 1}/${sourceOutput.length}]`,
          );

          await logStep(
            runId,
            i,
            "forEach_iteration",
            "success",
            { itemIndex, itemVariable, sourceStep },
            { itemIndex, item: currentItem },
          );

          const iterationStepOutputs: Record<string, any> = {
            ...stepOutputs,
          };

          // Execute remaining steps with current item in context
          for (let j = 0; j < remainingSteps.length; j++) {
            const substep = remainingSteps[j];

            // Build step context with current item merged in
            const stepContext = {
              ...enrichedPayload,
              [itemVariable]: currentItem,
              ...Object.fromEntries(
                Object.entries(iterationStepOutputs).map(([k, v]) => [
                  `step_${k}_output`,
                  v,
                ]),
              ),
            };

            // Skip nested forEach steps in loop (only process normal actions)
            if (substep.type === "forEach") {
              console.log(
                `⏭️ Skipping nested forEach at step ${i + 1 + j} during iteration`,
              );
              continue;
            }

            // Handle condition steps
            if (substep.type === "condition") {
              const resolvedField = interpolate(substep.field, stepContext);
              let conditionPassed = false;

              if (substep.operator === "includes") {
                conditionPassed = String(resolvedField)
                  .toLowerCase()
                  .includes(String(substep.value).toLowerCase());
              } else if (substep.operator === "equals") {
                conditionPassed = resolvedField === substep.value;
              } else if (substep.operator === "not_equals") {
                conditionPassed = resolvedField !== substep.value;
              }

              console.log(
                `[CONDITION in iteration]:`,
                conditionPassed,
                `| field resolved to:`,
                resolvedField,
              );

              if (!conditionPassed) {
                console.log(`❌ Condition failed in iteration → stopping loop`);
                break;
              }

              console.log(`✅ Condition passed in iteration → continuing`);
              continue;
            }

            // Handle normal action steps
            const substepAction = actions[substep.type as keyof typeof actions];

            if (!substepAction) {
              console.log(`No action for substep:`, substep.type);
              continue;
            }

            try {
              // Interpolate substep fields
              const interpolatedSubstep: any = {};
              for (const [key, value] of Object.entries(substep)) {
                if (typeof value === "string") {
                  interpolatedSubstep[key] = interpolate(value, stepContext);
                } else if (Array.isArray(value)) {
                  interpolatedSubstep[key] = value.map((item) =>
                    Array.isArray(item)
                      ? item.map((v) =>
                          typeof v === "string"
                            ? interpolate(v, stepContext)
                            : v,
                        )
                      : typeof item === "string"
                        ? interpolate(item, stepContext)
                        : item,
                  );
                } else {
                  interpolatedSubstep[key] = value;
                }
              }

              console.log(`[FOREACH SUBSTEP ${j}]`, interpolatedSubstep.type);

              const result = await substepAction({
                ...interpolatedSubstep,
                ...stepContext,
              });

              iterationStepOutputs[`${i + 1 + j}`] = result;

              console.log(
                `✅ Substep ${substep.type} success in iteration ${itemIndex}`,
              );
            } catch (err: any) {
              console.log(
                `❌ Substep error in iteration ${itemIndex}:`,
                err?.message || err,
              );
            }
          }

          iterationResults.push({
            itemIndex,
            item: currentItem,
            outputs: iterationStepOutputs,
          });

          await logStep(
            runId,
            i,
            "forEach_iteration",
            "success",
            { itemIndex, itemVariable, sourceStep },
            { itemIndex, item: currentItem },
          );
        }

        await logStep(runId, i, "forEach", "success", step, {
          iterationCount: sourceOutput.length,
          results: iterationResults,
        });

        // Skip remaining steps since they already executed in the loop
        break;
      }

      // =============================
      // ⚙️ NORMAL ACTION STEP
      // =============================
      // ⚙️ NORMAL ACTION STEP
      const action = actions[step.type as keyof typeof actions];

      if (!action) {
        console.log("No action:", step.type);
        await logStep(
          runId,
          i,
          step.type,
          "failed",
          step,
          null,
          `Unknown action: ${step.type}`,
        );
        continue;
      }

      try {
        const stepContext = {
          ...enrichedPayload,
          ...Object.fromEntries(
            Object.entries(stepOutputs).map(([k, v]) => [
              `step_${k}_output`,
              v,
            ]),
          ),
        };

        const interpolatedStep: any = {};
        for (const [key, value] of Object.entries(step)) {
          if (typeof value === "string") {
            interpolatedStep[key] = interpolate(value, stepContext);
          } else if (Array.isArray(value)) {
            interpolatedStep[key] = value.map((item) =>
              Array.isArray(item)
                ? item.map((v) =>
                    typeof v === "string" ? interpolate(v, stepContext) : v,
                  )
                : typeof item === "string"
                  ? interpolate(item, stepContext)
                  : item,
            );
          } else {
            interpolatedStep[key] = value;
          }
        }

        console.log("[INTERPOLATED STEP]:", interpolatedStep);

        const maxRetries =
          typeof step.retryCount === "number" ? step.retryCount : 0;
        let lastError: any = null;
        let result: any = null;
        let succeeded = false;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          if (attempt > 0) {
            console.log(
              `[RETRY] Step ${i} attempt ${attempt} of ${maxRetries}`,
            );
            await new Promise((res) => setTimeout(res, 1000));
          }
          try {
            result = await action({
              ...interpolatedStep,
              ...stepContext,
            });
            succeeded = true;
            break;
          } catch (err: any) {
            lastError = err;
            console.log(
              `[STEP ERROR] attempt ${attempt + 1}:`,
              err?.message || err,
            );
          }
        }

        if (succeeded) {
          stepOutputs[i] = result;
          await logStep(runId, i, step.type, "success", step, result);
        } else {
          await logStep(
            runId,
            i,
            step.type,
            "failed",
            step,
            null,
            lastError?.message || String(lastError),
          );
          runFailed = true;
        }
      } catch (err: any) {
        console.log("Step error:", err);
        await logStep(
          runId,
          i,
          step.type,
          "failed",
          step,
          null,
          err?.message || String(err),
        );
        runFailed = true;
      }
    }

    // Finish run
    await finishRun(runId, runFailed ? "failed" : "completed");
  }
}
