import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * LAYER 5 ENDPOINT - Calls Groq API with assembled context and history
 * Never throws. Always returns a string.
 * Handles rate limits and errors gracefully.
 *
 * @param messages - Full conversation history + current message + system prompt
 * @param systemPrompt - Layer 4 assembled system prompt (max 400 tokens)
 * @returns Promise<string> - Groq response or friendly error message
 */
export async function callGroq(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  systemPrompt: string,
): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content || "";
    return reply || "No response from AI.";
  } catch (error: any) {
    // Handle Groq rate limit (429)
    if (error?.status === 429) {
      console.error("[Groq Rate Limit]", error.message);
      return "Groq rate limit reached. Please try again in a moment.";
    }

    // Handle any other Groq error
    console.error("[Groq Error]", error?.message || error);
    return "AI is temporarily unavailable. Please try again.";
  }
}

/**
 * Legacy function kept for backwards compatibility with existing code
 * @deprecated Use callGroq() instead for new code
 */
export async function runAI(prompt: string): Promise<any> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Missing GROQ_API_KEY");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an automation AI engine.
Return ONLY a JSON object in this exact format:
{"steps":[{"action":"action_name","params":{}}]}

Available actions and required params:
- send_email: to (email address), subject (string), body (string)
- send_whatsapp: to (phone with country code), message (string)
- sheets_append: spreadsheetId (string), range (string), values (array)

STRICT RULES:
1. If email address is provided in extracted data or message — use it for send_email.
2. If phone number is provided in extracted data or message — use it for send_whatsapp.
3. NEVER invent or guess email addresses or phone numbers.
4. If required data is missing for an action — skip that action entirely.
5. Always return steps array even for single action.
6. No explanation. No markdown. Pure JSON only.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq error: ${res.status} ${err}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const cleaned = content.replace(/```json|```/g, "").trim();

    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[AI ERROR]:", err);
    return { error: "PARSE_FAILED" };
  }
}
