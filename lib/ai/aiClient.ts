export async function runAI(prompt: string): Promise<any> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Missing GROQ_API_KEY");

    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
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
      }
    );

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