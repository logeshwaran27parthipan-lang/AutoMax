"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Send, Loader2, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [accountContext, setAccountContext] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [requestsUsed, setRequestsUsed] = useState<number>(0);
  const [requestsRemaining, setRequestsRemaining] = useState<number>(50);
  const [cooldown, setCooldown] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Fetch account context on mount
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await axios.get("/api/ai/context");
        setAccountContext(res.data.accountContext);
        setRequestsUsed(res.data.requestsUsed);
        setRequestsRemaining(res.data.requestsRemaining);
      } catch (err) {
        console.error("Failed to fetch context:", err);
        setAccountContext("Account context unavailable.");
        setRequestsRemaining(50);
      }
    };

    fetchContext();
  }, []);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!input.trim() || loading || cooldown || requestsRemaining === 0) {
      return;
    }

    const userMessage = input.trim();
    setInput("");

    // Add user message to chat
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Call API
      const res = await axios.post("/api/ai", {
        message: userMessage,
        messages: newMessages,
        accountContext: accountContext,
      });

      const {
        reply,
        requestsUsed: used,
        requestsRemaining: remaining,
      } = res.data;

      // Add assistant reply
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      // Update rate limit display
      setRequestsUsed(used);
      setRequestsRemaining(remaining);

      // Start cooldown
      setCooldown(true);
      setTimeout(() => setCooldown(false), 3000);
    } catch (err: any) {
      console.error("API error:", err);

      // Handle rate limit error
      if (err.response?.status === 429) {
        setError("You've used all 50 messages for today. Resets at midnight.");
        setRequestsRemaining(0);
      } else {
        setError("Failed to get response. Please try again.");
      }

      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err.response?.data?.message ||
            "AI is temporarily unavailable. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const isLimitReached = requestsRemaining === 0;
  const isButtonDisabled =
    loading || cooldown || requestsRemaining === 0 || input.trim() === "";

  return (
    <div
      style={{
        paddingTop: 16,
        paddingBottom: 32,
        paddingLeft: "max(16px, 5%)",
        paddingRight: "max(16px, 5%)",
        maxWidth: 800,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {/* HEADER BAR */}
      <div
        style={{
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontSize: "clamp(20px, 5vw, 28px)",
            fontWeight: 700,
            color: "#1A1A2E",
            marginBottom: 4,
          }}
        >
          AutoMax AI Assistant
        </h1>
        <p
          style={{
            fontSize: "clamp(12px, 3.5vw, 14px)",
            color: "#666",
            marginBottom: 8,
          }}
        >
          {requestsRemaining} of 50 messages remaining today
        </p>
      </div>

      {/* RATE LIMIT BANNER */}
      {isLimitReached && (
        <div
          style={{
            backgroundColor: "#FEF3C7",
            border: "1px solid #F59E0B",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>
              Daily limit reached
            </p>
            <p style={{ fontSize: 12, color: "#92400E" }}>
              You've used all 50 messages. Resets at midnight.
            </p>
          </div>
        </div>
      )}

      {/* CHAT AREA */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          marginBottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingRight: 8,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 32,
              }}
            >
              🤖
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>
                Hi! I'm your AutoMax assistant.
              </p>
              <p style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                Ask me about your workflows, runs, or how to automate your
                business.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: msg.role === "user" ? "#F59E0B" : "#F0F0F0",
                  color: msg.role === "user" ? "white" : "#1A1A2E",
                  fontSize: 13,
                  lineHeight: 1.5,
                  wordWrap: "break-word",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor: "#F0F0F0",
                color: "#1A1A2E",
                fontSize: 13,
                display: "flex",
                gap: 4,
              }}
            >
              <span style={{ animation: "pulse 1s infinite" }}>●</span>
              <span
                style={{
                  animation: "pulse 0.8s infinite",
                  animationDelay: "0.2s",
                }}
              >
                ●
              </span>
              <span
                style={{
                  animation: "pulse 0.6s infinite",
                  animationDelay: "0.4s",
                }}
              >
                ●
              </span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 14px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 8,
            fontSize: 12,
            color: "#DC2626",
            marginBottom: 12,
          }}
        >
          <AlertCircle size={16} color="#DC2626" />
          {error}
        </div>
      )}

      {/* INPUT BAR */}
      <form
        onSubmit={sendMessage}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLimitReached || loading}
          style={{
            flex: 1,
            padding: "10px 14px",
            border: "1px solid #E5E5E5",
            borderRadius: 8,
            fontSize: 13,
            color: "#1A1A2E",
            backgroundColor: "#FAFAFA",
            outline: "none",
            boxSizing: "border-box",
            cursor: isLimitReached ? "not-allowed" : "text",
            opacity: isLimitReached ? 0.6 : 1,
            transition: "all 0.2s",
          }}
          onFocus={(e) => {
            if (!isLimitReached) {
              (e.currentTarget as HTMLInputElement).style.borderColor =
                "#F59E0B";
            }
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = "#E5E5E5";
          }}
        />
        <button
          type="submit"
          disabled={isButtonDisabled}
          style={{
            backgroundColor: isButtonDisabled ? "#CCCCCC" : "#F59E0B",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: isButtonDisabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!isButtonDisabled) {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
            }
          }}
          onMouseLeave={(e) => {
            if (!isButtonDisabled) {
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
        </button>
      </form>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
