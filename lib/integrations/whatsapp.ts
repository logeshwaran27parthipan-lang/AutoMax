export async function sendWhatsAppMessage(
  to: string,
  message: string,
): Promise<{ success: boolean; result?: any; error?: string }> {
  if (!to || typeof to !== "string") {
    throw new Error('sendWhatsAppMessage: "to" phone number is required');
  }
  if (!message || typeof message !== "string") {
    throw new Error('sendWhatsAppMessage: "message" text is required');
  }

  const baseUrl = process.env.WAHA_API_URL;
  const apiKey = process.env.WAHA_API_KEY;

  if (!baseUrl) {
    throw new Error(
      "sendWhatsAppMessage: missing WAHA_API_URL environment variable",
    );
  }

  // Format phone number to WAHA chatId format
  const chatId = to.includes("@c.us")
    ? to
    : `${to.replace(/\D/g, "")}@c.us`;

  const url = `${baseUrl.replace(/\/$/, "")}/api/sendText`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "X-Api-Key": apiKey } : {}),
      },
      body: JSON.stringify({
        session: "default",
        chatId,
        text: message,
      }),
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch (e) {
      // ignore
    }

    if (!res.ok) {
      return {
        success: false,
        error: data?.error || data?.message || `HTTP ${res.status}`,
        result: data,
      };
    }

    return { success: true, result: data };
  } catch (err: any) {
    return { success: false, error: String(err) };
  }
}