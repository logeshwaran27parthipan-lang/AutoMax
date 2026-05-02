"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Send, AlertCircle, MessageSquare, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "chat" | "builder";

interface Message {
  role: "user" | "assistant";
  content: string;
  isWorkflow?: boolean;
  workflowData?: ParsedWorkflow;
}

interface ParsedWorkflow {
  name: string;
  description: string;
  trigger: { type: string; keyword?: string; cron?: string };
  steps: Array<{ type: string; [key: string]: any }>;
}

const STEP_LABELS: Record<string, string> = {
  send_email: "📧 Send Email",
  send_whatsapp: "📱 Send WhatsApp",
  whatsapp_reply: "↩️ WhatsApp Reply",
  sheets_read: "📊 Read Google Sheet",
  sheets_append: "📊 Append to Sheet",
  http_request: "🌐 HTTP Request",
  condition: "🔀 Condition",
  forEach: "🔁 For Each",
  ai_decision: "🤖 AI Decision",
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  webhook: "Webhook",
  schedule: "Schedule",
  whatsapp: "WhatsApp",
};

function tryParseWorkflow(text: string): ParsedWorkflow | null {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.name && parsed.trigger && Array.isArray(parsed.steps)) {
      return parsed as ParsedWorkflow;
    }
    return null;
  } catch {
    return null;
  }
}

