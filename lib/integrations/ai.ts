/**
 * Lightweight AI integration helper.
 *
 * Exports a single function `analyzeMessage(message, model?)` that calls the
 * configured AI provider (Gemini or Groq) and returns a small structured
 * object: { intent, response }.
 *
 * This module contains no workflow or business logic — it only wraps external
 * AI APIs and normalizes their output.
 */

export type AIResult = {
  intent: string;
  response: string;
};

export async function analyzeMessage(
  message: string,
  model?: string,
): Promise<AIResult> {
  if (!message || typeof message !== "string") {
    throw new Error("analyzeMessage: message is required");
  }

  const chosen = (
    model ||
    process.env.DEFAULT_AI_MODEL ||
    "groq"
  ).toLowerCase();

  if (chosen.includes("gemini")) {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL_NAME;
    if (!apiKey || !modelName)
      throw new Error("Gemini credentials not configured");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Gemini error: ${res.status} ${txt}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return parseStructured(text);
  }

  if (chosen.includes("groq") || chosen.includes("llama")) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Groq API key not configured");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: message }],
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Groq error: ${res.status} ${txt}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return parseStructured(text);
  }

  throw new Error("Unsupported model: " + model);
}

function parseStructured(text: string): AIResult {
  const trimmed = String(text || "").trim();
  // Try to parse JSON first (models sometimes return JSON blobs)
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      const intent = String(parsed.intent || parsed.action || "unknown");
      const response = String(
        parsed.response || parsed.output || JSON.stringify(parsed),
      );
      return { intent, response };
    }
  } catch (e) {
    // not JSON — fall through
  }

  // Heuristic: if the model returned something like "Intent: X\nResponse: Y"
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length >= 2 && /intent[:\-]/i.test(lines[0])) {
    const intent = lines[0].replace(/intent[:\-]\s*/i, "");
    const response = lines.slice(1).join("\n");
    return { intent: intent || "unknown", response: response || trimmed };
  }

  // Default fallback
  return { intent: "unknown", response: trimmed };
}
