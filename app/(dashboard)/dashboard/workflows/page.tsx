"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

type WorkflowRun = {
  startedAt: string;
  status: string;
};

type Workflow = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  triggers?: any;
  steps?: any[];
  runCount: number;
  lastRun: WorkflowRun | null;
  isActive?: boolean;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getStatusStyles(status: string) {
  if (status === "completed")
    return { bg: "#dcfce7", text: "#166534", dot: "#22c55e" };
  if (status === "failed")
    return { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" };
  return { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" };
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("webhook");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scheduleFrequency, setScheduleFrequency] = useState("daily");
  const [scheduleHour, setScheduleHour] = useState(9);
  const [scheduleMinute, setScheduleMinute] = useState(0);
  const [customCron, setCustomCron] = useState("0 9 * * *");
  const [waKeyword, setWaKeyword] = useState("");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    try {
      const res = await axios.get("/api/workflows");
      setWorkflows(res.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function createWorkflow() {
    if (!name.trim()) return setError("Name is required");
    setCreating(true);
    setError("");
    try {
      let triggerConfig: any = { type: trigger };
      if (trigger === "schedule") {
        const INTERVAL_FREQS = ["hourly", "30min", "5min", "1min"];
        let cron = customCron;
        if (scheduleFrequency !== "custom") {
          switch (scheduleFrequency) {
            case "daily":
              cron = `${scheduleMinute} ${scheduleHour} * * *`;
              break;
            case "weekdays":
              cron = `${scheduleMinute} ${scheduleHour} * * 1-5`;
              break;
            case "weekly":
              cron = `${scheduleMinute} ${scheduleHour} * * 1`;
              break;
            case "monthly":
              cron = `${scheduleMinute} ${scheduleHour} 1 * *`;
              break;
            case "hourly":
              cron = `0 * * * *`;
              break;
            case "30min":
              cron = `*/30 * * * *`;
              break;
            case "5min":
              cron = `*/5 * * * *`;
              break;
            case "1min":
              cron = `* * * * *`;
              break;
            default:
              cron = `${scheduleMinute} ${scheduleHour} * * *`;
          }
        }
        triggerConfig.cron = cron;
        triggerConfig.timezone = "Asia/Kolkata";
      }
      if (trigger === "whatsapp" && waKeyword.trim()) {
        triggerConfig.keyword = waKeyword.trim().toLowerCase();
      }
      await axios.post("/api/workflows", {
        name: name.trim(),
        description: description.trim(),
        triggers: triggerConfig,
        steps: [],
      });
      setName("");
      setDescription("");
      setTrigger("webhook");
      setScheduleFrequency("daily");
      setScheduleHour(9);
      setScheduleMinute(0);
      setCustomCron("0 9 * * *");
      setWaKeyword("");
      setShowForm(false);
      fetchWorkflows();
    } catch {
      setError("Failed to create workflow");
    } finally {
      setCreating(false);
    }
  }

  async function deleteWorkflow(id: string) {
    if (!confirm("Delete this workflow and all its run history?")) return;
    setDeletingId(id);
    try {
      await axios.delete(`/api/workflows/${id}`);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch {
      alert("Failed to delete workflow");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleWorkflowActive(id: string, currentIsActive: boolean) {
    setTogglingId(id);
    try {
      const newIsActive = !currentIsActive;
      await axios.patch(`/api/workflows/${id}`, { isActive: newIsActive });
      // Update local state optimistically
      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, isActive: newIsActive } : w)),
      );
      console.log("[WORKFLOW_TOGGLE] Workflow toggled successfully", {
        workflowId: id,
        isActive: newIsActive,
      });
    } catch (err) {
      console.error("[WORKFLOW_TOGGLE] Failed to toggle workflow", err);
      alert("Failed to toggle workflow");
    } finally {
      setTogglingId(null);
    }
  }

  function copyWebhookUrl(id: string) {
    const url = `${window.location.origin}/api/webhook/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div
      className="max-w-4xl mx-auto py-8 px-4"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "var(--foreground)",
            }}
          >
            Workflows
          </h1>
          <p
            style={{
              color: "rgba(26,26,46,0.6)",
              fontSize: "14px",
              marginTop: "2px",
            }}
          >
            {loading
              ? "Loading..."
              : `${workflows.length} workflow${workflows.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setError("");
          }}
          style={{
            backgroundColor: "var(--primary)",
            color: "#fff",
            borderRadius: "10px",
            padding: "10px 16px",
            fontWeight: 500,
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#d97706")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--primary)")
          }
        >
          + New Workflow
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "16px",
              color: "var(--foreground)",
            }}
          >
            New Workflow
          </h2>
          {error && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                color: "#dc2626",
                padding: "12px 16px",
                borderRadius: "10px",
                fontSize: "14px",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--foreground)",
                  marginBottom: "4px",
                }}
              >
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createWorkflow()}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--primary)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border)")
                }
                placeholder="e.g. Lead Follow-up"
                autoFocus
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--foreground)",
                  marginBottom: "4px",
                }}
              >
                Description{" "}
                <span style={{ color: "rgba(26,26,46,0.4)", fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  fontSize: "14px",
                  outline: "none",
                  resize: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--primary)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border)")
                }
                rows={2}
                placeholder="What does this workflow do?"
              />
            </div>

            {/* Trigger Type Selector */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--foreground)",
                  marginBottom: "8px",
                }}
              >
                How should this workflow start?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    value: "webhook",
                    icon: "🔗",
                    label: "Webhook",
                    desc: "Triggered by forms, CRMs, or any app",
                  },
                  {
                    value: "schedule",
                    icon: "⏰",
                    label: "Schedule",
                    desc: "Run automatically on a schedule",
                  },
                  {
                    value: "whatsapp",
                    icon: "💬",
                    label: "WhatsApp",
                    desc: "When someone messages you on WhatsApp",
                  },
                  {
                    value: "manual",
                    icon: "▶️",
                    label: "Manual",
                    desc: "Only when you click Run Now",
                  },
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTrigger(t.value)}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      border:
                        trigger === t.value
                          ? "2px solid var(--primary)"
                          : "2px solid var(--border)",
                      backgroundColor: trigger === t.value ? "#fff7ed" : "#fff",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{t.icon}</span>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "var(--foreground)",
                        }}
                      >
                        {t.label}
                      </span>
                    </div>
                    <p
                      style={{ fontSize: "12px", color: "rgba(26,26,46,0.6)" }}
                    >
                      {t.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule config */}
            {trigger === "schedule" && (
              <div
                style={{
                  backgroundColor: "#fef3c7",
                  border: "1px solid #fcd34d",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#92400e",
                  }}
                >
                  ⏰ Schedule Settings
                </p>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "rgba(26,26,46,0.6)",
                      marginBottom: "4px",
                    }}
                  >
                    Run frequency
                  </label>
                  <select
                    value={scheduleFrequency}
                    onChange={(e) => setScheduleFrequency(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      fontSize: "14px",
                      backgroundColor: "#fff",
                      outline: "none",
                    }}
                  >
                    <option value="daily">Every day</option>
                    <option value="weekdays">Weekdays only (Mon–Fri)</option>
                    <option value="weekly">Every week on Monday</option>
                    <option value="monthly">First day of every month</option>
                    <option value="hourly">Every hour</option>
                    <option value="30min">Every 30 minutes</option>
                    <option value="5min">Every 5 minutes</option>
                    <option value="1min">Every minute</option>
                    <option value="custom">Custom cron...</option>
                  </select>
                </div>

                {!["hourly", "30min", "5min", "1min"].includes(
                  scheduleFrequency,
                ) &&
                  scheduleFrequency !== "custom" && (
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "rgba(26,26,46,0.6)",
                          marginBottom: "4px",
                        }}
                      >
                        Run at (IST)
                      </label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <select
                          value={scheduleHour}
                          onChange={(e) =>
                            setScheduleHour(parseInt(e.target.value))
                          }
                          style={{
                            flex: 1,
                            padding: "10px 12px",
                            border: "1px solid var(--border)",
                            borderRadius: "10px",
                            fontSize: "14px",
                            backgroundColor: "#fff",
                            outline: "none",
                          }}
                        >
                          {Array.from({ length: 24 }, (_, i) => {
                            const ampm = i < 12 ? "AM" : "PM";
                            const displayHour =
                              i === 0 ? 12 : i > 12 ? i - 12 : i;
                            return (
                              <option key={i} value={i}>
                                {String(displayHour).padStart(2, "0")} {ampm}
                              </option>
                            );
                          })}
                        </select>
                        <select
                          value={scheduleMinute}
                          onChange={(e) =>
                            setScheduleMinute(parseInt(e.target.value))
                          }
                          style={{
                            flex: 1,
                            padding: "10px 12px",
                            border: "1px solid var(--border)",
                            borderRadius: "10px",
                            fontSize: "14px",
                            backgroundColor: "#fff",
                            outline: "none",
                          }}
                        >
                          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(
                            (m) => (
                              <option key={m} value={m}>
                                {String(m).padStart(2, "0")}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "rgba(26,26,46,0.5)",
                          marginTop: "4px",
                        }}
                      >
                        India Standard Time (IST) — UTC+5:30
                      </p>
                    </div>
                  )}

                {scheduleFrequency === "custom" && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "rgba(26,26,46,0.6)",
                        marginBottom: "4px",
                      }}
                    >
                      Custom cron expression (IST)
                    </label>
                    <input
                      value={customCron}
                      onChange={(e) => setCustomCron(e.target.value)}
                      placeholder="0 9 * * 1-5"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontFamily: "monospace",
                        backgroundColor: "#fff",
                        outline: "none",
                      }}
                    />
                    <p
                      style={{
                        fontSize: "11px",
                        color: "rgba(26,26,46,0.5)",
                        marginTop: "4px",
                      }}
                    >
                      Format: minute hour day month weekday
                    </p>
                  </div>
                )}

                <p
                  style={{
                    fontSize: "11px",
                    color: "#92400e",
                    backgroundColor: "#fde68a",
                    borderRadius: "6px",
                    padding: "6px 10px",
                  }}
                >
                  🇮🇳 All schedules run in India Standard Time (IST)
                </p>
              </div>
            )}

            {/* WhatsApp config */}
            {trigger === "whatsapp" && (
              <div
                style={{
                  backgroundColor: "#dcfce7",
                  border: "1px solid #86efac",
                  borderRadius: "10px",
                  padding: "16px",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#166534",
                    marginBottom: "12px",
                  }}
                >
                  💬 WhatsApp Trigger Settings
                </p>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "rgba(26,26,46,0.6)",
                      marginBottom: "4px",
                    }}
                  >
                    Trigger keyword{" "}
                    <span style={{ color: "rgba(26,26,46,0.4)" }}>
                      (optional — leave empty to trigger on any message)
                    </span>
                  </label>
                  <input
                    value={waKeyword}
                    onChange={(e) => setWaKeyword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                    placeholder="e.g. hello, order, help"
                  />
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(26,26,46,0.6)",
                    marginTop: "12px",
                  }}
                >
                  Make sure WAHA webhook is pointed to:{" "}
                  <code
                    style={{
                      backgroundColor: "#fff",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/whatsapp/incoming`
                      : "/api/whatsapp/incoming"}
                  </code>
                </p>
              </div>
            )}

            {/* Webhook info */}
            {trigger === "webhook" && (
              <div
                style={{
                  backgroundColor: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: "10px",
                  padding: "16px",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#92400e",
                    marginBottom: "4px",
                  }}
                >
                  🔗 Webhook Trigger
                </p>
                <p style={{ fontSize: "12px", color: "rgba(26,26,46,0.6)" }}>
                  After creating, you&apos;ll get a unique webhook URL to paste
                  into any form builder (Tally, Typeform, Google Forms) or CRM
                  system.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={createWorkflow}
                disabled={creating}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "var(--primary)",
                  color: "#fff",
                  borderRadius: "10px",
                  fontWeight: 500,
                  fontSize: "14px",
                  border: "none",
                  cursor: creating ? "not-allowed" : "pointer",
                  opacity: creating ? 0.5 : 1,
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  !creating &&
                  (e.currentTarget.style.backgroundColor = "#d97706")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--primary)")
                }
              >
                {creating ? "Creating..." : "Create Workflow"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#f3f4f6",
                  color: "var(--foreground)",
                  borderRadius: "10px",
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#e5e7eb")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f3f4f6")
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          className="flex items-center gap-3 py-12 justify-center"
          style={{ color: "rgba(26,26,46,0.4)" }}
        >
          <div
            className="w-5 h-5 rounded-full animate-spin"
            style={{
              border: "2px solid var(--border)",
              borderTopColor: "var(--primary)",
            }}
          />
          Loading workflows...
        </div>
      )}

      {/* Empty state */}
      {!loading && workflows.length === 0 && (
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "64px",
            textAlign: "center",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚡</div>
          <p
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "var(--foreground)",
              marginBottom: "8px",
            }}
          >
            No workflows yet
          </p>
          <p
            style={{
              color: "rgba(26,26,46,0.6)",
              fontSize: "14px",
              marginBottom: "24px",
            }}
          >
            Create your first automation and connect it to any webhook
          </p>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "10px 20px",
              backgroundColor: "var(--primary)",
              color: "#fff",
              borderRadius: "10px",
              fontWeight: 500,
              fontSize: "14px",
              border: "none",
              cursor: "pointer",
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#d97706")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--primary)")
            }
          >
            + Create Workflow
          </button>
        </div>
      )}

      {/* Discovery Banner */}
      {!loading && workflows.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-gray-800 font-medium">
            ✨ Want to build a workflow faster?
          </p>
          <Link
            href="/dashboard/ai?mode=builder"
            className="bg-amber-500 text-white rounded-md px-4 py-2 text-sm font-medium transition hover:bg-amber-600"
          >
            ✨ Build with AI
          </Link>
        </div>
      )}

      {/* Workflow list */}
      {!loading && workflows.length > 0 && (
        <div className="space-y-3">
          {workflows.map((w) => {
            const stepCount = Array.isArray(w.steps) ? w.steps.length : 0;
            const triggerLabel =
              typeof w.triggers === "string"
                ? w.triggers
                : (w.triggers as any)?.type || "webhook";
            const lastStatus = w.lastRun
              ? getStatusStyles(w.lastRun.status)
              : null;
            const isHovered = hoveredCard === w.id;

            return (
              <div
                key={w.id}
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "20px",
                  transition: "all 0.2s ease",
                  boxShadow: isHovered
                    ? "0 4px 12px rgba(0,0,0,0.06)"
                    : "0 1px 2px rgba(0,0,0,0.05)",
                }}
                onMouseEnter={() => setHoveredCard(w.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left content */}
                  <div className="flex-1 min-w-0">
                    {/* Name + status */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "var(--foreground)",
                        }}
                      >
                        {w.name}
                      </h3>
                      {lastStatus ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: lastStatus.bg,
                            color: lastStatus.text,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: lastStatus.dot }}
                          />
                          {w.lastRun!.status}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "#f3f4f6",
                            color: "#6b7280",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: "#9ca3af" }}
                          />
                          never run
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {w.description && (
                      <p
                        className="truncate"
                        style={{
                          color: "rgba(26,26,46,0.6)",
                          fontSize: "14px",
                          marginBottom: "8px",
                        }}
                      >
                        {w.description}
                      </p>
                    )}

                    {/* Meta row */}
                    <div
                      className="flex items-center gap-4 text-xs flex-wrap mb-3"
                      style={{ color: "rgba(26,26,46,0.4)" }}
                    >
                      <span>
                        Created {new Date(w.createdAt).toLocaleDateString()}
                      </span>
                      <span>
                        Trigger:{" "}
                        <code
                          style={{
                            backgroundColor: "#f3f4f6",
                            color: "rgba(26,26,46,0.6)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {triggerLabel}
                        </code>
                      </span>
                      <span>
                        {stepCount} step{stepCount !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {w.runCount} run{w.runCount !== 1 ? "s" : ""}
                      </span>
                      {w.lastRun && (
                        <span>Last run {timeAgo(w.lastRun.startedAt)}</span>
                      )}
                    </div>

                    {/* Trigger info row */}
                    {(w.triggers as any)?.type === "webhook" ||
                    typeof w.triggers === "string" ? (
                      <div className="flex items-center gap-2">
                        <code
                          className="flex-1 truncate"
                          style={{
                            fontSize: "12px",
                            backgroundColor: "#f9fafb",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            color: "rgba(26,26,46,0.6)",
                          }}
                        >
                          {typeof window !== "undefined"
                            ? `${window.location.origin}/api/webhook/${w.id}`
                            : `/api/webhook/${w.id}`}
                        </code>
                        <button
                          onClick={() => copyWebhookUrl(w.id)}
                          style={{
                            padding: "8px 12px",
                            fontSize: "12px",
                            backgroundColor: "#f3f4f6",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                            transition: "background-color 0.2s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#e5e7eb")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "#f3f4f6")
                          }
                        >
                          {copiedId === w.id ? "✅ Copied" : "Copy URL"}
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "rgba(26,26,46,0.4)",
                          backgroundColor: "#f9fafb",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          padding: "8px 12px",
                        }}
                      >
                        {(w.triggers as any)?.type === "schedule" &&
                          `⏰ Cron: ${(w.triggers as any)?.cron}`}
                        {(w.triggers as any)?.type === "whatsapp" &&
                          `💬 Keyword: ${(w.triggers as any)?.keyword || "any message"}`}
                        {(w.triggers as any)?.type === "manual" &&
                          `🖐 Manual — click Run Now`}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link
                      href={`/dashboard/workflows/${w.id}`}
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "var(--primary)",
                        color: "#fff",
                        borderRadius: "10px",
                        fontWeight: 500,
                        fontSize: "14px",
                        textAlign: "center",
                        textDecoration: "none",
                        transition: "background-color 0.2s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#d97706")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "var(--primary)")
                      }
                    >
                      Open
                    </Link>

                    {/* isActive Toggle Switch */}
                    <button
                      onClick={() =>
                        toggleWorkflowActive(w.id, w.isActive ?? true)
                      }
                      disabled={togglingId === w.id}
                      style={{
                        padding: "10px 16px",
                        backgroundColor:
                          (w.isActive ?? true) ? "#dcfce7" : "#fef3c7",
                        color: (w.isActive ?? true) ? "#166534" : "#92400e",
                        borderRadius: "10px",
                        fontSize: "14px",
                        border:
                          "1px solid " +
                          ((w.isActive ?? true) ? "#86efac" : "#fcd34d"),
                        cursor: togglingId === w.id ? "not-allowed" : "pointer",
                        opacity: togglingId === w.id ? 0.5 : 1,
                        transition: "all 0.2s ease",
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) =>
                        togglingId !== w.id &&
                        ((
                          e.currentTarget as HTMLButtonElement
                        ).style.transform = "scale(1.02)")
                      }
                      onMouseLeave={(e) =>
                        ((
                          e.currentTarget as HTMLButtonElement
                        ).style.transform = "scale(1)")
                      }
                      title={
                        (w.isActive ?? true)
                          ? "Click to pause"
                          : "Click to resume"
                      }
                    >
                      {togglingId === w.id
                        ? "..."
                        : (w.isActive ?? true)
                          ? "🟢 Active"
                          : "🟡 Paused"}
                    </button>

                    <button
                      onClick={() => deleteWorkflow(w.id)}
                      disabled={deletingId === w.id}
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "#fef2f2",
                        color: "#dc2626",
                        borderRadius: "10px",
                        fontSize: "14px",
                        border: "none",
                        cursor: deletingId === w.id ? "not-allowed" : "pointer",
                        opacity: deletingId === w.id ? 0.5 : 1,
                        transition: "background-color 0.2s ease",
                      }}
                      onMouseEnter={(e) =>
                        deletingId !== w.id &&
                        (e.currentTarget.style.backgroundColor = "#fee2e2")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#fef2f2")
                      }
                    >
                      {deletingId === w.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