export function AiPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [accountContext, setAccountContext] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [requestsUsed, setRequestsUsed] = useState<number>(0);
  const [requestsRemaining, setRequestsRemaining] = useState<number>(50);
  const [cooldown, setCooldown] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "builder") setMode("builder");
  }, [searchParams]);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await axios.get("/api/ai/context");
        setAccountContext(res.data.accountContext);
        setRequestsUsed(res.data.requestsUsed);
        setRequestsRemaining(res.data.requestsRemaining);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch context:", err);
        setAccountContext(
          "Account context unavailable. Using last known data.",
        );
        setError(
          "⚠️ Could not refresh your usage data. Please refresh the page if issues persist.",
        );
      }
    };
    fetchContext();
  }, []);

  // Clear messages when switching modes
  function handleModeSwitch(newMode: Mode) {
    setMode(newMode);
    setMessages([]);
    setInput("");
    setError(null);
  }

  async function handleCreateWorkflow(
    workflow: ParsedWorkflow,
    msgIndex: number,
  ) {
    setCreatingId(String(msgIndex));
    try {
      const res = await axios.post("/api/workflows", {
        name: workflow.name,
        description: workflow.description,
        triggers: workflow.trigger,
        steps: workflow.steps,
      });
      router.push("/dashboard/workflows/" + res.data.id);
    } catch (err) {
      console.error("Create workflow error:", err);
      alert("Failed to create workflow. Please try again.");
    } finally {
      setCreatingId(null);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!input.trim() || loading || cooldown || requestsRemaining === 0) return;

    const userMessage = input.trim();
    setInput("");

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await axios.post("/api/ai", {
        message: userMessage,
        messages: newMessages,
        accountContext: accountContext,
        mode: mode === "builder" ? "builder" : undefined,
      });

      const {
        reply,
        requestsUsed: used,
        requestsRemaining: remaining,
      } = res.data;

      setRequestsUsed(used);
      setRequestsRemaining(remaining);

      if (mode === "builder") {
        const parsed = tryParseWorkflow(reply);
        if (parsed) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: reply,
              isWorkflow: true,
              workflowData: parsed,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "I couldn't generate a workflow from that. Could you describe what you want to automate in more detail? For example: 'When someone WhatsApps me, reply and save their number to a sheet.'",
            },
          ]);
        }
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      }

      setCooldown(true);
      setTimeout(() => setCooldown(false), 3000);
    } catch (err: any) {
      console.error("API error:", err);
      if (err.response?.status === 429) {
        setError("You've used all 50 messages for today. Resets at midnight.");
        setRequestsRemaining(0);
      } else {
        setError("Failed to get response. Please try again.");
      }
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
      {/* MODE TOGGLE */}
      <div
        style={{
          padding: "16px clamp(16px, 5%, 48px)",
          borderBottom: "1px solid #E5E7EB",
          backgroundColor: "#FFFFFF",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            display: "flex",
            gap: "8px",
          }}
        >
          <button
            onClick={() => handleModeSwitch("chat")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              border:
                mode === "chat" ? "2px solid #F59E0B" : "2px solid #E5E7EB",
              backgroundColor: mode === "chat" ? "#FEF3C7" : "#FFFFFF",
              color: mode === "chat" ? "#92400E" : "#6B7280",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <MessageSquare size={15} /> Chat
          </button>
          <button
            onClick={() => handleModeSwitch("builder")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              border:
                mode === "builder" ? "2px solid #F59E0B" : "2px solid #E5E7EB",
              backgroundColor: mode === "builder" ? "#FEF3C7" : "#FFFFFF",
              color: mode === "builder" ? "#92400E" : "#6B7280",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <Zap size={15} /> Workflow Builder
          </button>
        </div>
      </div>
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
          {messages.length === 0 && (
            <div
              style={{
                display: "flex",
                padding: "clamp(6px, 5%, 12px)",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "200px",
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
                {mode === "builder" ? "⚡" : "🤖"}
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
                  {mode === "builder"
                    ? "What do you want to automate?"
                    : "Hi! I'm your AutoMax assistant."}
                </p>
                <p
                  style={{
                    fontSize: "clamp(14px, 3vw, 16px)",
                    color: "#6B7280",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {mode === "builder"
                    ? "Describe your automation in plain English. I'll generate a ready-to-use workflow for you instantly."
                    : "Ask me about your workflows, automation runs, performance analytics, or how to grow your business."}
                </p>
                {mode === "builder" && (
                  <div
                    style={{
                      marginTop: "20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {[
                      "When someone WhatsApps me 'price', reply with our pricing",
                      "Every morning, send me a summary email",
                      "Save webhook leads to Google Sheet and notify me on WhatsApp",
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => setInput(example)}
                        style={{
                          padding: "10px 16px",
                          borderRadius: "8px",
                          border: "1px solid #E5E7EB",
                          backgroundColor: "#FFFFFF",
                          color: "#374151",
                          fontSize: "13px",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.borderColor = "#F59E0B";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.borderColor = "#E5E7EB";
                        }}
                      >
                        💡 {example}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
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
                  {mode === "builder" ? "⚡" : "🤖"}
                </div>
              )}

              {/* WORKFLOW PREVIEW CARD */}
              {msg.isWorkflow && msg.workflowData ? (
                <div
                  style={{
                    maxWidth: "70%",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: "16px",
                    padding: "20px",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "999px",
                        backgroundColor: "#FEF3C7",
                        color: "#92400E",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {TRIGGER_LABELS[msg.workflowData.trigger.type] ||
                        msg.workflowData.trigger.type}
                    </span>
                    <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                      trigger
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#1A1A2E",
                      margin: "0 0 6px 0",
                    }}
                  >
                    {msg.workflowData.name}
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6B7280",
                      margin: "0 0 16px 0",
                      lineHeight: 1.5,
                    }}
                  >
                    {msg.workflowData.description}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      marginBottom: "16px",
                    }}
                  >
                    {msg.workflowData.steps.map((step, si) => (
                      <div
                        key={si}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 12px",
                          backgroundColor: "#F9FAFB",
                          borderRadius: "8px",
                          fontSize: "13px",
                          color: "#374151",
                        }}
                      >
                        <span
                          style={{
                            color: "#9CA3AF",
                            fontWeight: 700,
                            fontSize: "11px",
                          }}
                        >
                          Step {si + 1}
                        </span>
                        <span>{STEP_LABELS[step.type] || step.type}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleCreateWorkflow(msg.workflowData!, idx)}
                    disabled={creatingId === String(idx)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor:
                        creatingId === String(idx) ? "#D1D5DB" : "#F59E0B",
                      color: creatingId === String(idx) ? "#9CA3AF" : "#FFFFFF",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor:
                        creatingId === String(idx) ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {creatingId === String(idx)
                      ? "Creating..."
                      : "✅ Create This Workflow"}
                  </button>
                </div>
              ) : (
                /* REGULAR CHAT BUBBLE */
                <div
                  style={{
                    maxWidth: msg.role === "user" ? "60%" : "70%",
                    padding: "clamp(12px, 2vw, 16px) clamp(14px, 3vw, 20px)",
                    borderRadius: "clamp(8px, 2vw, 16px)",
                    backgroundColor:
                      msg.role === "user" ? "#F59E0B" : "#F3F4F6",
                    color: msg.role === "user" ? "#FFFFFF" : "#1A1A2E",
                    fontSize: "clamp(13px, 2vw, 15px)",
                    lineHeight: 1.6,
                    wordWrap: "break-word",
                    boxShadow:
                      msg.role === "user"
                        ? "0 2px 8px rgba(245, 158, 11, 0.15)"
                        : "0 2px 8px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {/* LOADING */}
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
                {mode === "builder" ? "⚡" : "🤖"}
              </div>
              <div
                style={{
                  padding: "clamp(12px, 2vw, 16px) clamp(14px, 3vw, 20px)",
                  borderRadius: "clamp(8px, 2vw, 16px)",
                  backgroundColor: "#F3F4F6",
                  display: "flex",
                  gap: "clamp(4px, 1.5vw, 8px)",
                  alignItems: "center",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                }}
              >
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span
                    key={i}
                    style={{
                      width: "clamp(6px, 1.5vw, 10px)",
                      height: "clamp(6px, 1.5vw, 10px)",
                      borderRadius: "50%",
                      backgroundColor: "#9CA3AF",
                      animation: "pulse 1.4s infinite",
                      animationDelay: `${delay}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

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

      {/* FIXED BOTTOM INPUT BAR */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E5E7EB",
          padding: "20px clamp(16px, 5%, 48px) 30px",
          flexShrink: 0,
          zIndex: 10,
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
              placeholder={
                mode === "builder"
                  ? "e.g. When someone WhatsApps me 'price', reply with our pricing and save their number to a sheet..."
                  : "Ask anything about your business..."
              }
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
            >
              <Send size={16} />
            </button>
          </form>

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
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        div { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}

export default function AiPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
          }}
        >
          <div style={{ color: "#9CA3AF" }}>Loading...</div>
        </div>
      }
    >
      <AiPageInner />
    </Suspense>
  );
}
