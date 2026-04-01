import axios from "axios";

const WAHA_URL = process.env.WAHA_API_URL ?? "http://localhost:3000";
const WAHA_KEY = process.env.WAHA_API_KEY ?? "";
const SESSION = "default";

const client = axios.create({
  baseURL: WAHA_URL,
  headers: {
    "Content-Type": "application/json",
    ...(WAHA_KEY ? { "X-Api-Key": WAHA_KEY } : {}),
  },
});

export async function sendWhatsAppMessage(phone: string, message: string) {
  const chatId = phone.includes("@c.us") ? phone : `${phone}@c.us`;
  const res = await client.post(`/api/sendText`, {
    session: SESSION,
    chatId,
    text: message,
  });
  return res.data;
}

export async function getSessionStatus() {
  const res = await client.get(`/api/sessions/${SESSION}`);
  return res.data;
}

export async function startSession() {
  const res = await client.post(`/api/sessions/start`, {
    name: SESSION,
  });
  return res.data;
}

export async function getQRCode() {
  const res = await client.get(`/api/${SESSION}/auth/qr`);
  return res.data;
}
