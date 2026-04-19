"use client";

import React, { useState } from "react";
import axios from "axios";
import { Sparkles, Bot, Zap, AlertCircle, Loader2 } from "lucide-react";

export default function AIPage() {
  const [model, setModel] = useState("groq");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!prompt.trim()) return alert("Enter a prompt");
    setLoading(true);
    setError("");
    setResponse("");
    try {
      const res = await axios.post("/api/ai", { model, prompt });
      const data = res.data;
      if (model === "gemini" || model === "groq") {
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        setResponse(text || JSON.stringify(data, null, 2));
      } else {
        const text = data?.content?.[0]?.text;
        setResponse(text || JSON.stringify(data, null, 2));
      }
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(axiosError?.response?.data?.error?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      {/* Page Header */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "var(--foreground)",
          marginBottom: 8,
        }}
      >
        AI Assistant
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--muted-foreground)",
          marginBottom: 32,
        }}
      >
        Generate content with powerful AI models.
      </p>

      {/* Main Card */}
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
              backgroundColor: "#ede9fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={18} color="#8b5cf6" />
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--foreground)",
            }}
          >
            Generate Content
          </span>
        </div>

        {/* Model Selection */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--muted-foreground)",
              marginBottom: 12,
            }}
          >
            Select Model
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
            }}
          >
            {/* Groq Button */}
            <button
              type="button"
              onClick={() => setModel("groq")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 16,
                borderRadius: 10,
                border:
                  model === "groq"
                    ? "2px solid var(--primary)"
                    : "1px solid var(--border)",
                backgroundColor:
                  model === "groq" ? "var(--accent)" : "var(--secondary)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (model !== "groq") {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (model !== "groq") {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--border)";
                }
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor:
                    model === "groq" ? "var(--primary)" : "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap
                  size={16}
                  color={model === "groq" ? "white" : "var(--muted-foreground)"}
                />
              </div>
              <div style={{ textAlign: "left", flex: 1 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--foreground)",
                    marginBottom: 2,
                  }}
                >
                  Groq (LLaMA 3)
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                  }}
                >
                  Fastest response
                </p>
              </div>
            </button>

            {/* Gemini Button */}
            <button
              type="button"
              onClick={() => setModel("gemini")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 16,
                borderRadius: 10,
                border:
                  model === "gemini"
                    ? "2px solid var(--primary)"
                    : "1px solid var(--border)",
                backgroundColor:
                  model === "gemini" ? "var(--accent)" : "var(--secondary)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (model !== "gemini") {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (model !== "gemini") {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--border)";
                }
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor:
                    model === "gemini" ? "var(--primary)" : "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot
                  size={16}
                  color={
                    model === "gemini" ? "white" : "var(--muted-foreground)"
                  }
                />
              </div>
              <div style={{ textAlign: "left", flex: 1 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--foreground)",
                    marginBottom: 2,
                  }}
                >
                  Gemini
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                  }}
                >
                  Advanced reasoning
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Prompt Input */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--muted-foreground)",
              marginBottom: 8,
            }}
          >
            Your Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Write a follow-up email for a new lead..."
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 14,
              color: "var(--foreground)",
              backgroundColor: "var(--secondary)",
              outline: "none",
              boxSizing: "border-box",
              height: 160,
              resize: "vertical",
              fontFamily: "inherit",
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
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            backgroundColor: loading ? "#f59e0b" : "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
            <Sparkles size={16} />
          )}
          {loading ? "Generating..." : "Generate Response"}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            fontSize: 13,
            color: "#dc2626",
            marginBottom: 24,
          }}
        >
          <AlertCircle size={16} color="#dc2626" />
          {error}
        </div>
      )}

      {/* Response Card */}
      {response && (
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
              marginBottom: 16,
              paddingBottom: 16,
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: "#ede9fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bot size={18} color="#8b5cf6" />
            </div>
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--foreground)",
              }}
            >
              AI Response
            </span>
          </div>

          {/* Response Content */}
          <div
            style={{
              padding: 16,
              backgroundColor: "var(--secondary)",
              borderRadius: 8,
              fontSize: 14,
              color: "var(--foreground)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}
          >
            {response}
          </div>
        </div>
      )}

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
