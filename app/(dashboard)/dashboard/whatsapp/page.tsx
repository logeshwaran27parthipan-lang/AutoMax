"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  MessageCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  Info,
} from "lucide-react";

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

  const isConnected =
    status === "WORKING" || status === "connected";

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
      {/* Page Header */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "var(--foreground)",
          marginBottom: 8,
        }}
      >
        WhatsApp
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--muted-foreground)",
          marginBottom: 32,
        }}
      >
        Send WhatsApp messages via WAHA.
      </p>

      {/* Status Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderRadius: 10,
          marginBottom: 24,
          border: "1px solid",
          backgroundColor: isConnected ? "#f0fdf4" : "#fef2f2",
          borderColor: isConnected ? "#bbf7d0" : "#fecaca",
        }}
      >
        {isConnected ? (
          <Wifi size={16} color="#16a34a" />
        ) : (
          <WifiOff size={16} color="#dc2626" />
        )}
        <span
          style={{
            fontSize: 13,
            color: isConnected ? "#16a34a" : "#dc2626",
            fontWeight: 500,
          }}
        >
          {isConnected ? "WAHA connected — " : "WAHA Status: "}
          {status}
        </span>
      </div>

      {/* Send Form Card */}
      <div
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: "#dcfce7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MessageCircle size={18} color="#16a34a" />
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--foreground)",
            }}
          >
            Send Message
          </span>
        </div>

        {/* Form */}
        <form onSubmit={sendMessage}>
          {/* Phone Field */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--muted-foreground)",
                marginBottom: 6,
              }}
            >
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="919876543210 (country code + number, no + or spaces)"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 14,
                color: "var(--foreground)",
                backgroundColor: "var(--secondary)",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor =
                  "var(--primary)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor =
                  "var(--border)";
              }}
            />
            <div
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                marginTop: 6,
              }}
            >
              Example: 919876543210 for +91 98765 43210
            </div>
          </div>

          {/* Message Field */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--muted-foreground)",
                marginBottom: 6,
              }}
            >
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your WhatsApp message here"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 14,
                color: "var(--foreground)",
                backgroundColor: "var(--secondary)",
                outline: "none",
                boxSizing: "border-box",
                height: 160,
                resize: "vertical",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor =
                  "var(--primary)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor =
                  "var(--border)";
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? "#86efac" : "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "11px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              }
            }}
          >
            {loading ? (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Send size={16} />
            )}
            {loading ? "Sending..." : "Send Message"}
          </button>

          {/* Success Message */}
          {success && (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                fontSize: 13,
                color: "#16a34a",
              }}
            >
              <CheckCircle2 size={16} color="#16a34a" />
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                fontSize: 13,
                color: "#dc2626",
              }}
            >
              <AlertCircle size={16} color="#dc2626" />
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Setup Guide Card */}
      <div
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 24,
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: "#fef3c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Info size={18} color="var(--primary)" />
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--foreground)",
            }}
          >
            How to set up WAHA
          </span>
        </div>

        {/* Steps */}
        <div>
          {/* Step 1 */}
          <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent-foreground)",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              1
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--muted-foreground)",
                lineHeight: 1.5,
              }}
            >
              Install Docker Desktop from docker.com
            </p>
          </div>

          {/* Step 2 */}
          <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent-foreground)",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              2
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  lineHeight: 1.5,
                  marginBottom: 6,
                }}
              >
                Run this command in your terminal:
              </p>
              <code
                style={{
                  display: "block",
                  backgroundColor: "var(--secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: "var(--foreground)",
                }}
              >
                docker run -d --name waha -p 3001:3000 devlikeapro/waha
              </code>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent-foreground)",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              3
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--muted-foreground)",
                lineHeight: 1.5,
              }}
            >
              Open http://localhost:3001/dashboard in your browser
            </p>
          </div>

          {/* Step 4 */}
          <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent-foreground)",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              4
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--muted-foreground)",
                lineHeight: 1.5,
              }}
            >
              Start a session and scan the QR code with WhatsApp
            </p>
          </div>

          {/* Step 5 */}
          <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent-foreground)",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              5
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  lineHeight: 1.5,
                  marginBottom: 6,
                }}
              >
                Update your .env.local:
              </p>
              <code
                style={{
                  display: "block",
                  backgroundColor: "var(--secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: "var(--foreground)",
                }}
              >
                WAHA_API_URL=http://localhost:3001
              </code>
            </div>
          </div>

          {/* Step 6 */}
          <div style={{ display: "flex", gap: 12, marginBottom: 0, alignItems: "flex-start" }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent-foreground)",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              6
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--muted-foreground)",
                lineHeight: 1.5,
              }}
            >
              Restart npm run dev and come back here
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
