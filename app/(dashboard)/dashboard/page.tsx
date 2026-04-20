"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Mail,
  MessageCircle,
  Brain,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

type Workflow = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
};

type WorkflowRun = {
  id: string;
  workflowId: string;
  status: string;
  trigger?: string;
  startedAt: string;
  workflow?: { name: string };
};

export default function DashboardPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [recentRuns, setRecentRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch workflows
        const workflowsRes = await fetch("/api/workflows");
        const workflowsData = await workflowsRes.json();
        const workflowsArray = Array.isArray(workflowsData)
          ? workflowsData
          : workflowsData.workflows || [];
        setWorkflows(workflowsArray);

        // Fetch runs from first workflow if exists
        if (workflowsArray.length > 0) {
          try {
            const runsRes = await fetch(
              `/api/workflows/${workflowsArray[0].id}/runs`,
            );
            const runsData = await runsRes.json();
            const runsArray = Array.isArray(runsData)
              ? runsData
              : runsData.runs || [];
            setRecentRuns(runsArray.slice(0, 5));
          } catch {
            // Silently ignore runs fetch error
          }
        }
      } catch {
        // Silently ignore workflows fetch error
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Compute stats
  const totalWorkflows = workflows.length;
  const activeWorkflows = workflows.filter((w) => w.isActive).length;
  const totalRuns = recentRuns.length;
  const successRuns = recentRuns.filter((r) => r.status === "completed").length;
  const successRate =
    totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0;

  return (
    <div style={{ padding: "16px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div
        className="dash-header"
        style={{
          gap: 8,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "clamp(20px, 5vw, 28px)",
              fontWeight: 700,
              color: "var(--foreground)",
            }}
          >
            Dashboard
          </h1>
          <p
            style={{
              fontSize: "clamp(12px, 3vw, 14px)",
              color: "var(--muted-foreground)",
              marginTop: 2,
            }}
          >
            Welcome back! Here's what's happening with your automations.
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/workflows")}
          style={{
            backgroundColor: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: "clamp(12px, 2.5vw, 14px)",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={14} />
          New Workflow
        </button>
      </div>

      {/* Stats Cards */}
      <div
        className="dash-stats"
        style={{
          marginTop: 20,
        }}
      >
        {/* Card 1: Total Workflows */}
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "clamp(12px, 3vw, 20px)",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "#fef3c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Zap size={16} color="var(--primary)" />
          </div>
          <div
            style={{
              fontSize: "clamp(24px, 5vw, 32px)",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: 2,
            }}
          >
            {totalWorkflows}
          </div>
          <div
            style={{
              fontSize: "clamp(12px, 3vw, 14px)",
              color: "var(--muted-foreground)",
              marginBottom: 4,
            }}
          >
            Total Workflows
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontSize: 11,
              color: "#16a34a",
            }}
          >
            <ArrowUpRight size={12} />
            {activeWorkflows} active
          </div>
        </div>

        {/* Card 2: Active Workflows */}
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "clamp(12px, 3vw, 20px)",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "#dcfce7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <CheckCircle2 size={16} color="#16a34a" />
          </div>
          <div
            style={{
              fontSize: "clamp(24px, 5vw, 32px)",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: 2,
            }}
          >
            {activeWorkflows}
          </div>
          <div
            style={{
              fontSize: "clamp(12px, 3vw, 14px)",
              color: "var(--muted-foreground)",
              marginBottom: 4,
            }}
          >
            Active Workflows
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            {totalWorkflows - activeWorkflows} paused
          </div>
        </div>

        {/* Card 3: Recent Runs */}
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "clamp(12px, 3vw, 20px)",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "#dbeafe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Clock size={16} color="#3b82f6" />
          </div>
          <div
            style={{
              fontSize: "clamp(24px, 5vw, 32px)",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: 2,
            }}
          >
            {totalRuns}
          </div>
          <div
            style={{
              fontSize: "clamp(12px, 3vw, 14px)",
              color: "var(--muted-foreground)",
              marginBottom: 4,
            }}
          >
            Recent Runs
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontSize: 11,
              color: "#16a34a",
            }}
          >
            <ArrowUpRight size={14} />
            {successRuns} succeeded
          </div>
        </div>

        {/* Card 4: Success Rate */}
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "clamp(12px, 3vw, 20px)",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "#ede9fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Brain size={16} color="#8b5cf6" />
          </div>
          <div
            style={{
              fontSize: "clamp(24px, 5vw, 32px)",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: 2,
            }}
          >
            {totalRuns > 0
              ? `${Math.round((successRuns / totalRuns) * 100)}%`
              : "—"}
          </div>
          <div
            style={{
              fontSize: "clamp(12px, 3vw, 14px)",
              color: "var(--muted-foreground)",
              marginBottom: 4,
            }}
          >
            Success Rate
          </div>
          {totalRuns > 0 && successRuns < totalRuns ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 11,
                color: "#dc2626",
              }}
            >
              <ArrowDownRight size={14} />
              {totalRuns - successRuns} failed
            </div>
          ) : totalRuns > 0 ? (
            <div
              style={{
                fontSize: 12,
                color: "#16a34a",
              }}
            >
              All passing
            </div>
          ) : null}
        </div>
      </div>

      {/* Recent Workflows Section */}
      <div style={{ marginTop: 32 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--foreground)",
            marginBottom: 16,
          }}
        >
          Recent Workflows
        </h2>

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 40,
            }}
          >
            <Loader2
              size={24}
              color="var(--primary)"
              style={{ animation: "spin 1s linear infinite" }}
            />
          </div>
        ) : workflows.length === 0 ? (
          <div
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 40,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: "var(--muted-foreground)",
                marginBottom: 16,
              }}
            >
              No workflows yet. Create your first one!
            </p>
            <button
              onClick={() => router.push("/dashboard/workflows")}
              style={{
                backgroundColor: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={14} />
              Create Workflow
            </button>
          </div>
        ) : (
          <>
            {workflows.slice(0, 5).map((workflow) => (
              <div
                key={workflow.id}
                className="dash-workflow-row"
                style={{
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: workflow.isActive ? "#16a34a" : "#e5e7eb",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--foreground)",
                    }}
                  >
                    {workflow.name}
                  </div>
                  {workflow.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted-foreground)",
                        marginLeft: 8,
                        marginTop: 2,
                      }}
                    >
                      {workflow.description}
                    </div>
                  )}
                </div>
                <div className="dash-workflow-date">
                  {new Date(workflow.createdAt).toLocaleDateString("en-IN")}
                </div>
                <button
                  onClick={() =>
                    router.push(`/dashboard/workflows/${workflow.id}`)
                  }
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--accent-foreground)",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 14px",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  View
                </button>
              </div>
            ))}
            {workflows.length > 5 && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => router.push("/dashboard/workflows")}
                  style={{
                    fontSize: 13,
                    color: "var(--primary)",
                    textDecoration: "none",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  View all workflows →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Actions Section */}
      <div style={{ marginTop: 32, marginBottom: 48 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--foreground)",
            marginBottom: 16,
          }}
        >
          Quick Actions
        </h2>
        <div
          className="dash-quick-actions"
          style={{
            marginTop: 16,
          }}
        >
          {/* Create Workflow Card */}
          <button
            onClick={() => router.push("/dashboard/workflows")}
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              textAlign: "left",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--primary)";
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--border)";
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "var(--card)";
            }}
          >
            <Zap size={24} color="var(--primary)" />
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--foreground)",
                }}
              >
                Create Workflow
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  marginTop: 4,
                }}
              >
                Build a new automation in minutes
              </div>
            </div>
          </button>

          {/* Send Email Card */}
          <button
            onClick={() => router.push("/dashboard/email")}
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              textAlign: "left",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#3b82f6";
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--border)";
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "var(--card)";
            }}
          >
            <Mail size={24} color="#3b82f6" />
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--foreground)",
                }}
              >
                Send Email
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  marginTop: 4,
                }}
              >
                Send a one-off email to anyone
              </div>
            </div>
          </button>

          {/* WhatsApp Message Card */}
          <button
            onClick={() => router.push("/dashboard/whatsapp")}
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              textAlign: "left",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#16a34a";
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--border)";
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "var(--card)";
            }}
          >
            <MessageCircle size={24} color="#16a34a" />
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--foreground)",
                }}
              >
                WhatsApp Message
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  marginTop: 4,
                }}
              >
                Send a WhatsApp message instantly
              </div>
            </div>
          </button>
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
        
        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .dash-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px;
        }
        
        .dash-quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .dash-workflow-row {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          background-color: var(--card);
          border: 1px solid var(--border);
          border-radius: 10px;
          margin-bottom: 8px;
        }
        
        .dash-workflow-date {
          font-size: 12px;
          color: var(--muted-foreground);
          min-width: 80px;
        }
        
        @media (max-width: 768px) {
          .dash-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .dash-quick-actions {
            grid-template-columns: repeat(1, 1fr);
          }
          
          .dash-workflow-date {
            display: none;
          }
        }
        
        @media (max-width: 480px) {
          .dash-stats {
            grid-template-columns: repeat(1, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
