"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";

type Workflow = {
  id: string;
  name: string;
  description?: string;
  triggers: any[];
  steps: any[];
  createdAt: string;
};

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStepType, setNewStepType] = useState<string>("send_email");
  const [formState, setFormState] = useState<any>({});

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Array<any>>([]);

  useEffect(() => {
    if (!id) return;
    fetchWorkflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchWorkflow() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/workflows/${id}`);
      setWorkflow(res.data as Workflow);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to load workflow");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormState({});
    setNewStepType("send_email");
  }

  async function saveSteps(updatedSteps: any[]) {
    if (!id) return;
    try {
      await axios.patch(`/api/workflows/${id}`, { steps: updatedSteps });
      // refresh
      fetchWorkflow();
    } catch (err: any) {
      console.error("Failed to save steps", err);
      setError(err?.response?.data?.error || "Failed to save steps");
    }
  }

  async function handleAddStep(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!workflow) return;

    let step: any = { type: newStepType };
    try {
      if (newStepType === "send_email") {
        step.to = String(formState.to || "");
        step.subject = String(formState.subject || "");
        step.body = String(formState.body || "");
      } else if (newStepType === "send_whatsapp") {
        step.phone = String(formState.phone || "");
        step.message = String(formState.message || "");
      } else if (newStepType === "ai_generate") {
        step.model = String(formState.model || "gemini");
        step.prompt = String(formState.prompt || "");
      } else if (newStepType === "sheets_read") {
        step.spreadsheetId = String(formState.spreadsheetId || "");
        step.range = String(formState.range || "");
      } else if (newStepType === "sheets_append") {
        step.spreadsheetId = String(formState.spreadsheetId || "");
        step.range = String(formState.range || "");
        // values: expect JSON text representing string[][]
        const raw = String(formState.values || "");
        step.values = raw ? JSON.parse(raw) : [];
      }
    } catch (err: any) {
      setError("Invalid step data: " + (err?.message || String(err)));
      return;
    }

    const updated = [...(workflow.steps || []), step];
    await saveSteps(updated);
    setShowAddForm(false);
    resetForm();
  }

  async function handleDeleteStep(index: number) {
    if (!workflow) return;
    const updated = (workflow.steps || []).filter(
      (_: any, i: number) => i !== index,
    );
    await saveSteps(updated);
  }

  async function handleRun() {
    if (!id) return;
    setRunning(true);
    setResults([]);
    try {
      const res = await axios.post(`/api/workflows/${id}/run`);
      setResults(res.data?.steps || []);
    } catch (err: any) {
      console.error("Run failed", err);
      setError(err?.response?.data?.error || "Failed to run workflow");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/workflows")}
              className="px-3 py-2 bg-white rounded shadow hover:bg-gray-50"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-semibold">Workflow details</h1>
          </div>
          <div>
            <button className="px-4 py-2 bg-white rounded shadow hover:bg-gray-50 mr-3">
              Edit
            </button>
          </div>
        </div>

        <div className="bg-white rounded shadow p-6 mb-6">
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Loading workflow...</span>
            </div>
          ) : error ? (
            <div className="text-red-600">Error: {error}</div>
          ) : workflow ? (
            <div>
              <h2 className="text-xl font-bold mb-1">{workflow.name}</h2>
              <p className="text-sm text-gray-500 mb-4">
                {workflow.description || "No description"}
              </p>
              <div className="text-xs text-gray-400">
                Created {new Date(workflow.createdAt).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No workflow found.</div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Steps</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  {showAddForm ? "Close" : "Add Step"}
                </button>
                <button
                  onClick={handleRun}
                  disabled={running}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {running ? "Running..." : "Run Workflow"}
                </button>
              </div>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleAddStep}
                className="mb-4 p-4 border rounded bg-gray-50 space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm">Step type</label>
                  <select
                    value={newStepType}
                    onChange={(e) => {
                      setNewStepType(e.target.value);
                      setFormState({});
                    }}
                    className="p-2 border rounded"
                  >
                    <option value="send_email">send_email</option>
                    <option value="send_whatsapp">send_whatsapp</option>
                    <option value="ai_generate">ai_generate</option>
                    <option value="sheets_read">sheets_read</option>
                    <option value="sheets_append">sheets_append</option>
                  </select>
                </div>

                {newStepType === "send_email" && (
                  <div className="space-y-2">
                    <input
                      className="w-full p-2 border rounded"
                      placeholder="To"
                      value={formState.to || ""}
                      onChange={(e) =>
                        setFormState({ ...formState, to: e.target.value })
                      }
                    />
                    <input
                      className="w-full p-2 border rounded"
                      placeholder="Subject"
                      value={formState.subject || ""}
                      onChange={(e) =>
                        setFormState({ ...formState, subject: e.target.value })
                      }
                    />
                    <textarea
                      className="w-full p-2 border rounded"
                      placeholder="Body"
                      value={formState.body || ""}
                      onChange={(e) =>
                        setFormState({ ...formState, body: e.target.value })
                      }
                    />
                  </div>
                )}

                {newStepType === "send_whatsapp" && (
                  <div className="space-y-2">
                    <input
                      className="w-full p-2 border rounded"
                      placeholder="Phone"
                      value={formState.phone || ""}
                      onChange={(e) =>
                        setFormState({ ...formState, phone: e.target.value })
                      }
                    />
                    <textarea
                      className="w-full p-2 border rounded"
                      placeholder="Message"
                      value={formState.message || ""}
                      onChange={(e) =>
                        setFormState({ ...formState, message: e.target.value })
                      }
                    />
                  </div>
                )}

                {newStepType === "ai_generate" && (
                  <div className="space-y-2">
                    <select
                      className="p-2 border rounded w-full"
                      value={formState.model || "gemini"}
                      onChange={(e) =>
                        setFormState({ ...formState, model: e.target.value })
                      }
                    >
                      <option value="gemini">gemini</option>
                      <option value="claude">claude</option>
                    </select>
                    <textarea
                      className="w-full p-2 border rounded"
                      placeholder="Prompt"
                      value={formState.prompt || ""}
                      onChange={(e) =>
                        setFormState({ ...formState, prompt: e.target.value })
                      }
                    />
                  </div>
                )}

                {newStepType === "sheets_read" && (
                  <div className="space-y-2">
                    <input
                      className="w-full p-2 border rounded"
                      placeholder="Spreadsheet ID"
                      value={formState.spreadsheetId || ""}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          spreadsheetId: e.target.value,
                        })
                      }
                    />
                    <input
                      className="w-full p-2 border rounded"
                      placeholder="Range (e.g. Sheet1!A1:B10)"
                      value={formState.range || ""}
                      onChange={(e) =>
                        setFormState({ ...formState, range: e.target.value })
                      }
                    />
                  </div>
                )}

                {newStepType === "sheets_append" && (
                  <div className="space-y-2">
                    <input
                      className="w-full p-2 border rounded"
                      placeholder="Spreadsheet ID"
                      value={formState.spreadsheetId || ""}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          spreadsheetId: e.target.value,
                        })
                      }
                    />
                    <input
                      className="w-full p-2 border rounded"
                      placeholder="Range (e.g. Sheet1!A1)"
                      value={formState.range || ""}
                      onChange={(e) =>
                        setFormState({ ...formState, range: e.target.value })
                      }
                    />
                    <textarea
                      className="w-full p-2 border rounded"
                      placeholder='Values JSON (e.g. [["a","b"],["c","d"]])'
                      value={formState.values || ""}
                      onChange={(e) =>
                        setFormState({ ...formState, values: e.target.value })
                      }
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 text-white rounded"
                  >
                    Add Step
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                    className="px-3 py-1 bg-gray-200 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {loading ? null : workflow &&
              workflow.steps &&
              workflow.steps.length > 0 ? (
              <div className="space-y-3">
                {workflow.steps.map((s: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 border rounded bg-gray-50 flex items-start justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                          {s.type}
                        </span>{" "}
                        <span className="ml-2 font-semibold">
                          Step {idx + 1}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {s.type === "send_email" && (
                          <>
                            {s.to} — {s.subject}
                          </>
                        )}
                        {s.type === "send_whatsapp" && <>{s.phone}</>}
                        {s.type === "ai_generate" && (
                          <>
                            {s.model} — {String(s.prompt).slice(0, 80)}
                          </>
                        )}
                        {s.type === "sheets_read" && (
                          <>
                            {s.spreadsheetId} {s.range}
                          </>
                        )}
                        {s.type === "sheets_append" && (
                          <>
                            {s.spreadsheetId} {s.range}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteStep(idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">No steps yet</div>
            )}
          </div>

          <div className="bg-white rounded shadow p-6">
            <h3 className="font-semibold mb-3">Triggers</h3>
            {loading ? null : workflow &&
              workflow.triggers &&
              workflow.triggers.length > 0 ? (
              <ul className="space-y-2">
                {workflow.triggers.map((t, idx) => (
                  <li key={idx} className="p-3 border rounded bg-gray-50">
                    Trigger {idx + 1}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500">No triggers yet</div>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-6">
          <div className="bg-white rounded shadow p-6">
            <h3 className="font-semibold mb-3">Execution Log</h3>
            {running && (
              <div className="text-gray-600 mb-3">Running workflow...</div>
            )}
            {!running && results.length === 0 && (
              <div className="text-gray-500">No runs yet</div>
            )}
            {results.length > 0 && (
              <div className="space-y-3">
                {results.map((r: any, i: number) => (
                  <div key={i} className="p-3 border rounded bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">
                          Step {r.stepIndex + 1} — {r.type}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {r.success ? (
                            <span className="text-green-600">Success</span>
                          ) : (
                            <span className="text-red-600">Failed</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {r.success ? "OK" : "ERROR"}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      {r.success ? (
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(r.result, null, 2)}
                        </pre>
                      ) : (
                        <div className="text-red-600">{r.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
