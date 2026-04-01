"use client";

import React, { useState } from "react";
import axios from "axios";

export default function EmailPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (!to.trim() || !subject.trim() || !message.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const body = {
        to: to.trim(),
        subject: subject.trim(),
        text: message,
        html: "<p>" + message + "</p>",
      };
      const res = await axios.post("/api/email", body);
      if (res.status >= 200 && res.status < 300) {
        setSuccess("Email sent successfully!");
        setTo("");
        setSubject("");
        setMessage("");
        // hide success after a short delay
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError("Failed to send email");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to send email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Send Email</h1>

          <form onSubmit={sendEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="recipient@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Subject"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2 border rounded h-40"
                placeholder="Write your message here"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Email"}
              </button>

              {success && <div className="text-green-600">{success}</div>}
              {error && <div className="text-red-600">{error}</div>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
