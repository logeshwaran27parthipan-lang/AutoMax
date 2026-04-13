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

function statusColor(status: string) {
  if (status === "completed") return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
  if (status === "failed") return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
  return { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" };
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
  const [schedulePreset, setSchedulePreset] = useState("0 9 * * *");
  const [waKeyword, setWaKeyword] = useState("");

  useEffect(() => { fetchWorkflows(); }, []);

  async function fetchWorkflows() {
    try {
      const res = await axios.get("/api/workflows");
      setWorkflows(res.data);
    } catch {
      // silently fail — user sees empty state
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
      triggerConfig.cron = schedulePreset;
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
    setSchedulePreset("0 9 * * *");
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

  function copyWebhookUrl(id: string) {
    const url = `${window.location.origin}/api/webhook/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? "Loading..." : `${workflows.length} workflow${workflows.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(""); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
        >
          + New Workflow
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">New Workflow</h2>
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createWorkflow()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Lead Follow-up"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="What does this workflow do?"
              />
            </div>
            {/* Trigger Type Selector */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    How should this workflow start?
  </label>
  <div className="grid grid-cols-2 gap-2">
    {[
      { value: "webhook", icon: "🔗", label: "Webhook", desc: "Triggered by forms, CRMs, or any app" },
      { value: "schedule", icon: "⏰", label: "Schedule", desc: "Run automatically on a schedule" },
      { value: "whatsapp", icon: "💬", label: "WhatsApp", desc: "When someone messages you on WhatsApp" },
      { value: "manual", icon: "▶️", label: "Manual", desc: "Only when you click Run Now" },
    ].map((t) => (
      <button
        key={t.value}
        type="button"
        onClick={() => setTrigger(t.value)}
        className={`p-3 rounded-lg border-2 text-left transition-all ${
          trigger === t.value
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200 hover:border-gray-300 bg-white"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span>{t.icon}</span>
          <span className="text-sm font-medium text-gray-800">{t.label}</span>
        </div>
        <p className="text-xs text-gray-500">{t.desc}</p>
      </button>
    ))}
  </div>
</div>

{/* Schedule config — only show if schedule selected */}
{trigger === "schedule" && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
    <p className="text-sm font-medium text-yellow-800">⏰ Schedule Settings</p>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Run frequency</label>
      <select
        value={schedulePreset}
        onChange={(e) => setSchedulePreset(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="0 9 * * *">Every day at 9:00 AM</option>
        <option value="0 9 * * 1">Every Monday at 9:00 AM</option>
        <option value="0 9 1 * *">First day of every month</option>
        <option value="*/30 * * * *">Every 30 minutes</option>
        <option value="* * * * *">Every minutes</option>
        <option value="0 * * * *">Every hour</option>
      </select>
    </div>
  </div>
)}

{/* WhatsApp trigger config */}
{trigger === "whatsapp" && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
    <p className="text-sm font-medium text-green-800">💬 WhatsApp Trigger Settings</p>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        Trigger keyword <span className="text-gray-400">(optional — leave empty to trigger on any message)</span>
      </label>
      <input
        value={waKeyword}
        onChange={(e) => setWaKeyword(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="e.g. hello, order, help"
      />
    </div>
    <p className="text-xs text-gray-500">
      Make sure WAHA webhook is pointed to:{" "}
      <code className="bg-white px-1 rounded border">
        {typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/incoming` : "/api/whatsapp/incoming"}
      </code>
    </p>
  </div>
)}

{/* Webhook info */}
{trigger === "webhook" && (
  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
    <p className="text-sm font-medium text-blue-800 mb-1">🔗 Webhook Trigger</p>
    <p className="text-xs text-gray-600">
      After creating, you'll get a unique webhook URL to paste into any form builder
      (Tally, Typeform, Google Forms) or CRM system.
    </p>
  </div>
)}
            <div className="flex gap-2 pt-1">
              <button
                onClick={createWorkflow}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {creating ? "Creating..." : "Create Workflow"}
              </button>
              <button
                onClick={() => { setShowForm(false); setError(""); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-400 py-12 justify-center">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading workflows...
        </div>
      )}

      {/* Empty state */}
      {!loading && workflows.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center shadow-sm">
          <div className="text-5xl mb-4">⚡</div>
          <p className="text-xl font-semibold text-gray-800 mb-2">No workflows yet</p>
          <p className="text-gray-500 text-sm mb-6">Create your first automation and connect it to any webhook</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Create Workflow
          </button>
        </div>
      )}

      {/* Workflow list */}
      {!loading && workflows.length > 0 && (
        <div className="space-y-3">
          {workflows.map((w) => {
            const stepCount = Array.isArray(w.steps) ? w.steps.length : 0;
            const triggerLabel = typeof w.triggers === "string" ? w.triggers : "webhook";
            const lastStatus = w.lastRun ? statusColor(w.lastRun.status) : null;

            return (
              <div key={w.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Name + last run status */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900">{w.name}</h3>
                      {lastStatus ? (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${lastStatus.bg} ${lastStatus.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${lastStatus.dot}`} />
                          {w.lastRun!.status}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          never run
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {w.description && (
                      <p className="text-gray-500 text-sm mb-2 truncate">{w.description}</p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-3 flex-wrap">
                      <span>Created {new Date(w.createdAt).toLocaleDateString()}</span>
                      <span>
                        Trigger: <code className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{triggerLabel}</code>
                      </span>
                      <span>{stepCount} step{stepCount !== 1 ? "s" : ""}</span>
                      <span>{w.runCount} run{w.runCount !== 1 ? "s" : ""}</span>
                      {w.lastRun && (
                        <span>Last run {timeAgo(w.lastRun.startedAt)}</span>
                      )}
                    </div>

                    {/* Webhook URL */}
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 flex-1 truncate">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/api/webhook/${w.id}`
                          : `/api/webhook/${w.id}`}
                      </code>
                      <button
                        onClick={() => copyWebhookUrl(w.id)}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 whitespace-nowrap transition-colors"
                      >
                        {copiedId === w.id ? "✅ Copied" : "Copy URL"}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link
                      href={`/dashboard/workflows/${w.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium text-center transition-colors"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => deleteWorkflow(w.id)}
                      disabled={deletingId === w.id}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm disabled:opacity-50 transition-colors"
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