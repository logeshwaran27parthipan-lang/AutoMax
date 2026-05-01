"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Send, AlertCircle } from "lucide-react";

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
        setError(null); // Clear any previous error
      } catch (err) {
        console.error("Failed to fetch context:", err);

        // ✓ FIXED: Don't reset to 50
        // Keep the old value from useState (it defaults to 50)
        setAccountContext(
          "Account context unavailable. Using last known data.",
        );

        // Show warning but don't panic user
        setError(
          "⚠️ Could not refresh your usage data. Please refresh the page if issues persist.",
        );
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
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#FAFAFA",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* RATE LIMIT BANNER */}
      {isLimitReached && (
        <div
          style={{
            padding: "16px clamp(16px, 5%, 48px)",
            backgroundColor: "#FEF3C7",
            borderBottom: "2px solid #F59E0B",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              maxWidth: "1400px",
              margin: "0 auto",
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
            }}
          >
            <span style={{ fontSize: "20px", flexShrink: 0, marginTop: "2px" }}>
              ⚠️
            </span>
            <div>
              <p
                style={{
                  fontSize: "clamp(13px, 2vw, 15px)",
                  fontWeight: 700,
                  color: "#92400E",
                  margin: "0 0 4px 0",
                }}
              >
                Daily limit reached
              </p>
              <p
                style={{
                  fontSize: "clamp(12px, 1.5vw, 13px)",
                  color: "#92400E",
                  margin: 0,
                }}
              >
                You&apos;ve used all 50 messages. Resets at midnight.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SCROLLABLE CHAT AREA */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "clamp(24px, 5%, 48px)",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FAFAFA",
        }}
      >
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(12px, 3vw, 20px)",
          }}
        >
          {/* WELCOME STATE */}
          {messages.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "clamp(300px, 60vh, 500px)",
                flexDirection: "column",
                gap: "clamp(20px, 5vw, 40px)",
              }}
            >
              <div
                style={{
                  fontSize: "clamp(48px, 10vw, 80px)",
                  lineHeight: 1,
                  animation: "float 3s ease-in-out infinite",
                }}
              >
                🤖
              </div>
              <div style={{ textAlign: "center", maxWidth: "600px" }}>
                <p
                  style={{
                    fontSize: "clamp(18px, 5vw, 28px)",
                    fontWeight: 700,
                    color: "#1A1A2E",
                    margin: "0 0 12px 0",
                    letterSpacing: "-0.5px",
                  }}
                >
                  Hi! I&apos;m your AutoMax assistant.
                </p>
                <p
                  style={{
                    fontSize: "clamp(14px, 3vw, 16px)",
                    color: "#6B7280",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  Ask me about your workflows, automation runs, performance
                  analytics, or how to grow your business. I&apos;m here to help
                  optimize your operations.
                </p>
              </div>
            </div>
          ) : (
            /* MESSAGES */
            messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                  gap: "clamp(8px, 2vw, 16px)",
                  animation: "slideIn 0.3s ease-out",
                }}
              >
                {msg.role === "assistant" && (
                  <div
                    style={{
                      fontSize: "clamp(20px, 4vw, 28px)",
                      lineHeight: 1,
                      flexShrink: 0,
                      marginTop: "4px",
                    }}
                  >
                    🤖
                  </div>
                )}
                <div
                  style={{
                    maxWidth: msg.role === "user" ? "60%" : "70%",
                    padding: "clamp(12px, 2vw, 16px)",
                    paddingLeft: "clamp(14px, 3vw, 20px)",
                    paddingRight: "clamp(14px, 3vw, 20px)",
                    borderRadius: "clamp(8px, 2vw, 16px)",
                    backgroundColor:
                      msg.role === "user" ? "#F59E0B" : "#F3F4F6",
                    color: msg.role === "user" ? "#FFFFFF" : "#1A1A2E",
                    fontSize: "clamp(13px, 2vw, 15px)",
                    lineHeight: 1.6,
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    boxShadow:
                      msg.role === "user"
                        ? "0 2px 8px rgba(245, 158, 11, 0.15)"
                        : "0 2px 8px rgba(0, 0, 0, 0.05)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {/* LOADING STATE */}
          {loading && (
            <div
              style={{
                display: "flex",
                gap: "clamp(8px, 2vw, 16px)",
                alignItems: "flex-start",
                animation: "slideIn 0.3s ease-out",
              }}
            >
              <div
                style={{
                  fontSize: "clamp(20px, 4vw, 28px)",
                  lineHeight: 1,
                  flexShrink: 0,
                  marginTop: "4px",
                }}
              >
                🤖
              </div>
              <div
                style={{
                  padding: "clamp(12px, 2vw, 16px)",
                  paddingLeft: "clamp(14px, 3vw, 20px)",
                  paddingRight: "clamp(14px, 3vw, 20px)",
                  borderRadius: "clamp(8px, 2vw, 16px)",
                  backgroundColor: "#F3F4F6",
                  display: "flex",
                  gap: "clamp(4px, 1.5vw, 8px)",
                  alignItems: "center",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                }}
              >
                <span
                  style={{
                    width: "clamp(6px, 1.5vw, 10px)",
                    height: "clamp(6px, 1.5vw, 10px)",
                    borderRadius: "50%",
                    backgroundColor: "#9CA3AF",
                    animation: "pulse 1.4s infinite",
                  }}
                />
                <span
                  style={{
                    width: "clamp(6px, 1.5vw, 10px)",
                    height: "clamp(6px, 1.5vw, 10px)",
                    borderRadius: "50%",
                    backgroundColor: "#9CA3AF",
                    animation: "pulse 1.4s infinite",
                    animationDelay: "0.2s",
                  }}
                />
                <span
                  style={{
                    width: "clamp(6px, 1.5vw, 10px)",
                    height: "clamp(6px, 1.5vw, 10px)",
                    borderRadius: "50%",
                    backgroundColor: "#9CA3AF",
                    animation: "pulse 1.4s infinite",
                    animationDelay: "0.4s",
                  }}
                />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* FIXED BOTTOM INPUT BAR */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          // backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E5E7EB",
          padding: "20px clamp(16px, 5%, 48px) 30px clamp(16px, 5%, 48px)",
          flexShrink: 0,
          zIndex: 10,
          // boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* ERROR MESSAGE */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "clamp(12px, 2vw, 16px)",
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "8px",
                fontSize: "clamp(12px, 2vw, 14px)",
                color: "#DC2626",
                marginBottom: "16px",
              }}
            >
              <AlertCircle
                size={18}
                color="#DC2626"
                style={{ flexShrink: 0, marginTop: "2px" }}
              />
              <span>{error}</span>
            </div>
          )}

          {/* INPUT FORM */}
          <form
            onSubmit={sendMessage}
            style={{
              display: "flex",
              gap: "clamp(8px, 2vw, 14px)",
              alignItems: "flex-end",
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your business..."
              disabled={isLimitReached || loading}
              rows={1}
              style={{
                flex: 1,
                padding: "clamp(12px, 2vw, 14px)",
                border: "1px solid #D1D5DB",
                borderRadius: "8px",
                fontSize: "clamp(13px, 2vw, 15px)",
                color: "#1A1A2E",
                backgroundColor: "#FFFFFF",
                outline: "none",
                boxSizing: "border-box",
                cursor: isLimitReached ? "not-allowed" : "text",
                opacity: isLimitReached ? 0.6 : 1,
                transition: "all 0.2s",
                fontFamily: "inherit",
                resize: "none",
                maxHeight: "120px",
                overflowY: "auto",
              }}
              onFocus={(e) => {
                if (!isLimitReached) {
                  (e.currentTarget as HTMLTextAreaElement).style.borderColor =
                    "#F59E0B";
                  (e.currentTarget as HTMLTextAreaElement).style.boxShadow =
                    "0 0 0 3px rgba(245, 158, 11, 0.1)";
                }
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor =
                  "#D1D5DB";
                (e.currentTarget as HTMLTextAreaElement).style.boxShadow =
                  "none";
              }}
            />
            <button
              type="submit"
              disabled={isButtonDisabled}
              style={{
                backgroundColor: isButtonDisabled ? "#D1D5DB" : "#F59E0B",
                color: isButtonDisabled ? "#9CA3AF" : "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                padding: "clamp(12px, 2vw, 14px)",
                cursor: isButtonDisabled ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                flexShrink: 0,
                fontSize: "clamp(13px, 2vw, 15px)",
                fontWeight: 500,
                boxShadow: "0 2px 8px rgba(245, 158, 11, 0.15)",
              }}
              onMouseEnter={(e) => {
                if (!isButtonDisabled) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "#ECAA11";
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translateY(-2px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 4px 16px rgba(245, 158, 11, 0.25)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isButtonDisabled) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "#F59E0B";
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translateY(0)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 2px 8px rgba(245, 158, 11, 0.15)";
                }
              }}
            >
              <Send size={16} />
            </button>
          </form>

          {/* MESSAGE COUNTER - PROGRESS BAR */}
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(11px, 2vw, 12px)",
                  fontWeight: 600,
                  color: "#6B7280",
                }}
              >
                Messages used
              </span>
              <span
                style={{
                  fontSize: "clamp(11px, 2vw, 12px)",
                  fontWeight: 700,
                  color: "#F59E0B",
                }}
              >
                {50 - requestsRemaining} / 50
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#E5E7EB",
                borderRadius: "4px",
                overflow: "hidden",
                boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${((50 - requestsRemaining) / 50) * 100}%`,
                  backgroundColor:
                    requestsRemaining > 10 ? "#F59E0B" : "#EF4444",
                  transition: "width 0.3s ease, background-color 0.3s ease",
                  borderRadius: "4px",
                  boxShadow: `0 0 8px ${requestsRemaining > 10 ? "rgba(245, 158, 11, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        /* Smooth scrolling */
        div {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
