"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type RunStep = {
  id: string;
  stepIndex: number;
  stepType: string;
  status: string;
  input: unknown;
  output: unknown;
  error: string | null;
  executedAt: string;
};

type RunRecord = {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "running" | "completed" | "failed";
  trigger: "schedule" | "webhook" | "manual";
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
  stepCount: number;
  completedSteps: number;
};

export default function RunsHistoryPage() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Details panel state
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runSteps, setRunSteps] = useState<Record<string, RunStep[]>>({});
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [loadingSteps, setLoadingSteps] = useState<string | null>(null);

  const fetchRuns = async (loadMore: boolean = false) => {
    try {
      setLoading(true);
      const url = `/api/runs?limit=50&offset=${loadMore ? offset + 50 : 0}`;
      const res = await fetch(url);
      const data = await res.json();

      if (loadMore) {
        setRuns((prev) => [...prev, ...(data.runs || [])]);
        setOffset(offset + 50);
      } else {
        setRuns(data.runs || []);
        setOffset(0);
      }

      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error("[RUNS_PAGE] Error fetching runs", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStepsForRun = async (run: RunRecord) => {
    if (runSteps[run.id]) return; // already loaded
    try {
      setLoadingSteps(run.id);
      const res = await fetch(`/api/workflows/${run.workflowId}/runs`);
      const data = await res.json();
      const allRuns: Array<{ id: string; steps: RunStep[] }> = Array.isArray(
        data,
      )
        ? data
        : data.runs || [];
      const matched = allRuns.find((r) => r.id === run.id);
      setRunSteps((prev) => ({ ...prev, [run.id]: matched?.steps || [] }));
    } catch (err) {
      console.error("[RUNS_PAGE] Error fetching steps", err);
      setRunSteps((prev) => ({ ...prev, [run.id]: [] }));
    } finally {
      setLoadingSteps(null);
    }
  };

  const toggleDetails = async (run: RunRecord) => {
    if (expandedRunId === run.id) {
      setExpandedRunId(null);
    } else {
      setExpandedRunId(run.id);
      await fetchStepsForRun(run);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10b981";
      case "failed":
        return "#ef4444";
      case "running":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  const getTriggerBadgeStyle = (trigger: string) => ({
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 500,
    backgroundColor:
      trigger === "schedule"
        ? "#dbeafe"
        : trigger === "webhook"
          ? "#ddd6fe"
          : "#fce7f3",
    color:
      trigger === "schedule"
        ? "#1e40af"
        : trigger === "webhook"
          ? "#5b21b6"
          : "#be185d",
  });

  return (
    <div style={{ padding: "16px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--foreground)",
            marginBottom: "8px",
          }}
        >
          Run History
        </h1>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
          View all workflow executions across your automations
        </p>
      </div>

      {/* Loading State */}
      {loading && runs.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "var(--muted-foreground)",
          }}
        >
          <Loader2
            size={24}
            style={{
              margin: "0 auto 16px",
              animation: "spin 1s linear infinite",
            }}
          />
          <p>Loading runs...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && runs.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            backgroundColor: "var(--card)",
          }}
        >
          <Clock
            size={32}
            style={{ margin: "0 auto 16px", color: "var(--muted-foreground)" }}
          />
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
            No workflow runs yet
          </p>
        </div>
      )}

      {/* Runs Table */}
      {runs.length > 0 && (
        <>
          <div
            style={{
              overflowX: "auto",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              backgroundColor: "var(--card)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: "var(--muted)",
                  }}
                >
                  {[
                    "Workflow",
                    "Status",
                    "Trigger",
                    "Started",
                    "Duration",
                    "Steps",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: h === "Steps" ? "center" : "left",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--muted-foreground)",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run, idx) => (
                  <React.Fragment key={run.id}>
                    <tr
                      key={run.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--muted-light)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {/* Workflow Name */}
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "var(--foreground)",
                        }}
                      >
                        <a
                          href={`/dashboard/workflows/${run.workflowId}`}
                          style={{
                            color: "var(--primary)",
                            textDecoration: "none",
                          }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLAnchorElement
                            ).style.textDecoration = "underline";
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLAnchorElement
                            ).style.textDecoration = "none";
                          }}
                        >
                          {run.workflowName}
                        </a>
                      </td>

                      {/* Status */}
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          fontWeight: 500,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {run.status === "completed" && (
                            <CheckCircle2
                              size={16}
                              style={{ color: "#10b981" }}
                            />
                          )}
                          {run.status === "failed" && (
                            <XCircle size={16} style={{ color: "#ef4444" }} />
                          )}
                          {run.status === "running" && (
                            <Loader2
                              size={16}
                              style={{
                                color: "#f59e0b",
                                animation: "spin 1s linear infinite",
                              }}
                            />
                          )}
                          <span style={{ color: getStatusColor(run.status) }}>
                            {run.status.charAt(0).toUpperCase() +
                              run.status.slice(1)}
                          </span>
                        </div>
                      </td>

                      {/* Trigger */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={getTriggerBadgeStyle(run.trigger)}>
                          {run.trigger.charAt(0).toUpperCase() +
                            run.trigger.slice(1)}
                        </span>
                      </td>

                      {/* Started At */}
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {formatDate(run.startedAt)}
                      </td>

                      {/* Duration */}
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {formatDuration(run.duration)}
                      </td>

                      {/* Steps */}
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "center",
                          fontSize: "13px",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {run.completedSteps}/{run.stepCount}
                      </td>

                      {/* Details Toggle */}
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => toggleDetails(run)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "var(--primary)",
                            backgroundColor: "transparent",
                            border: "1px solid var(--border)",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          {expandedRunId === run.id ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                          Details
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {expandedRunId === run.id && (
                      <tr
                        key={`${run.id}-details`}
                        style={{ backgroundColor: "var(--muted)" }}
                      >
                        <td colSpan={7} style={{ padding: "16px" }}>
                          {loadingSteps === run.id ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                color: "var(--muted-foreground)",
                                fontSize: "13px",
                              }}
                            >
                              <Loader2
                                size={14}
                                style={{ animation: "spin 1s linear infinite" }}
                              />
                              Loading steps...
                            </div>
                          ) : (runSteps[run.id] || []).length === 0 ? (
                            <p
                              style={{
                                fontSize: "13px",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              No step data available.
                            </p>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              {(runSteps[run.id] || []).map((step) => {
                                const stepKey = `${run.id}-${step.id}`;
                                const isOpen = expandedStep === stepKey;
                                return (
                                  <div
                                    key={step.id}
                                    style={{
                                      border: "1px solid var(--border)",
                                      borderRadius: "6px",
                                      backgroundColor: "var(--card)",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "10px 14px",
                                        cursor: "pointer",
                                      }}
                                      onClick={() =>
                                        setExpandedStep(isOpen ? null : stepKey)
                                      }
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "10px",
                                        }}
                                      >
                                        {step.status === "completed" && (
                                          <CheckCircle2
                                            size={14}
                                            style={{ color: "#10b981" }}
                                          />
                                        )}
                                        {step.status === "failed" && (
                                          <XCircle
                                            size={14}
                                            style={{ color: "#ef4444" }}
                                          />
                                        )}
                                        {step.status === "running" && (
                                          <Loader2
                                            size={14}
                                            style={{
                                              color: "#f59e0b",
                                              animation:
                                                "spin 1s linear infinite",
                                            }}
                                          />
                                        )}
                                        <span
                                          style={{
                                            fontSize: "13px",
                                            fontWeight: 500,
                                            color: "var(--foreground)",
                                          }}
                                        >
                                          Step {step.stepIndex + 1}:{" "}
                                          {step.stepType}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: "12px",
                                            color: getStatusColor(step.status),
                                          }}
                                        >
                                          {step.status}
                                        </span>
                                      </div>
                                      {isOpen ? (
                                        <ChevronUp size={14} />
                                      ) : (
                                        <ChevronDown size={14} />
                                      )}
                                    </div>

                                    {isOpen && (
                                      <div
                                        style={{
                                          padding: "0 14px 14px",
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "10px",
                                        }}
                                      >
                                        {step.error && (
                                          <div>
                                            <p
                                              style={{
                                                fontSize: "11px",
                                                fontWeight: 600,
                                                color: "#ef4444",
                                                marginBottom: "4px",
                                              }}
                                            >
                                              ERROR
                                            </p>
                                            <pre
                                              style={{
                                                fontSize: "12px",
                                                backgroundColor: "#fef2f2",
                                                border: "1px solid #fecaca",
                                                borderRadius: "4px",
                                                padding: "8px",
                                                overflowX: "auto",
                                                whiteSpace: "pre-wrap",
                                                wordBreak: "break-all",
                                                color: "#991b1b",
                                                margin: 0,
                                              }}
                                            >
                                              {step.error}
                                            </pre>
                                          </div>
                                        )}
                                        <div>
                                          <p
                                            style={{
                                              fontSize: "11px",
                                              fontWeight: 600,
                                              color: "var(--muted-foreground)",
                                              marginBottom: "4px",
                                            }}
                                          >
                                            INPUT
                                          </p>
                                          <pre
                                            style={{
                                              fontSize: "12px",
                                              backgroundColor: "var(--muted)",
                                              border: "1px solid var(--border)",
                                              borderRadius: "4px",
                                              padding: "8px",
                                              overflowX: "auto",
                                              whiteSpace: "pre-wrap",
                                              wordBreak: "break-all",
                                              margin: 0,
                                            }}
                                          >
                                            {JSON.stringify(
                                              step.input,
                                              null,
                                              2,
                                            ) || "—"}
                                          </pre>
                                        </div>
                                        <div>
                                          <p
                                            style={{
                                              fontSize: "11px",
                                              fontWeight: 600,
                                              color: "var(--muted-foreground)",
                                              marginBottom: "4px",
                                            }}
                                          >
                                            OUTPUT
                                          </p>
                                          <pre
                                            style={{
                                              fontSize: "12px",
                                              backgroundColor: "var(--muted)",
                                              border: "1px solid var(--border)",
                                              borderRadius: "4px",
                                              padding: "8px",
                                              overflowX: "auto",
                                              whiteSpace: "pre-wrap",
                                              wordBreak: "break-all",
                                              margin: 0,
                                            }}
                                          >
                                            {JSON.stringify(
                                              step.output,
                                              null,
                                              2,
                                            ) || "—"}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasMore && (
            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <button
                onClick={() => fetchRuns(true)}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
