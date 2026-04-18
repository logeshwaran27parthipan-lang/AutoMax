"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";

type Step = { type: string; [key: string]: any };
type Run = {
  id: string;
  status: string;
  startedAt: string;
  steps: {
    stepIndex: number;
    stepType: string;
    status: string;
    error?: string;
  }[];
};
type Workflow = {
  id: string;
  name: string;
  description?: string;
  triggers: any;
  steps: Step[];
  isActive: boolean;
  createdAt: string;
};

const STEP_TYPES = [
  { value: "send_email", label: "Send Email" },
  { value: "send_whatsapp", label: "Send WhatsApp" },
  { value: "ai_decision", label: "AI Decision" },
  { value: "sheets_read", label: "Sheets Read" },
  { value: "sheets_append", label: "Sheets Append" },
];

const TRIGGER_TYPES = [
  { value: "webhook", label: "Webhook" },
  { value: "schedule", label: "Schedule" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "manual", label: "Manual" },
];

const CRON_PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at 9:00 AM", value: "0 9 * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every Monday at 9:00 AM", value: "0 9 * * 1" },
  { label: "Custom...", value: "custom" },
];

function stepSummary(s: Step): string {
  if (s.type === "send_email")
    return `To: ${s.to || "—"}  Subject: ${s.subject || "—"}`;
  if (s.type === "send_whatsapp") return `Phone: ${s.to || s.phone || "—"}`;
  if (s.type === "ai_decision")
    return `Prompt: ${String(s.prompt || "—").slice(0, 60)}`;
  if (s.type === "sheets_read")
    return `${s.spreadsheetId || "—"} / ${s.range || "—"}`;
  if (s.type === "sheets_append")
    return `${s.spreadsheetId || "—"} / ${s.range || "—"}`;
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

function cronHumanLabel(cron: string): string {
  const preset = CRON_PRESETS.find((p) => p.value === cron);
  if (preset && preset.value !== "custom") return preset.label;
  return cron;
}

const HINT = (
  <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-1">
    💡 Use <code className="font-mono font-bold">{"{{name}}"}</code>,{" "}
    <code className="font-mono font-bold">{"{{email}}"}</code>,{" "}
    <code className="font-mono font-bold">{"{{phone}}"}</code> — AutoMax fills
    these from the trigger data automatically.
  </p>
);

// ── Reusable step fields ──
function StepFields({
  stepType,
  formState,
  setFormState,
}: {
  stepType: string;
  formState: any;
  setFormState: (s: any) => void;
}) {
  return (
    <>
      {stepType === "send_email" && (
        <>
          {HINT}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              To (email)
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="{{email}} or fixed@email.com"
              value={formState.to || ""}
              onChange={(e) =>
                setFormState({ ...formState, to: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Subject
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Hello {{name}}!"
              value={formState.subject || ""}
              onChange={(e) =>
                setFormState({ ...formState, subject: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Body
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Hi {{name}}, thanks for reaching out!"
              value={formState.body || ""}
              onChange={(e) =>
                setFormState({ ...formState, body: e.target.value })
              }
            />
          </div>
        </>
      )}
      {stepType === "send_whatsapp" && (
        <>
          {HINT}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Phone number
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="{{phone}} or +91XXXXXXXXXX"
              value={formState.to || ""}
              onChange={(e) =>
                setFormState({ ...formState, to: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Message
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Hi {{name}}! Thanks for contacting us."
              value={formState.message || ""}
              onChange={(e) =>
                setFormState({ ...formState, message: e.target.value })
              }
            />
          </div>
        </>
      )}
      {stepType === "ai_decision" && (
        <>
          {HINT}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Prompt
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              placeholder="The customer {{name}} sent: {{message}}. Decide whether to send_email or send_whatsapp."
              value={formState.prompt || ""}
              onChange={(e) =>
                setFormState({ ...formState, prompt: e.target.value })
              }
            />
          </div>
        </>
      )}
      {(stepType === "sheets_read" || stepType === "sheets_append") && (
        <>
          {HINT}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Spreadsheet ID
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="From your Google Sheets URL"
              value={formState.spreadsheetId || ""}
              onChange={(e) =>
                setFormState({ ...formState, spreadsheetId: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Range
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Sheet1!A1:Z100"
              value={formState.range || ""}
              onChange={(e) =>
                setFormState({ ...formState, range: e.target.value })
              }
            />
          </div>
          {stepType === "sheets_append" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Values (JSON)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none"
                rows={2}
                placeholder='[["{{name}}","{{email}}","{{phone}}"]]'
                value={formState.values || ""}
                onChange={(e) =>
                  setFormState({ ...formState, values: e.target.value })
                }
              />
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Trigger edit form ──
function TriggerEditForm({
  triggerConfig,
  onSave,
  onCancel,
  saving,
}: {
  triggerConfig: any;
  onSave: (triggers: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [triggerType, setTriggerType] = useState<string>(
    triggerConfig?.type || "webhook",
  );
  const [cronPreset, setCronPreset] = useState<string>(() => {
    const cron = triggerConfig?.cron || "";
    const found = CRON_PRESETS.find(
      (p) => p.value === cron && p.value !== "custom",
    );
    return found ? cron : "custom";
  });
  const [customCron, setCustomCron] = useState<string>(
    triggerConfig?.cron || "* * * * *",
  );
  const [timezone, setTimezone] = useState<string>(
    triggerConfig?.timezone || "Asia/Kolkata",
  );
  const [keyword, setKeyword] = useState<string>(triggerConfig?.keyword || "");
  const [error, setError] = useState("");

  function handleSave() {
    setError("");
    if (triggerType === "schedule") {
      const cron = cronPreset === "custom" ? customCron.trim() : cronPreset;
      if (!cron) {
        setError("Cron expression is required");
        return;
      }
      const parts = cron.split(/\s+/);
      if (parts.length !== 5) {
        setError("Cron must have 5 parts: min hour day month weekday");
        return;
      }
      onSave({ type: "schedule", cron, timezone });
    } else if (triggerType === "whatsapp") {
      onSave({ type: "whatsapp", keyword: keyword.trim() || undefined });
    } else {
      onSave({ type: triggerType });
    }
  }

  return (
    <div className="space-y-3">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Trigger type
        </label>
        <select
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {TRIGGER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {triggerType === "schedule" && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Schedule
            </label>
            <select
              value={cronPreset}
              onChange={(e) => setCronPreset(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CRON_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {cronPreset === "custom" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Custom cron expression
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 9 * * 1-5"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Format: minute hour day month weekday
              </p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Timezone
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Asia/Kolkata"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
        </>
      )}

      {triggerType === "whatsapp" && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Keyword (optional)
          </label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. hello, order, help"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            Leave blank to fire on any incoming WhatsApp message
          </p>
        </div>
      )}

      {triggerType === "webhook" && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          Webhook trigger — your workflow fires when a POST request hits its
          unique URL.
        </p>
      )}

      {triggerType === "manual" && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          Manual trigger — only fires when you click "Run Now" from the
          dashboard.
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? "Saving..." : "Save Trigger"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<"steps" | "runs" | "test">(
    "steps",
  );

  // Name/description edit
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaName, setMetaName] = useState("");
  const [metaDesc, setMetaDesc] = useState("");

  // GitHub Copilot: Add an Enable/Disable toggle button near the workflow title.
  // - If workflow.isActive is true, show a red "Disable" button
  // - If false, show a green "Enable" button
  // - On click, call PATCH /api/workflows/[id] with body { isActive: boolean }
  // - Update local state after success
  // - Use existing Tailwind classes consistent with the rest of the file
  const [togglingActive, setTogglingActive] = useState(false);

  async function handleToggleActive() {
    if (!workflow) return;
    setTogglingActive(true);
    try {
      await axios.patch(`/api/workflows/${id}`, {
        isActive: !workflow.isActive,
      });
      setWorkflow({ ...workflow, isActive: !workflow.isActive });
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Failed to toggle workflow status",
      );
    } finally {
      setTogglingActive(false);
    }
  }

  // Trigger edit
  const [editingTrigger, setEditingTrigger] = useState(false);

  // Add step form
  const [showAddForm, setShowAddForm] = useState(false);
  const [stepType, setStepType] = useState("send_email");
  const [formState, setFormState] = useState<any>({});
  const [formError, setFormError] = useState("");

  // Edit step
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);
  const [editStepType, setEditStepType] = useState("send_email");
  const [editStepForm, setEditStepForm] = useState<any>({});
  const [editStepError, setEditStepError] = useState("");

  // Test trigger
  const [testPayload, setTestPayload] = useState(
    JSON.stringify(
      {
        name: "John",
        email: "john@gmail.com",
        phone: "+919876543210",
        message: "Hello",
      },
      null,
      2,
    ),
  );
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState("");

  useEffect(() => {
    if (id) {
      fetchWorkflow();
      fetchRuns();
    }
  }, [id]);

  async function fetchWorkflow() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/workflows/${id}`);
      const data = res.data;
      let steps = data.steps;
      if (!Array.isArray(steps)) {
        try {
          steps = steps ? JSON.parse(JSON.stringify(steps)) : [];
        } catch {
          steps = [];
        }
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
    } catch {}
  }

  async function saveWorkflow(patch: object) {
    setSaving(true);
    setError(null);
    try {
      await axios.put(`/api/workflows/${id}`, patch);
      await fetchWorkflow();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function saveSteps(updatedSteps: Step[]) {
    await saveWorkflow({ steps: updatedSteps });
  }

  // ── Meta edit ──
  function startEditMeta() {
    setMetaName(workflow?.name || "");
    setMetaDesc(workflow?.description || "");
    setEditingMeta(true);
  }

  async function handleSaveMeta() {
    if (!metaName.trim()) return;
    await saveWorkflow({ name: metaName.trim(), description: metaDesc.trim() });
    setEditingMeta(false);
  }

  // ── Trigger save ──
  async function handleSaveTrigger(triggers: any) {
    await saveWorkflow({ triggers });
    setEditingTrigger(false);
  }

  // ── Build step from form ──
  function buildStepFromForm(
    type: string,
    form: any,
  ): { step: Step | null; error: string } {
    const s: Step = { type };
    if (type === "send_email") {
      if (!form.to) return { step: null, error: "To is required" };
      if (!form.subject) return { step: null, error: "Subject is required" };
      s.to = form.to;
      s.subject = form.subject;
      s.body = form.body || "";
    } else if (type === "send_whatsapp") {
      if (!form.to) return { step: null, error: "Phone is required" };
      s.to = form.to;
      s.message = form.message || "";
    } else if (type === "ai_decision") {
      if (!form.prompt) return { step: null, error: "Prompt is required" };
      s.prompt = form.prompt;
    } else if (type === "sheets_read") {
      if (!form.spreadsheetId)
        return { step: null, error: "Spreadsheet ID is required" };
      s.spreadsheetId = form.spreadsheetId;
      s.range = form.range || "Sheet1!A1:Z100";
    } else if (type === "sheets_append") {
      if (!form.spreadsheetId)
        return { step: null, error: "Spreadsheet ID is required" };
      s.spreadsheetId = form.spreadsheetId;
      s.range = form.range || "Sheet1!A1";
      try {
        s.values = form.values ? JSON.parse(form.values) : [];
      } catch {
        return {
          step: null,
          error: 'Values must be valid JSON e.g. [["a","b"]]',
        };
      }
    }
    return { step: s, error: "" };
  }

  // ── Add step ──
  async function handleAddStep() {
    setFormError("");
    const { step, error } = buildStepFromForm(stepType, formState);
    if (!step) {
      setFormError(error);
      return;
    }
    if (!workflow) return;
    await saveSteps([...(workflow.steps || []), step]);
    setShowAddForm(false);
    setFormState({});
    setStepType("send_email");
  }

  // ── Start editing a step ──
  function startEditStep(idx: number) {
    const s = workflow?.steps[idx];
    if (!s) return;
    setEditingStepIdx(idx);
    setEditStepType(s.type);
    const form: any = { ...s };
    if (s.type === "sheets_append" && Array.isArray(s.values)) {
      form.values = JSON.stringify(s.values);
    }
    delete form.type;
    setEditStepForm(form);
    setEditStepError("");
    setShowAddForm(false);
  }

  // ── Save edited step ──
  async function handleSaveEditStep() {
    setEditStepError("");
    if (editingStepIdx === null || !workflow) return;
    const { step, error } = buildStepFromForm(editStepType, editStepForm);
    if (!step) {
      setEditStepError(error);
      return;
    }
    const updated = workflow.steps.map((s, i) =>
      i === editingStepIdx ? step : s,
    );
    await saveSteps(updated);
    setEditingStepIdx(null);
    setEditStepForm({});
  }

  // ── Delete step ──
  async function handleDeleteStep(idx: number) {
    if (!workflow || !confirm("Delete this step?")) return;
    if (editingStepIdx === idx) setEditingStepIdx(null);
    await saveSteps(workflow.steps.filter((_, i) => i !== idx));
  }

  // ── Reorder steps ──
  async function handleMoveStep(idx: number, direction: "up" | "down") {
    if (!workflow) return;
    const steps = [...workflow.steps];
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= steps.length) return;
    [steps[idx], steps[target]] = [steps[target], steps[idx]];
    if (editingStepIdx === idx) setEditingStepIdx(target);
    else if (editingStepIdx === target) setEditingStepIdx(idx);
    await saveSteps(steps);
  }

  // ── Run ──
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

  // ── Test trigger ──
  async function handleTestTrigger() {
    setTestLoading(true);
    setTestError("");
    setTestResult(null);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(testPayload);
      } catch {
        setTestError("Invalid JSON — fix the test data above");
        setTestLoading(false);
        return;
      }
      const res = await axios.post(`/api/webhook/${id}`, parsed);
      setTestResult(res.data);
      await fetchRuns();
    } catch (err: any) {
      setTestError(err?.response?.data?.error || "Test failed");
    } finally {
      setTestLoading(false);
    }
  }

  const triggerConfig =
    typeof workflow?.triggers === "object" ? (workflow?.triggers as any) : null;
  const triggerLabel =
    triggerConfig?.type ||
    (typeof workflow?.triggers === "string" ? workflow.triggers : "webhook");

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => router.push("/dashboard/workflows")}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm transition-colors shrink-0"
          >
            ← Back
          </button>
          {workflow && !editingMeta && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">
                  {workflow.name}
                </h1>
                {workflow.description && (
                  <p className="text-sm text-gray-500 truncate">
                    {workflow.description}
                  </p>
                )}
              </div>
              <button
                onClick={startEditMeta}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                title="Edit name & description"
              >
                ✏️ Edit
              </button>
            </div>
          )}
          {workflow && editingMeta && (
            <div className="flex items-center gap-2 flex-1">
              <div className="space-y-1 flex-1">
                <input
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                  placeholder="Workflow name"
                  autoFocus
                />
                <input
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  placeholder="Description (optional)"
                />
              </div>
              <button
                onClick={handleSaveMeta}
                disabled={saving}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 shrink-0"
              >
                {saving ? "..." : "Save"}
              </button>
              <button
                onClick={() => setEditingMeta(false)}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 shrink-0"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {workflow && (
            <button
              onClick={handleToggleActive}
              disabled={togglingActive}
              className={`px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm font-medium transition-colors shrink-0 ${
                workflow.isActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {togglingActive
                ? "..."
                : workflow.isActive
                  ? "🔴 Disable"
                  : "🟢 Enable"}
            </button>
          )}
          <button
            onClick={handleRun}
            disabled={running || !workflow}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors shrink-0 ml-3"
          >
            {running ? "Running..." : "▶ Run Now"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-gray-400 py-12 justify-center">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      )}

      {!loading && workflow && (
        <>
          {/* Meta bar */}
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-4 flex-wrap">
            <span>
              Created {new Date(workflow.createdAt).toLocaleDateString()}
            </span>
            <span>
              Trigger:{" "}
              <code className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {triggerLabel}
              </code>
            </span>
            <span>
              {workflow.steps.length} step
              {workflow.steps.length !== 1 ? "s" : ""}
            </span>
            <span>
              {runs.length} run{runs.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Trigger Info Block */}
          {!editingTrigger && (
            <>
              {triggerConfig?.type === "schedule" ? (
                <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-6 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-medium text-purple-700">
                        ⏰ Schedule Trigger
                      </span>
                      <code className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-mono">
                        {triggerConfig.cron}
                      </code>
                      <span className="text-xs text-purple-600">
                        — {cronHumanLabel(triggerConfig.cron)}
                      </span>
                      {triggerConfig.timezone && (
                        <span className="text-xs text-purple-500">
                          ({triggerConfig.timezone})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-purple-500">
                      Runs automatically via cron-job.org → Vercel.
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingTrigger(true)}
                    className="text-xs px-2 py-1 text-purple-600 hover:bg-purple-100 rounded transition-colors shrink-0"
                  >
                    ✏️ Edit
                  </button>
                </div>
              ) : triggerConfig?.type === "whatsapp" ? (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-green-700">
                        💬 WhatsApp Trigger
                      </span>
                      {triggerConfig.keyword && (
                        <code className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-mono">
                          keyword: {triggerConfig.keyword}
                        </code>
                      )}
                    </div>
                    <p className="text-xs text-green-600">
                      Fires when an incoming WhatsApp message{" "}
                      {triggerConfig.keyword
                        ? `contains "${triggerConfig.keyword}"`
                        : "is received"}
                      .
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingTrigger(true)}
                    className="text-xs px-2 py-1 text-green-600 hover:bg-green-100 rounded transition-colors shrink-0"
                  >
                    ✏️ Edit
                  </button>
                </div>
              ) : triggerConfig?.type === "manual" ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-medium text-gray-700">
                      🖐 Manual Trigger
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Only fires when you click "Run Now".
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingTrigger(true)}
                    className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-200 rounded transition-colors shrink-0"
                  >
                    ✏️ Edit
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
                  <span className="text-xs text-gray-400 shrink-0">
                    Webhook URL
                  </span>
                  <code className="text-xs text-gray-600 flex-1 truncate">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/webhook/${id}`
                      : `/api/webhook/${id}`}
                  </code>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `${window.location.origin}/api/webhook/${id}`,
                      )
                    }
                    className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 shrink-0"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => setEditingTrigger(true)}
                    className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-200 rounded transition-colors shrink-0"
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
            </>
          )}

          {/* Trigger edit form */}
          {editingTrigger && (
            <div className="bg-white border border-blue-200 rounded-xl px-5 py-4 mb-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Edit Trigger
              </h3>
              <TriggerEditForm
                triggerConfig={triggerConfig}
                onSave={handleSaveTrigger}
                onCancel={() => setEditingTrigger(false)}
                saving={saving}
              />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-gray-200">
            {(
              [
                { key: "steps", label: `Steps (${workflow.steps.length})` },
                { key: "runs", label: `Run History (${runs.length})` },
                { key: "test", label: "🧪 Test Trigger" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── STEPS TAB ── */}
          {activeTab === "steps" && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="font-medium text-gray-900">Steps</span>
                <button
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setFormError("");
                    setFormState({});
                    setEditingStepIdx(null);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  {showAddForm ? "Cancel" : "+ Add Step"}
                </button>
              </div>

              {/* Add step form */}
              {showAddForm && (
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700 mb-3">
                    New Step
                  </p>
                  {formError && (
                    <div className="text-red-600 text-sm mb-3">{formError}</div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Step type
                      </label>
                      <select
                        value={stepType}
                        onChange={(e) => {
                          setStepType(e.target.value);
                          setFormState({});
                          setFormError("");
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <StepFields
                      stepType={stepType}
                      formState={formState}
                      setFormState={setFormState}
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleAddStep}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-medium"
                      >
                        {saving ? "Saving..." : "Add Step"}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setFormState({});
                          setFormError("");
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {workflow.steps.length === 0 && !showAddForm ? (
                <div className="px-5 py-12 text-center text-gray-400 text-sm">
                  No steps yet — click "+ Add Step" to build your workflow
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {workflow.steps.map((s, idx) => (
                    <div key={idx}>
                      {/* Step row */}
                      <div
                        className={`px-5 py-4 flex items-start justify-between gap-4 ${editingStepIdx === idx ? "bg-blue-50" : ""}`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Reorder controls */}
                          <div className="flex flex-col gap-0.5 mt-1 shrink-0">
                            <button
                              onClick={() => handleMoveStep(idx, "up")}
                              disabled={idx === 0 || saving}
                              className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none"
                              title="Move up"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => handleMoveStep(idx, "down")}
                              disabled={
                                idx === workflow.steps.length - 1 || saving
                              }
                              className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none"
                              title="Move down"
                            >
                              ▼
                            </button>
                          </div>
                          <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded mb-1">
                              {s.type}
                            </span>
                            <p className="text-sm text-gray-600 truncate">
                              {stepSummary(s)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() =>
                              editingStepIdx === idx
                                ? setEditingStepIdx(null)
                                : startEditStep(idx)
                            }
                            className={`px-2 py-1 text-xs rounded transition-colors ${editingStepIdx === idx ? "bg-blue-100 text-blue-700" : "text-blue-500 hover:bg-blue-50"}`}
                          >
                            {editingStepIdx === idx ? "Close" : "Edit"}
                          </button>
                          <button
                            onClick={() => handleDeleteStep(idx)}
                            className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Inline step edit form */}
                      {editingStepIdx === idx && (
                        <div className="px-5 pb-5 bg-blue-50 border-b border-blue-100">
                          <p className="text-xs font-semibold text-blue-700 mb-3">
                            Editing Step {idx + 1}
                          </p>
                          {editStepError && (
                            <div className="text-red-600 text-sm mb-3">
                              {editStepError}
                            </div>
                          )}
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Step type
                              </label>
                              <select
                                value={editStepType}
                                onChange={(e) => {
                                  setEditStepType(e.target.value);
                                  setEditStepForm({});
                                  setEditStepError("");
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                {STEP_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <StepFields
                              stepType={editStepType}
                              formState={editStepForm}
                              setFormState={setEditStepForm}
                            />
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={handleSaveEditStep}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-medium"
                              >
                                {saving ? "Saving..." : "Save Changes"}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingStepIdx(null);
                                  setEditStepForm({});
                                  setEditStepError("");
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── RUNS TAB ── */}
          {activeTab === "runs" && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="font-medium text-gray-900">Run History</span>
                <button
                  onClick={fetchRuns}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Refresh
                </button>
              </div>
              {runs.length === 0 ? (
                <div className="px-5 py-12 text-center text-gray-400 text-sm">
                  No runs yet — go to "🧪 Test Trigger" tab to run your first
                  test
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {runs.map((run) => (
                    <div key={run.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                              run.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : run.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${run.status === "completed" ? "bg-green-500" : run.status === "failed" ? "bg-red-500" : "bg-yellow-500"}`}
                            />
                            {run.status}
                          </span>
                          <span className="text-xs text-gray-400">
                            {timeAgo(run.startedAt)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">
                          {run.id.slice(0, 8)}...
                        </span>
                      </div>
                      {run.steps?.length > 0 && (
                        <div className="space-y-1 mt-1">
                          {run.steps.map((step, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-xs text-gray-500"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${step.status === "success" ? "bg-green-400" : "bg-red-400"}`}
                              />
                              <span>
                                Step {step.stepIndex + 1} — {step.stepType}
                              </span>
                              {step.error && (
                                <span className="text-red-500 truncate">
                                  — {step.error}
                                </span>
                              )}
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

          {/* ── TEST TRIGGER TAB ── */}
          {activeTab === "test" && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">Test Trigger</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Simulate a real trigger — paste the data your form/app would
                  send, then fire it.
                </p>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
                  <p className="font-medium mb-1">How this works</p>
                  <p>
                    This sends the data below directly to your webhook URL.
                    AutoMax will run all your steps, replacing{" "}
                    <code className="font-mono font-bold">{"{{name}}"}</code>,{" "}
                    <code className="font-mono font-bold">{"{{email}}"}</code>,{" "}
                    <code className="font-mono font-bold">{"{{phone}}"}</code>{" "}
                    etc. with the actual values.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Test data (JSON) — edit these values to match your real data
                  </label>
                  <textarea
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                {testError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {testError}
                  </div>
                )}
                <button
                  onClick={handleTestTrigger}
                  disabled={testLoading}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm transition-colors"
                >
                  {testLoading ? "Running workflow..." : "🚀 Fire Test Trigger"}
                </button>
                {testResult && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <p className="text-sm font-medium text-green-700 mb-2">
                      ✅ Workflow triggered successfully!
                    </p>
                    <p className="text-xs text-green-600">
                      Check the Run History tab to see the full execution log.
                    </p>
                    <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-40">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
