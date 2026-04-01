import type { AIRequest } from "../types/index";

export async function queryAI(request: AIRequest) {
  const { model, prompt } = request;

  if (model.toLowerCase().includes("claude")) {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) throw new Error("Missing CLAUDE_API_KEY");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API error: ${err}`);
    }

    return res.json();
  }

  if (model.toLowerCase().includes("gemini")) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    return res.json();
  }

  throw new Error(`Unsupported model: ${model}`);
}
