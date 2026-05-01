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
    input?: any;
    output?: any;
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
  { value: "forEach", label: "For Each (Loop)" },
  { value: "condition", label: "Condition" },
  { value: "http_request", label: "HTTP Request" },
  { value: "whatsapp_reply", label: "WhatsApp Reply" },
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
  if (s.type === "forEach")
    return `Loop over Step ${(s.sourceStep || 0) + 1} as {{${s.itemVariable || "item"}}}`;
  if (s.type === "condition")
    return `If ${s.field || "—"} ${s.operator || "—"} ${s.value || "—"}`;
  if (s.type === "http_request")
    return `${s.method || "POST"} ${s.url || "No URL set"}`;
  if (s.type === "whatsapp_reply")
    return `Reply: ${(s.message || "").slice(0, 60)}`;
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
  <p
    style={{
      fontSize: 12,
      color: "#1D4ED8",
      background: "#EFF6FF",
      border: "1px solid #DBEAFE",
      borderRadius: 8,
      padding: "8px 12px",
      marginTop: 4,
    }}
  >
    💡 Use{" "}
    <code style={{ fontFamily: "monospace", fontWeight: "bold" }}>
      {"{{name}}"}
    </code>
    ,{" "}
    <code style={{ fontFamily: "monospace", fontWeight: "bold" }}>
      {"{{email}}"}
    </code>
    ,{" "}
    <code style={{ fontFamily: "monospace", fontWeight: "bold" }}>
      {"{{phone}}"}
    </code>{" "}
    — AutoMax fills these from the trigger data automatically.
  </p>
);

// ── Get available variables from previous steps ──
function getAvailableVariables(
  steps: Step[],
  currentIndex: number,
): Array<{
  stepNum: number;
  stepType: string;
  variables: Array<{ label: string; variable: string }>;
}> {
  const available: Array<{
    stepNum: number;
    stepType: string;
    variables: Array<{ label: string; variable: string }>;
  }> = [];

  for (let i = 0; i < currentIndex && i < steps.length; i++) {
    const step = steps[i];
    const stepNum = i + 1;
    const variables: Array<{ label: string; variable: string }> = [];

    if (step.type === "sheets_read") {
      variables.push({ label: "Full data", variable: `{{step_${i}_output}}` });
      variables.push({
        label: "Name field",
        variable: `{{step_${i}_output.Name}}`,
      });
      variables.push({
        label: "Email field",
        variable: `{{step_${i}_output.Email}}`,
      });
      variables.push({
        label: "Phone field",
        variable: `{{step_${i}_output.Phone}}`,
      });
    } else if (step.type === "sheets_append") {
      variables.push({
        label: "Success",
        variable: `{{step_${i}_output.success}}`,
      });
    } else if (step.type === "send_email") {
      variables.push({
        label: "Success",
        variable: `{{step_${i}_output.success}}`,
      });
      variables.push({ label: "Sent", variable: `{{step_${i}_output.sent}}` });
    } else if (step.type === "send_whatsapp") {
      variables.push({
        label: "Success",
        variable: `{{step_${i}_output.success}}`,
      });
      variables.push({ label: "Sent", variable: `{{step_${i}_output.sent}}` });
    } else if (step.type === "ai_decision") {
      variables.push({
        label: "Full output",
        variable: `{{step_${i}_output}}`,
      });
    } else if (step.type === "forEach") {
      variables.push({
        label: "Full loop item (current row as JSON)",
        variable: "{{item}}",
      });
      variables.push({
        label: "Name column of current row",
        variable: "{{item.Name}}",
      });
      variables.push({
        label: "Email column of current row",
        variable: "{{item.Email}}",
      });
      variables.push({
        label: "Phone column of current row",
        variable: "{{item.Phone}}",
      });
    } else {
      // Any other type
      variables.push({
        label: "Full output",
        variable: `{{step_${i}_output}}`,
      });
    }

    available.push({ stepNum, stepType: step.type, variables });
  }

  return available;
}

