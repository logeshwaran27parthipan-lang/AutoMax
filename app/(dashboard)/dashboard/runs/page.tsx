"use client";

import { useEffect, useState } from "react";
import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

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

  const fetchRuns = async (loadMore: boolean = false) => {
    try {
      setLoading(true);
      const url = `/api/runs?limit=50&offset=${loadMore ? offset + 50 : 0}`;
      const res = await fetch(url);
      const data = await res.json();

      if (loadMore) {
        setRuns([...runs, ...(data.runs || [])]);
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
        return "#10b981"; // Green
      case "failed":
        return "#ef4444"; // Red
      case "running":
        return "#f59e0b"; // Amber
      default:
        return "#6b7280"; // Gray
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
        <p
          style={{
            fontSize: "14px",
            color: "var(--muted-foreground)",
          }}
        >
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
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted-foreground)",
            }}
          >
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
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: "var(--muted)",
                  }}
                >
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--muted-foreground)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Workflow
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--muted-foreground)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--muted-foreground)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Trigger
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--muted-foreground)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Started
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--muted-foreground)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Duration
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--muted-foreground)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Steps
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run, idx) => (
                  <tr
                    key={run.id}
                    style={{
                      borderBottom:
                        idx < runs.length - 1
                          ? "1px solid var(--border)"
                          : "none",
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
                          cursor: "pointer",
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
                            style={{
                              color: "#10b981",
                            }}
                          />
                        )}
                        {run.status === "failed" && (
                          <XCircle
                            size={16}
                            style={{
                              color: "#ef4444",
                            }}
                          />
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More Button */}
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
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.opacity =
                      "0.9";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                }}
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}

      {/* CSS for animations */}
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
