"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";

type Step = {
  type: string;
  [key: string]: any;
};

type Run = {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  steps: { stepIndex: number; stepType: string; status: string; error?: string }[];
};

type Workflow = {
  id: string;
  name: string;
  description?: string;
  triggers: any;
  steps: Step[];
  createdAt: string;
};

const STEP_TYPES = [
  { value: "send_email", label: "Send Email" },
  { value: "send_whatsapp", label: "Send WhatsApp" },
  { value: "ai_decision", label: "AI Decision" },
  { value: "sheets_read", label: "Sheets Read" },
  { value: "sheets_append", label: "Sheets Append" },
];

function stepSummary(s: Step): string {
  if (s.type === "send_email") return `To: ${s.to || "—"}  Subject: ${s.subject || "—"}`;
  if (s.type === "send_whatsapp") return `Phone: ${s.to || s.phone || "—"}`;
  if (s.type === "ai_decision") return `Prompt: ${String(s.prompt || "—").slice(0, 60)}`;
  if (s.type === "sheets_read") return `${s.spreadsheetId || "—"} / ${s.range || "—"}`;
  if (s.type === "sheets_append") return `${s.spreadsheetId || "—"} / ${s.range || "—"}`;
  return JSON.stringify(s);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"steps" | "runs">("steps");

  // Add step form
  const [showAddForm, setShowAddForm] = useState(false);
  const [stepType, setStepType] = useState("send_email");
  const [formState, setFormState] = useState<any>({});
  const [formError, setFormError] = useState("");

  useEffect(() => { if (id) { fetchWorkflow(); fetchRuns(); } }, [id]);

  async function fetchWorkflow() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/workflows/${id}`);
      const data = res.data;
      // normalize steps to array
      let steps = data.steps;
      if (!Array.isArray(steps)) {
        try { steps = steps ? JSON.parse(JSON.stringify(steps)) : []; } catch { steps = []; }
        if (!Array.isArray(steps)) steps = [];
      }
      setWorkflow({ ...data, steps });
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load workflow");
    } finally {
      setLoading(false);
    }
  }

  async function fetchRuns() {
    try {
      const res = await axios.get(`/api/workflows/${id}/runs`);
      setRuns(res.data || []);
    } catch {
      // non-fatal
    }
  }

  async function saveSteps(updatedSteps: Step[]) {
    setSaving(true);
    setError(null);
    try {
      await axios.put(`/api/workflows/${id}`, { steps: updatedSteps });
      await fetchWorkflow();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save steps");
    } finally {
      setSaving(false);
    }
  }

  function buildStep(): Step | null {
    setFormError("");
    const s: Step = { type: stepType };
    try {
      if (stepType === "send_email") {
        if (!formState.to) { setFormError("To is required"); return null; }
        if (!formState.subject) { setFormError("Subject is required"); return null; }
        s.to = formState.to;
        s.subject = formState.subject;
        s.body = formState.body || "";
      } else if (stepType === "send_whatsapp") {
        if (!formState.to) { setFormError("Phone is required"); return null; }
        s.to = formState.to;
        s.message = formState.message || "";
      } else if (stepType === "ai_decision") {
        if (!formState.prompt) { setFormError("Prompt is required"); return null; }
        s.prompt = formState.prompt;
      } else if (stepType === "sheets_read") {
        if (!formState.spreadsheetId) { setFormError("Spreadsheet ID is required"); return null; }
        s.spreadsheetId = formState.spreadsheetId;
        s.range = formState.range || "Sheet1!A1:Z100";
      } else if (stepType === "sheets_append") {
        if (!formState.spreadsheetId) { setFormError("Spreadsheet ID is required"); return null; }
        s.spreadsheetId = formState.spreadsheetId;
        s.range = formState.range || "Sheet1!A1";
        try { s.values = formState.values ? JSON.parse(formState.values) : []; }
        catch { setFormError("Values must be valid JSON e.g. [[\"a\",\"b\"]]"); return null; }
      }
    } catch (e: any) {
      setFormError(e.message);
      return null;
    }
    return s;
  }

  async function handleAddStep() {
    const step = buildStep();
    if (!step || !workflow) return;
    const updated = [...(workflow.steps || []), step];
    await saveSteps(updated);
    setShowAddForm(false);
    setFormState({});
    setStepType("send_email");
  }

  async function handleDeleteStep(idx: number) {
    if (!workflow) return;
    if (!confirm("Delete this step?")) return;
    const updated = workflow.steps.filter((_, i) => i !== idx);
    await saveSteps(updated);
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      await axios.post(`/api/workflows/${id}/run`);
      await fetchRuns();
      setActiveTab("runs");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to run workflow");
    } finally {
      setRunning(false);
    }
  }

  const triggerLabel = typeof workflow?.triggers === "string"
    ? workflow.triggers
    : (workflow?.triggers as any)?.type || "webhook";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/workflows")}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm transition-colors"
          >
            ← Back
          </button>
          {workflow && (
            <div>
              <h1 className="text-xl font-bold text-gray-900">{workflow.name}</h1>
              {workflow.description && (
                <p className="text-sm text-gray-500">{workflow.description}</p>
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleRun}
          disabled={running || !workflow}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {running ? "Running..." : "▶ Run Now"}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-400 py-12 justify-center">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      )}

      {!loading && workflow && (
        <>
          {/* Meta bar */}
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-6">
            <span>Created {new Date(workflow.createdAt).toLocaleDateString()}</span>
            <span>Trigger: <code className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{triggerLabel}</code></span>
            <span>{workflow.steps.length} step{workflow.steps.length !== 1 ? "s" : ""}</span>
            <span>{runs.length} run{runs.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Webhook URL */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <span className="text-xs text-gray-400 shrink-0">Webhook URL</span>
            <code className="text-xs text-gray-600 flex-1 truncate">
              {typeof window !== "undefined" ? `${window.location.origin}/api/webhook/${id}` : `/api/webhook/${id}`}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhook/${id}`)}
              className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 shrink-0"
            >
              Copy
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-gray-200">
            {(["steps", "runs"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "steps" ? `Steps (${workflow.steps.length})` : `Run History (${runs.length})`}
              </button>
            ))}
          </div>

          {/* STEPS TAB */}
          {activeTab === "steps" && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="font-medium text-gray-900">Steps</span>
                <button
                  onClick={() => { setShowAddForm(!showAddForm); setFormError(""); setFormState({}); }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  {showAddForm ? "Cancel" : "+ Add Step"}
                </button>
              </div>

              {/* Add step form */}
              {showAddForm && (
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  {formError && (
                    <div className="text-red-600 text-sm mb-3">{formError}</div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Step type</label>
                      <select
                        value={stepType}
                        onChange={(e) => { setStepType(e.target.value); setFormState({}); setFormError(""); }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {stepType === "send_email" && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">To (email)</label>
                          <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="recipient@example.com" value={formState.to || ""} onChange={(e) => setFormState({ ...formState, to: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                          <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Email subject" value={formState.subject || ""} onChange={(e) => setFormState({ ...formState, subject: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Body</label>
                          <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} placeholder="Email body..." value={formState.body || ""} onChange={(e) => setFormState({ ...formState, body: e.target.value })} />
                        </div>
                      </>
                    )}

                    {stepType === "send_whatsapp" && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Phone number</label>
                          <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+91XXXXXXXXXX" value={formState.to || ""} onChange={(e) => setFormState({ ...formState, to: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                          <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} placeholder="WhatsApp message..." value={formState.message || ""} onChange={(e) => setFormState({ ...formState, message: e.target.value })} />
                        </div>
                      </>
                    )}

                    {stepType === "ai_decision" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Prompt</label>
                        <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={4} placeholder="Describe what the AI should decide and what actions to take..." value={formState.prompt || ""} onChange={(e) => setFormState({ ...formState, prompt: e.target.value })} />
                      </div>
                    )}

                    {(stepType === "sheets_read" || stepType === "sheets_append") && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Spreadsheet ID</label>
                          <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="From the Google Sheets URL" value={formState.spreadsheetId || ""} onChange={(e) => setFormState({ ...formState, spreadsheetId: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Range</label>
                          <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Sheet1!A1:Z100" value={formState.range || ""} onChange={(e) => setFormState({ ...formState, range: e.target.value })} />
                        </div>
                        {stepType === "sheets_append" && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Values (JSON)</label>
                            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none" rows={2} placeholder='[["value1","value2"]]' value={formState.values || ""} onChange={(e) => setFormState({ ...formState, values: e.target.value })} />
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleAddStep}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-medium"
                      >
                        {saving ? "Saving..." : "Add Step"}
                      </button>
                      <button
                        onClick={() => { setShowAddForm(false); setFormState({}); setFormError(""); }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step list */}
              {workflow.steps.length === 0 && !showAddForm ? (
                <div className="px-5 py-12 text-center text-gray-400 text-sm">
                  No steps yet — click "+ Add Step" to build your workflow
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {workflow.steps.map((s, idx) => (
                    <div key={idx} className="px-5 py-4 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded mb-1">
                            {s.type}
                          </span>
                          <p className="text-sm text-gray-600 truncate">{stepSummary(s)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteStep(idx)}
                        className="shrink-0 px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RUNS TAB */}
          {activeTab === "runs" && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="font-medium text-gray-900">Run History</span>
                <button onClick={fetchRuns} className="text-xs text-blue-600 hover:underline">Refresh</button>
              </div>

              {runs.length === 0 ? (
                <div className="px-5 py-12 text-center text-gray-400 text-sm">
                  No runs yet — click "▶ Run Now" to execute this workflow
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {runs.map((run) => (
                    <div key={run.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                            run.status === "completed" ? "bg-green-100 text-green-700" :
                            run.status === "failed" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              run.status === "completed" ? "bg-green-500" :
                              run.status === "failed" ? "bg-red-500" : "bg-yellow-500"
                            }`} />
                            {run.status}
                          </span>
                          <span className="text-xs text-gray-400">{timeAgo(run.startedAt)}</span>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">{run.id.slice(0, 8)}...</span>
                      </div>
                      {run.steps && run.steps.length > 0 && (
                        <div className="space-y-1">
                          {run.steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${step.status === "success" ? "bg-green-400" : "bg-red-400"}`} />
                              <span>Step {step.stepIndex + 1} — {step.stepType}</span>
                              {step.error && <span className="text-red-500 truncate">— {step.error}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}