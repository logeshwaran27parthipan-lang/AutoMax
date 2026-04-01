"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";

export default function WhatsAppPage() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("checking...");

  useEffect(() => {
    axios
      .get("/api/whatsapp/status")
      .then((res) => {
        setStatus(res.data?.status ?? "connected");
      })
      .catch(() => {
        setStatus("WAHA not running — start WAHA locally first");
      });
  }, []);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (!phone.trim() || !message.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/whatsapp/send", {
        phone: phone.trim(),
        message: message.trim(),
      });
      setSuccess("Message sent successfully!");
      setPhone("");
      setMessage("");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="bg-white rounded shadow p-4 flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              status === "WORKING" || status === "connected"
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          />
          <span className="text-sm text-gray-600">
            WAHA Status: <strong>{status}</strong>
          </span>
        </div>

        <div className="bg-white rounded shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Send WhatsApp Message</h1>

          <form onSubmit={sendMessage} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="919876543210 (country code + number, no + or spaces)"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Example: 919876543210 for +91 98765 43210
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2 border rounded h-40"
                placeholder="Write your WhatsApp message here"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
              {success && <div className="text-green-600">{success}</div>}
              {error && <div className="text-red-600">{error}</div>}
            </div>
          </form>
        </div>

        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-2">How to set up WAHA</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Install Docker Desktop from docker.com</li>
            <li>
              Run this command in your terminal:
              <code className="block bg-gray-100 p-2 rounded mt-1 text-xs">
                docker run -d --name waha -p 3001:3000 devlikeapro/waha
              </code>
            </li>
            <li>Open http://localhost:3001/dashboard in your browser</li>
            <li>Start a session and scan the QR code with WhatsApp</li>
            <li>
              Update your .env.local:
              <code className="block bg-gray-100 p-2 rounded mt-1 text-xs">
                WAHA_API_URL=http://localhost:3001
              </code>
            </li>
            <li>Restart npm run dev and come back here</li>
          </ol>
        </div>

      </div>
    </div>
  );
}
