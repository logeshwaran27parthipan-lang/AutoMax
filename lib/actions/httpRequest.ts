import { interpolate } from "@/lib/utils/interpolate";

export async function httpRequest(params: Record<string, any>) {
  const url = params.url;
  const method = (params.method || "POST").toUpperCase();

  if (!url) throw new Error("httpRequest: url is required");

  let headers: Record<string, string> = { "Content-Type": "application/json" };
  if (params.headers) {
    try {
      const parsed =
        typeof params.headers === "string"
          ? JSON.parse(params.headers)
          : params.headers;
      headers = { ...headers, ...parsed };
    } catch {
      console.log("[httpRequest] Invalid headers JSON — using defaults");
    }
  }

  let body: string | undefined = undefined;
  if (method !== "GET" && params.body) {
    try {
      const parsed =
        typeof params.body === "string" ? JSON.parse(params.body) : params.body;
      body = JSON.stringify(parsed);
    } catch {
      body = params.body;
    }
  }

  console.log(`[HTTP REQUEST] ${method} ${url}`);

  const response = await fetch(url, { method, headers, body });
  const text = await response.text();

  let data: any = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* keep as text */
  }

  console.log(`[HTTP REQUEST] Status: ${response.status}`);

  return { status: response.status, ok: response.ok, data };
}
