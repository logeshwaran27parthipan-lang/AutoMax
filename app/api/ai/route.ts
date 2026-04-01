import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { model, prompt } = body;

  if (!model || !prompt) {
    return NextResponse.json(
      { error: "model and prompt are required" },
      { status: 400 },
    );
  }

  if (model.toLowerCase().includes("gemini")) {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL_NAME;
    if (!apiKey)
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 },
      );
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
      if (!res.ok) {
        console.warn("Gemini failed, falling back to Groq...");
        return await queryGroq(prompt);
      }
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (err) {
      console.warn("Gemini error, falling back to Groq...");
      return await queryGroq(prompt);
    }
  }

  // Claude support removed — project uses Gemini and Groq only

  if (
    model.toLowerCase().includes("groq") ||
    model.toLowerCase().includes("llama")
  ) {
    return await queryGroq(prompt);
  }

  return NextResponse.json({ error: "Unknown model" }, { status: 400 });
}

async function queryGroq(prompt: string): Promise<NextResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      { error: "Missing GROQ_API_KEY" },
      { status: 500 },
    );
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Groq error: ${err}` },
        { status: 500 },
      );
    }
    const data = await res.json();
    return NextResponse.json({
      candidates: [
        {
          content: {
            parts: [{ text: data.choices[0].message.content }],
          },
        },
      ],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
