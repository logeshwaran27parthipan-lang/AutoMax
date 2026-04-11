/**
 * WhatsApp integration helper (WAHA-style HTTP API).
 *
 * Exports sendWhatsAppMessage(to, message) -> Promise<{ success, result?, error? }>
 * This file is a thin integration layer that callers (actions) can use.
 */

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

  const url = `${baseUrl.replace(/\/$/, "")}/send`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ to, message }),
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
        error: data?.error || `HTTP ${res.status}`,
        result: data,
      };
    }

    return { success: true, result: data };
  } catch (err: any) {
    return { success: false, error: String(err) };
  }
}