// ── Variables Panel Component ──
function VariablesPanel({
  steps,
  currentIndex,
}: {
  steps: Step[];
  currentIndex: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  // Only show if currentIndex > 0 (Step 2 or later)
  if (currentIndex <= 0) {
    return null;
  }

  const variables = getAvailableVariables(steps, currentIndex);

  if (variables.length === 0) {
    return null;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedVar(text);
      setTimeout(() => setCopiedVar(null), 1500);
    });
  }

  return (
    <div
      style={{
        background: "#EFF6FF",
        border: "1px solid #DBEAFE",
        borderRadius: 8,
        padding: "12px",
        marginBottom: 12,
        fontSize: 13,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#1D4ED8",
            margin: 0,
          }}
        >
          📦 Available Variables from Previous Steps
        </p>
        <span
          style={{
            fontSize: 12,
            color: "#1D4ED8",
            fontWeight: "bold",
          }}
        >
          {isExpanded ? "−" : "+"}
        </span>
      </div>

      {isExpanded && (
        <div style={{ marginTop: 8 }}>
          {variables.map((item) => (
            <div
              key={`${item.stepNum}-${item.stepType}`}
              style={{ marginBottom: 8 }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#1E40AF",
                  margin: "4px 0",
                }}
              >
                Step {item.stepNum} ({item.stepType})
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 6,
                }}
              >
                {item.variables.map((varItem) => (
                  <div
                    key={varItem.variable}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#FFFFFF",
                      border: "1px solid #BFDBFE",
                      borderRadius: 4,
                      padding: "6px 8px",
                      fontSize: 11,
                    }}
                  >
                    <span style={{ fontFamily: "monospace", color: "#1E40AF" }}>
                      {varItem.variable}
                    </span>
                    <button
                      onClick={() => copyToClipboard(varItem.variable)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        color:
                          copiedVar === varItem.variable
                            ? "#16A34A"
                            : "#2563EB",
                        fontWeight: "bold",
                        padding: 0,
                        marginLeft: 4,
                      }}
                    >
                      {copiedVar === varItem.variable ? "✓" : "Copy"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Reusable step fields ──
function StepFields({
  stepType,
  formState,
  setFormState,
  steps,
  index,
}: {
  stepType: string;
  formState: any;
  setFormState: (s: any) => void;
  steps?: Step[];
  index?: number;
}) {
  return (
    <>
      {stepType === "send_email" && (
        <>
          {HINT}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              To (email)
            </label>
            <input
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "Inter, sans-serif",
              }}
              placeholder="{{email}} or fixed@email.com"
              value={formState.to || ""}
              onChange={(e) =>
                setFormState({ ...formState, to: e.target.value })
              }
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              Subject
            </label>
            <input
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "Inter, sans-serif",
              }}
              placeholder="Hello {{name}}!"
              value={formState.subject || ""}
              onChange={(e) =>
                setFormState({ ...formState, subject: e.target.value })
              }
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              Body
            </label>
            <textarea
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "Inter, sans-serif",
                resize: "none",
              }}
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
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              Phone number
            </label>
            <input
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "Inter, sans-serif",
              }}
              placeholder="{{phone}} or +91XXXXXXXXXX"
              value={formState.to || ""}
              onChange={(e) =>
                setFormState({ ...formState, to: e.target.value })
              }
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              Message
            </label>
            <textarea
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "Inter, sans-serif",
                resize: "none",
              }}
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
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              Prompt
            </label>
            <textarea
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "Inter, sans-serif",
                resize: "none",
              }}
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
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              Spreadsheet ID
            </label>
            <input
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "Inter, sans-serif",
              }}
              placeholder="From your Google Sheets URL"
              value={formState.spreadsheetId || ""}
              onChange={(e) =>
                setFormState({ ...formState, spreadsheetId: e.target.value })
              }
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              Range
            </label>
            <input
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "Inter, sans-serif",
              }}
              placeholder="Sheet1!A1:Z100"
              value={formState.range || ""}
              onChange={(e) =>
                setFormState({ ...formState, range: e.target.value })
              }
            />
          </div>
          {stepType === "sheets_append" && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#6B7280",
                  marginBottom: 4,
                }}
              >
                Values (JSON)
              </label>
              <textarea
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "#FFFFFF",
                  color: "#1A1A2E",
                  fontFamily: "monospace",
                  resize: "none",
                }}
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
      {stepType === "forEach" && steps !== undefined && index !== undefined && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source Step (array to loop over)
            </label>
            <select
              value={formState.sourceStep ?? ""}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  sourceStep: parseInt(e.target.value),
                })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select a previous step...</option>
              {steps.slice(0, index).map((s: any, i: number) => (
                <option key={i} value={i}>
                  Step {i + 1} — {s.type}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose the step whose output is a list (e.g. sheets_read returns
              rows).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Variable Name
            </label>
            <input
              type="text"
              value={formState.itemVariable ?? "item"}
              onChange={(e) =>
                setFormState({ ...formState, itemVariable: e.target.value })
              }
              placeholder="item"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Each row will be available as {"{{item.ColumnName}}"} in steps
              after this one.
            </p>
          </div>
        </div>
      )}
      {stepType === "condition" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field
            </label>
            <input
              type="text"
              value={formState.field ?? ""}
              onChange={(e) =>
                setFormState({ ...formState, field: e.target.value })
              }
              placeholder="Variable, e.g. {{item.Phone}}"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operator
            </label>
            <select
              value={formState.operator ?? ""}
              onChange={(e) =>
                setFormState({ ...formState, operator: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select operator...</option>
              <option value="includes">Includes</option>
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value
            </label>
            <input
              type="text"
              value={formState.value ?? ""}
              onChange={(e) =>
                setFormState({ ...formState, value: e.target.value })
              }
              placeholder="Value to compare"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}
      {stepType === "http_request" && (
        <>
          {HINT}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              URL
            </label>
            <input
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "Inter, sans-serif",
              }}
              placeholder="https://example.com/webhook"
              value={formState.url || ""}
              onChange={(e) =>
                setFormState({ ...formState, url: e.target.value })
              }
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              Method
            </label>
            <select
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "Inter, sans-serif",
              }}
              value={formState.method || "POST"}
              onChange={(e) =>
                setFormState({ ...formState, method: e.target.value })
              }
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              Headers (JSON, optional)
            </label>
            <textarea
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "monospace",
                resize: "none",
              }}
              rows={2}
              placeholder='{"Authorization": "Bearer token"}'
              value={formState.headers || ""}
              onChange={(e) =>
                setFormState({ ...formState, headers: e.target.value })
              }
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              Body (JSON, optional)
            </label>
            <textarea
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "monospace",
                resize: "none",
              }}
              rows={2}
              placeholder='{"key": "value"}'
              value={formState.body || ""}
              onChange={(e) =>
                setFormState({ ...formState, body: e.target.value })
              }
            />
          </div>
        </>
      )}
      {stepType === "whatsapp_reply" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Message</label>
          <textarea
            placeholder="Type your reply message here. Phone is taken automatically from the trigger."
            className="w-full border rounded px-3 py-2 text-sm min-h-[80px]"
            value={formState.message || ""}
            onChange={(e) =>
              setFormState({ ...formState, message: e.target.value })
            }
          />
          <p className="text-xs text-gray-500">
            💡 Phone number is automatically taken from the WhatsApp trigger
            payload.
          </p>
        </div>
      )}
      {stepType !== "forEach" && stepType !== "condition" && (
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "#6B7280",
              marginBottom: 4,
            }}
          >
            Retry on failure (0–3)
          </label>
          <input
            type="number"
            min={0}
            max={3}
            style={{
              width: 80,
              padding: "8px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
              background: "#FFFFFF",
              color: "#1A1A2E",
            }}
            value={formState.retryCount ?? 0}
            onChange={(e) =>
              setFormState({
                ...formState,
                retryCount: Math.min(
                  3,
                  Math.max(0, parseInt(e.target.value) || 0),
                ),
              })
            }
          />
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
            How many times to retry if this step fails. 0 = no retry.
          </p>
        </div>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && <div style={{ color: "#B91C1C", fontSize: 14 }}>{error}</div>}
      <div>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 500,
            color: "#6B7280",
            marginBottom: 4,
          }}
        >
          Trigger type
        </label>
        <select
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            fontSize: 14,
            outline: "none",
            background: "#FFFFFF",
            color: "#1A1A2E",
            fontFamily: "Inter, sans-serif",
          }}
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
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              Schedule
            </label>
            <select
              value={cronPreset}
              onChange={(e) => setCronPreset(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "Inter, sans-serif",
              }}
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
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#6B7280",
                  marginBottom: 4,
                }}
              >
                Custom cron expression
              </label>
              <input
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "#FFFFFF",
                  color: "#1A1A2E",
                  fontFamily: "monospace",
                }}
                placeholder="0 9 * * 1-5"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
              />
              <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                Format: minute hour day month weekday
              </p>
            </div>
          )}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              Timezone
            </label>
            <input
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontFamily: "Inter, sans-serif",
              }}
              placeholder="Asia/Kolkata"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
        </>
      )}

      {triggerType === "whatsapp" && (
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "#6B7280",
              marginBottom: 4,
            }}
          >
            Keyword (optional)
          </label>
          <input
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
              background: "#FFFFFF",
              color: "#1A1A2E",
              fontFamily: "Inter, sans-serif",
            }}
            placeholder="e.g. hello, order, help"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
            Leave blank to fire on any incoming WhatsApp message
          </p>
        </div>
      )}

      {triggerType === "webhook" && (
        <p
          style={{
            fontSize: 12,
            color: "#6B7280",
            background: "#F9FAFB",
            borderRadius: 8,
            padding: "12px 16px",
          }}
        >
          Webhook trigger — your workflow fires when a POST request hits its
          unique URL.
        </p>
      )}

      {triggerType === "manual" && (
        <p
          style={{
            fontSize: 12,
            color: "#6B7280",
            background: "#F9FAFB",
            borderRadius: 8,
            padding: "12px 16px",
          }}
        >
          Manual trigger — only fires when you click "Run Now" from the
          dashboard.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "8px 16px",
            background: "#2563EB",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Trigger"}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "8px 16px",
            background: "#F3F4F6",
            color: "#374151",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            cursor: "pointer",
          }}
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
  const [expandedRunStep, setExpandedRunStep] = useState<string | null>(null);

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
    } else if (type === "forEach") {
      if (
        form.sourceStep === undefined ||
        form.sourceStep === null ||
        form.sourceStep === ""
      )
        return { step: null, error: "Source Step is required" };
      s.sourceStep = parseInt(form.sourceStep);
      s.itemVariable = form.itemVariable || "item";
    } else if (type === "condition") {
      if (!form.field) return { step: null, error: "Field is required" };
      if (!form.operator) return { step: null, error: "Operator is required" };
      if (form.value === undefined || form.value === "")
        return { step: null, error: "Value is required" };
      s.field = form.field;
      s.operator = form.operator;
      s.value = form.value;
    } else if (type === "http_request") {
      if (!form.url) return { step: null, error: "URL is required" };
      s.url = form.url;
      s.method = form.method || "POST";
      s.headers = form.headers || "";
      s.body = form.body || "";
    } else if (type === "whatsapp_reply") {
      if (!form.message) return { step: null, error: "Message is required" };
      s.message = form.message;
    }
    if (typeof form.retryCount === "number") s.retryCount = form.retryCount;
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
    <div style={{ maxWidth: 896, margin: "0 auto", padding: "32px 16px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: 1,
            minWidth: 0,
          }}
        >
          <button
            onClick={() => router.push("/dashboard/workflows")}
            style={{
              padding: "6px 12px",
              background: "#F3F4F6",
              color: "#6B7280",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ← Back
          </button>
          {workflow && !editingMeta && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#1A1A2E",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {workflow.name}
                </h1>
                {workflow.description && (
                  <p
                    style={{
                      fontSize: 14,
                      color: "#6B7280",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {workflow.description}
                  </p>
                )}
              </div>
              <button
                onClick={startEditMeta}
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
                  color: "#9CA3AF",
                  background: "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}
                title="Edit name & description"
              >
                ✏️ Edit
              </button>
            </div>
          )}
          {workflow && editingMeta && (
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  flex: 1,
                }}
              >
                <input
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: "bold",
                    outline: "none",
                    width: "100%",
                  }}
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                  placeholder="Workflow name"
                  autoFocus
                />
                <input
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    width: "100%",
                  }}
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  placeholder="Description (optional)"
                />
              </div>
              <button
                onClick={handleSaveMeta}
                disabled={saving}
                style={{
                  padding: "6px 12px",
                  background: "#2563EB",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: "pointer",
                  flexShrink: 0,
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? "..." : "Save"}
              </button>
              <button
                onClick={() => setEditingMeta(false)}
                style={{
                  padding: "6px 12px",
                  background: "#F3F4F6",
                  color: "#6B7280",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {workflow && (
            <button
              onClick={handleToggleActive}
              disabled={togglingActive}
              style={{
                padding: "8px 16px",
                background: workflow.isActive ? "#DC2626" : "#16A34A",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                flexShrink: 0,
                opacity: togglingActive ? 0.5 : 1,
                transition: "all 0.2s",
              }}
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
            style={{
              padding: "8px 16px",
              background: "#16A34A",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              flexShrink: 0,
              marginLeft: 12,
              opacity: running || !workflow ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            {running ? "Running..." : "▶ Run Now"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#9CA3AF",
            padding: "48px 0",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              border: "2px solid #2563EB",
              borderTop: "2px solid transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          Loading...
        </div>
      )}

      {!loading && workflow && (
        <>
          {/* Meta bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 12,
              color: "#9CA3AF",
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <span>
              Created {new Date(workflow.createdAt).toLocaleDateString()}
            </span>
            <span>
              Trigger:{" "}
              <code
                style={{
                  background: "#F3F4F6",
                  color: "#6B7280",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontFamily: "monospace",
                }}
              >
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
                <div
                  style={{
                    background: "#FAF5FF",
                    border: "1px solid #E9D5FF",
                    borderRadius: 12,
                    padding: "12px 16px",
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "#7C3AED",
                        }}
                      >
                        ⏰ Schedule Trigger
                      </span>
                      <code
                        style={{
                          fontSize: 12,
                          background: "#F3E8FF",
                          color: "#6B21A8",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontFamily: "monospace",
                        }}
                      >
                        {triggerConfig.cron}
                      </code>
                      <span style={{ fontSize: 12, color: "#A78BFA" }}>
                        — {cronHumanLabel(triggerConfig.cron)}
                      </span>
                      {triggerConfig.timezone && (
                        <span style={{ fontSize: 12, color: "#C4B5FD" }}>
                          ({triggerConfig.timezone})
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "#A78BFA" }}>
                      Runs automatically via cron-job.org → Vercel.
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingTrigger(true)}
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      color: "#7C3AED",
                      background: "transparent",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "all 0.2s",
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
              ) : triggerConfig?.type === "whatsapp" ? (
                <div
                  style={{
                    background: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    borderRadius: 12,
                    padding: "12px 16px",
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "#166534",
                        }}
                      >
                        💬 WhatsApp Trigger
                      </span>
                      {triggerConfig.keyword && (
                        <code
                          style={{
                            fontSize: 12,
                            background: "#DCFCE7",
                            color: "#166534",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontFamily: "monospace",
                          }}
                        >
                          keyword: {triggerConfig.keyword}
                        </code>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "#22C55E" }}>
                      Fires when an incoming WhatsApp message{" "}
                      {triggerConfig.keyword
                        ? `contains "${triggerConfig.keyword}"`
                        : "is received"}
                      .
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingTrigger(true)}
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      color: "#166534",
                      background: "transparent",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "all 0.2s",
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
              ) : triggerConfig?.type === "manual" ? (
                <div
                  style={{
                    background: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                    borderRadius: 12,
                    padding: "12px 16px",
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#1A1A2E",
                      }}
                    >
                      🖐 Manual Trigger
                    </span>
                    <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                      Only fires when you click "Run Now".
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingTrigger(true)}
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      color: "#6B7280",
                      background: "transparent",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "all 0.2s",
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    background: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                    borderRadius: 12,
                    padding: "12px 16px",
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: "#9CA3AF", flexShrink: 0 }}
                  >
                    Webhook URL
                  </span>
                  <code
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontFamily: "monospace",
                    }}
                  >
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
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      background: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: 4,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => setEditingTrigger(true)}
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      color: "#6B7280",
                      background: "transparent",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "all 0.2s",
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
            </>
          )}

          {/* Trigger edit form */}
          {editingTrigger && (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #DBEAFE",
                borderRadius: 12,
                padding: "20px",
                marginBottom: 24,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1A1A2E",
                  marginBottom: 12,
                }}
              >
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
          <div
            style={{
              display: "flex",
              gap: 4,
              marginBottom: 16,
              borderBottom: "1px solid #E5E7EB",
            }}
          >
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
                style={{
                  padding: "8px 16px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: activeTab === tab.key ? "#2563EB" : "#6B7280",
                  background: "none",
                  border: "none",
                  borderBottom:
                    activeTab === tab.key
                      ? "2px solid #2563EB"
                      : "2px solid transparent",
                  marginBottom: -1,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── STEPS TAB ── */}
          {activeTab === "steps" && (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderBottom: "1px solid #F3F4F6",
                }}
              >
                <span style={{ fontWeight: 500, color: "#1A1A2E" }}>Steps</span>
                <button
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setFormError("");
                    setFormState({});
                    setEditingStepIdx(null);
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "#2563EB",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {showAddForm ? "Cancel" : "+ Add Step"}
                </button>
              </div>

              {/* Add step form */}
              {showAddForm && (
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid #F3F4F6",
                    background: "#F9FAFB",
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#1A1A2E",
                      marginBottom: 12,
                    }}
                  >
                    New Step
                  </p>
                  {formError && (
                    <div
                      style={{
                        color: "#B91C1C",
                        fontSize: 14,
                        marginBottom: 12,
                      }}
                    >
                      {formError}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontWeight: 500,
                          color: "#6B7280",
                          marginBottom: 4,
                        }}
                      >
                        Step type
                      </label>
                      <select
                        value={stepType}
                        onChange={(e) => {
                          setStepType(e.target.value);
                          setFormState({});
                          setFormError("");
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #E5E7EB",
                          borderRadius: 8,
                          fontSize: 14,
                          outline: "none",
                          background: "#FFFFFF",
                          color: "#1A1A2E",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {showAddForm && workflow && workflow.steps.length > 0 && (
                      <VariablesPanel
                        steps={workflow.steps}
                        currentIndex={workflow.steps.length}
                      />
                    )}
                    <StepFields
                      stepType={stepType}
                      formState={formState}
                      setFormState={setFormState}
                      steps={workflow?.steps}
                      index={workflow?.steps.length}
                    />
                    <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                      <button
                        onClick={handleAddStep}
                        disabled={saving}
                        style={{
                          padding: "8px 16px",
                          background: "#2563EB",
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: "pointer",
                          opacity: saving ? 0.5 : 1,
                        }}
                      >
                        {saving ? "Saving..." : "Add Step"}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setFormState({});
                          setFormError("");
                        }}
                        style={{
                          padding: "8px 16px",
                          background: "#F3F4F6",
                          color: "#374151",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {workflow.steps.length === 0 && !showAddForm ? (
                <div
                  style={{
                    padding: "48px 20px",
                    textAlign: "center",
                    color: "#9CA3AF",
                    fontSize: 14,
                  }}
                >
                  No steps yet — click "+ Add Step" to build your workflow
                </div>
              ) : (
                <div style={{ borderTop: "1px solid #F3F4F6" }}>
                  {workflow.steps.map((s, idx) => (
                    <div
                      key={idx}
                      style={{ borderBottom: "1px solid #F3F4F6" }}
                    >
                      {/* Step row */}
                      <div
                        style={{
                          padding: "16px 20px",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 16,
                          background:
                            editingStepIdx === idx ? "#EFF6FF" : "#FFFFFF",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {/* Reorder controls */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                              marginTop: 4,
                              flexShrink: 0,
                            }}
                          >
                            <button
                              onClick={() => handleMoveStep(idx, "up")}
                              disabled={idx === 0 || saving}
                              style={{
                                color: "#D1D5DB",
                                cursor: "pointer",
                                fontSize: 12,
                                background: "none",
                                border: "none",
                                opacity: idx === 0 || saving ? 0.2 : 1,
                                padding: 0,
                                lineHeight: 1,
                              }}
                              title="Move up"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => handleMoveStep(idx, "down")}
                              disabled={
                                idx === workflow.steps.length - 1 || saving
                              }
                              style={{
                                color: "#D1D5DB",
                                cursor: "pointer",
                                fontSize: 12,
                                background: "none",
                                border: "none",
                                opacity:
                                  idx === workflow.steps.length - 1 || saving
                                    ? 0.2
                                    : 1,
                                padding: 0,
                                lineHeight: 1,
                              }}
                              title="Move down"
                            >
                              ▼
                            </button>
                          </div>
                          <span
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: "#DBEAFE",
                              color: "#1D4ED8",
                              fontSize: 12,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                background: "#EFF6FF",
                                color: "#1D4ED8",
                                fontSize: 12,
                                fontWeight: 500,
                                borderRadius: 4,
                                marginBottom: 4,
                              }}
                            >
                              {s.type}
                            </span>
                            <p
                              style={{
                                fontSize: 14,
                                color: "#6B7280",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {stepSummary(s)}
                            </p>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexShrink: 0,
                          }}
                        >
                          <button
                            onClick={() =>
                              editingStepIdx === idx
                                ? setEditingStepIdx(null)
                                : startEditStep(idx)
                            }
                            style={{
                              padding: "4px 8px",
                              fontSize: 12,
                              border: "none",
                              borderRadius: 4,
                              background:
                                editingStepIdx === idx
                                  ? "#DBEAFE"
                                  : "transparent",
                              color:
                                editingStepIdx === idx ? "#1D4ED8" : "#2563EB",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            {editingStepIdx === idx ? "Close" : "Edit"}
                          </button>
                          <button
                            onClick={() => handleDeleteStep(idx)}
                            style={{
                              padding: "4px 8px",
                              fontSize: 12,
                              background: "transparent",
                              color: "#DC2626",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Inline step edit form */}
                      {editingStepIdx === idx && (
                        <div
                          style={{
                            padding: "20px",
                            background: "#EFF6FF",
                            borderBottom: "1px solid #DBEAFE",
                          }}
                        >
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#1D4ED8",
                              marginBottom: 12,
                            }}
                          >
                            Editing Step {idx + 1}
                          </p>
                          {editStepError && (
                            <div
                              style={{
                                color: "#B91C1C",
                                fontSize: 14,
                                marginBottom: 12,
                              }}
                            >
                              {editStepError}
                            </div>
                          )}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 12,
                            }}
                          >
                            <div>
                              <label
                                style={{
                                  display: "block",
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: "#6B7280",
                                  marginBottom: 4,
                                }}
                              >
                                Step type
                              </label>
                              <select
                                value={editStepType}
                                onChange={(e) => {
                                  setEditStepType(e.target.value);
                                  setEditStepForm({});
                                  setEditStepError("");
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "1px solid #E5E7EB",
                                  borderRadius: 8,
                                  fontSize: 14,
                                  outline: "none",
                                  background: "#FFFFFF",
                                  color: "#1A1A2E",
                                  fontFamily: "Inter, sans-serif",
                                }}
                              >
                                {STEP_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {editingStepIdx !== null && workflow && (
                              <VariablesPanel
                                steps={workflow.steps}
                                currentIndex={editingStepIdx}
                              />
                            )}
                            <StepFields
                              stepType={editStepType}
                              formState={editStepForm}
                              setFormState={setEditStepForm}
                              steps={workflow?.steps}
                              index={editingStepIdx}
                            />
                            <div
                              style={{ display: "flex", gap: 8, paddingTop: 4 }}
                            >
                              <button
                                onClick={handleSaveEditStep}
                                disabled={saving}
                                style={{
                                  padding: "8px 16px",
                                  background: "#2563EB",
                                  color: "#FFFFFF",
                                  border: "none",
                                  borderRadius: 8,
                                  fontSize: 14,
                                  fontWeight: 500,
                                  cursor: "pointer",
                                  opacity: saving ? 0.5 : 1,
                                }}
                              >
                                {saving ? "Saving..." : "Save Changes"}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingStepIdx(null);
                                  setEditStepForm({});
                                  setEditStepError("");
                                }}
                                style={{
                                  padding: "8px 16px",
                                  background: "#F3F4F6",
                                  color: "#374151",
                                  border: "none",
                                  borderRadius: 8,
                                  fontSize: 14,
                                  cursor: "pointer",
                                }}
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
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderBottom: "1px solid #F3F4F6",
                }}
              >
                <span style={{ fontWeight: 500, color: "#1A1A2E" }}>
                  Run History
                </span>
                <button
                  onClick={fetchRuns}
                  style={{
                    fontSize: 12,
                    color: "#2563EB",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Refresh
                </button>
              </div>
              {runs.length === 0 ? (
                <div
                  style={{
                    padding: "48px 20px",
                    textAlign: "center",
                    color: "#9CA3AF",
                    fontSize: 14,
                  }}
                >
                  No runs yet — go to "🧪 Test Trigger" tab to run your first
                  test
                </div>
              ) : (
                <div style={{ borderTop: "1px solid #F3F4F6" }}>
                  {runs.map((run) => (
                    <div
                      key={run.id}
                      style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid #F3F4F6",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 8px",
                              borderRadius: 9999,
                              fontSize: 12,
                              fontWeight: 500,
                              background:
                                run.status === "completed"
                                  ? "#DCFCE7"
                                  : run.status === "failed"
                                    ? "#FEE2E2"
                                    : "#FEF9C3",
                              color:
                                run.status === "completed"
                                  ? "#15803D"
                                  : run.status === "failed"
                                    ? "#B91C1C"
                                    : "#A16207",
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background:
                                  run.status === "completed"
                                    ? "#16A34A"
                                    : run.status === "failed"
                                      ? "#DC2626"
                                      : "#EAB308",
                              }}
                            />
                            {run.status}
                          </span>
                          <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                            {timeAgo(run.startedAt)}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            color: "#9CA3AF",
                            fontFamily: "monospace",
                          }}
                        >
                          {run.id.slice(0, 8)}...
                        </span>
                      </div>
                      {run.steps?.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            marginTop: 4,
                          }}
                        >
                          {run.steps.map((step, i) => {
                            const stepKey = `${run.id}-${i}`;
                            const isExpanded = expandedRunStep === stepKey;
                            return (
                              <div
                                key={i}
                                style={{ fontSize: 12, color: "#6B7280" }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      flexShrink: 0,
                                      background:
                                        step.status === "success" ||
                                        step.status === "completed"
                                          ? "#16A34A"
                                          : step.status === "started"
                                            ? "#EAB308"
                                            : step.status === "failed" ||
                                                step.status === "error"
                                              ? "#DC2626"
                                              : "#D1D5DB",
                                    }}
                                  />
                                  <span>
                                    Step {step.stepIndex + 1} — {step.stepType}
                                  </span>
                                  {step.error && (
                                    <span
                                      style={{
                                        color: "#DC2626",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                      title={step.error}
                                    >
                                      — {step.error}
                                    </span>
                                  )}
                                  {(step.input || step.output) && (
                                    <button
                                      onClick={() =>
                                        setExpandedRunStep(
                                          isExpanded ? null : stepKey,
                                        )
                                      }
                                      style={{
                                        marginLeft: "auto",
                                        fontSize: 11,
                                        padding: "1px 6px",
                                        background: isExpanded
                                          ? "#DBEAFE"
                                          : "#F3F4F6",
                                        color: isExpanded
                                          ? "#1D4ED8"
                                          : "#6B7280",
                                        border: "none",
                                        borderRadius: 4,
                                        cursor: "pointer",
                                      }}
                                    >
                                      {isExpanded ? "Hide" : "Details"}
                                    </button>
                                  )}
                                </div>
                                {isExpanded && (
                                  <div
                                    style={{
                                      marginTop: 6,
                                      marginLeft: 14,
                                      background: "#F9FAFB",
                                      border: "1px solid #E5E7EB",
                                      borderRadius: 6,
                                      padding: "8px 10px",
                                      fontSize: 11,
                                      fontFamily: "monospace",
                                      color: "#374151",
                                    }}
                                  >
                                    {step.input && (
                                      <div style={{ marginBottom: 6 }}>
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            color: "#6B7280",
                                          }}
                                        >
                                          INPUT
                                        </span>
                                        <pre
                                          style={{
                                            margin: "2px 0 0 0",
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-all",
                                          }}
                                        >
                                          {JSON.stringify(step.input, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                    {step.output && (
                                      <div>
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            color: "#6B7280",
                                          }}
                                        >
                                          OUTPUT
                                        </span>
                                        <pre
                                          style={{
                                            margin: "2px 0 0 0",
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-all",
                                          }}
                                        >
                                          {JSON.stringify(step.output, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #F3F4F6",
                }}
              >
                <h3 style={{ fontWeight: 500, color: "#1A1A2E" }}>
                  Test Trigger
                </h3>
                <p style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>
                  Simulate a real trigger — paste the data your form/app would
                  send, then fire it.
                </p>
              </div>
              <div
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    background: "#EFF6FF",
                    border: "1px solid #DBEAFE",
                    borderRadius: 8,
                    padding: "12px 16px",
                    fontSize: 14,
                    color: "#1D4ED8",
                  }}
                >
                  <p style={{ fontWeight: 500, marginBottom: 4 }}>
                    How this works
                  </p>
                  <p>
                    This sends the data below directly to your webhook URL.
                    AutoMax will run all your steps, replacing{" "}
                    <code
                      style={{ fontFamily: "monospace", fontWeight: "bold" }}
                    >
                      {"{{name}}"}
                    </code>
                    ,{" "}
                    <code
                      style={{ fontFamily: "monospace", fontWeight: "bold" }}
                    >
                      {"{{email}}"}
                    </code>
                    ,{" "}
                    <code
                      style={{ fontFamily: "monospace", fontWeight: "bold" }}
                    >
                      {"{{phone}}"}
                    </code>{" "}
                    etc. with the actual values.
                  </p>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#6B7280",
                      marginBottom: 4,
                    }}
                  >
                    Test data (JSON) — edit these values to match your real data
                  </label>
                  <textarea
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    rows={8}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      fontSize: 14,
                      fontFamily: "monospace",
                      outline: "none",
                      background: "#FFFFFF",
                      color: "#1A1A2E",
                      resize: "none",
                    }}
                  />
                </div>
                {testError && (
                  <div
                    style={{
                      background: "#FEF2F2",
                      border: "1px solid #FECACA",
                      color: "#B91C1C",
                      padding: "12px 16px",
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  >
                    {testError}
                  </div>
                )}
                <button
                  onClick={handleTestTrigger}
                  disabled={testLoading}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    background: "#2563EB",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 500,
                    fontSize: 14,
                    cursor: "pointer",
                    opacity: testLoading ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  {testLoading ? "Running workflow..." : "🚀 Fire Test Trigger"}
                </button>
                {testResult && (
                  <div
                    style={{
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      borderRadius: 8,
                      padding: "16px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#166534",
                        marginBottom: 8,
                      }}
                    >
                      ✅ Workflow triggered successfully!
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#22C55E",
                        marginBottom: 8,
                      }}
                    >
                      Check the Run History tab to see the full execution log.
                    </p>
                    <pre
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        overflow: "auto",
                        maxHeight: 160,
                        fontFamily: "monospace",
                        background: "#FFFFFF",
                        padding: "8px",
                        borderRadius: 4,
                      }}
                    >
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
