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
  const [phones, setPhones] = useState<string[]>([""]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("checking...");
  const [wahaOffline, setWahaOffline] = useState(false);

  useEffect(() => {
    try {
      axios
        .get("/api/whatsapp/status")
        .then((res) => {
          setStatus(res.data?.status ?? "connected");
          setWahaOffline(false);
        })
        .catch(() => {
          setWahaOffline(true);
          setStatus("checking...");
        });
    } catch (err) {
      setWahaOffline(true);
      setStatus("checking...");
    }
  }, []);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (phones.every((p) => !p.trim()) || !message.trim()) {
      setError("Please fill in all fields");
      return;
    }

    // Validate all phone numbers
    const cleanedPhones = phones.map((p) => p.trim()).filter((p) => p !== "");

    if (cleanedPhones.length === 0) {
      setError("Please enter at least one phone number");
      return;
    }

    const invalidPhones = cleanedPhones.filter(
      (p) => p.length !== 10 || !/^\d+$/.test(p),
    );
    if (invalidPhones.length > 0) {
      setError("All phone numbers must be exactly 10 digits");
      return;
    }

    const fullPhones = cleanedPhones.map((p) => "+91" + p);

    setLoading(true);
    try {
      await axios.post("/api/whatsapp/send", {
        phone: fullPhones.join(","),
        message: message.trim(),
      });
      setSuccess("Message sent successfully!");
      setPhones([""]);
      setMessage("");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  const isConnected = status === "WORKING" || status === "connected";

  return (
    <div
      style={{
        paddingTop: 16,
        paddingBottom: 32,
        paddingLeft: "max(16px, 5%)",
        paddingRight: "max(16px, 5%)",
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      {/* Page Header */}
      <h1
        style={{
          fontSize: "clamp(20px, 5vw, 28px)",
          fontWeight: 700,
          color: "var(--foreground)",
          marginBottom: 8,
        }}
      >
        WhatsApp
      </h1>
      <p
        style={{
          fontSize: "clamp(13px, 3.5vw, 14px)",
          color: "var(--muted-foreground)",
          marginBottom: 24,
        }}
      >
        Send WhatsApp messages via WAHA.
      </p>

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
          {/* Phone Recipients Field */}
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
              Recipients
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {phones.map((phone, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      overflow: "hidden",
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        padding: "10px 12px",
                        backgroundColor: "#F3F4F6",
                        color: "#374151",
                        fontSize: 14,
                        fontWeight: 500,
                        borderRight: "1px solid #E5E7EB",
                        whiteSpace: "nowrap",
                      }}
                    >
                      +91
                    </span>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => {
                        const updated = [...phones];
                        updated[i] = e.target.value;
                        setPhones(updated);
                      }}
                      placeholder="9876543210"
                      maxLength={10}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        border: "none",
                        outline: "none",
                        fontSize: 14,
                        color: "var(--foreground)",
                        backgroundColor: "var(--secondary)",
                      }}
                    />
                  </div>
                  {phones.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPhones(phones.filter((_, idx) => idx !== i))
                      }
                      style={{
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#DC2626",
                        fontSize: 18,
                        lineHeight: "1",
                        padding: "4px 8px",
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {phones.length < 5 && (
                <button
                  type="button"
                  onClick={() => setPhones([...phones, ""])}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px dashed #E5E7EB",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 13,
                    color: "var(--muted-foreground)",
                    cursor: "pointer",
                    width: "100%",
                    marginTop: 4,
                  }}
                >
                  + Add Recipient
                </button>
              )}
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
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
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

      {/* WAHA Offline Banner */}
      {wahaOffline && (
        <div
          style={{
            backgroundColor: "#FEF3C7",
            border: "1px solid #F59E0B",
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>⚠️</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#92400E" }}>
              WhatsApp Disconnected
            </span>
            <span style={{ fontSize: 13, color: "#92400E" }}>
              WAHA is not reachable. Start WAHA locally via Docker, then update
              the tunnel URL in Settings.
            </span>
          </div>
        </div>
      )}

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
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 14,
              alignItems: "flex-start",
            }}
          >
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
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 14,
              alignItems: "flex-start",
            }}
          >
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
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 14,
              alignItems: "flex-start",
            }}
          >
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
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 14,
              alignItems: "flex-start",
            }}
          >
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
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 14,
              alignItems: "flex-start",
            }}
          >
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
                Update your .env:
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
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 0,
              alignItems: "flex-start",
            }}
          >
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
