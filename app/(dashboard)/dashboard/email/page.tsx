"use client";

import React, { useState } from "react";
import axios from "axios";
import { Mail, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

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
        Email
      </h1>
      <p
        style={{
          fontSize: "clamp(13px, 3.5vw, 14px)",
          color: "var(--muted-foreground)",
          marginBottom: 24,
        }}
      >
        Send a one-off email to anyone.
      </p>

      {/* Card Container */}
      <div
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "clamp(16px, 4vw, 24px)",
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: "#dbeafe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Mail size={18} color="#3b82f6" />
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--foreground)",
            }}
          >
            Send Email
          </span>
        </div>

        {/* Form */}
        <form onSubmit={sendEmail}>
          {/* To Field */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--muted-foreground)",
                marginBottom: 4,
              }}
            >
              To
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
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
          </div>

          {/* Subject Field */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--muted-foreground)",
                marginBottom: 4,
              }}
            >
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
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
          </div>

          {/* Message Field */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--muted-foreground)",
                marginBottom: 4,
              }}
            >
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here..."
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--foreground)",
                backgroundColor: "var(--secondary)",
                outline: "none",
                boxSizing: "border-box",
                height: 120,
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
              backgroundColor: loading ? "#fcd34d" : "var(--primary)",
              color: loading ? "var(--foreground)" : "white",
              border: "none",
              borderRadius: 8,
              padding: "9px 20px",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
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
            {loading ? "Sending..." : "Send Email"}
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
