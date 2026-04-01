"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";

type Workflow = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    try {
      const res = await axios.get("/api/workflows");
      setWorkflows(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createWorkflow() {
    if (!name.trim()) return alert("Name is required");
    setCreating(true);
    try {
      await axios.post("/api/workflows", { name, description });
      setName("");
      setDescription("");
      setShowForm(false);
      fetchWorkflows();
    } catch (err) {
      console.error(err);
      alert("Failed to create workflow");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Workflows</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + New Workflow
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Workflow</h2>
          <label className="block mb-1 font-medium">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded mb-3"
            placeholder="e.g. Lead Follow-up"
          />
          <label className="block mb-1 font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            rows={3}
            placeholder="What does this workflow do?"
          />
          <div className="flex gap-3">
            <button
              onClick={createWorkflow}
              disabled={creating}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Workflow"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading workflows...</p>
      ) : workflows.length === 0 ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          <p className="text-lg mb-2">No workflows yet</p>
          <p>Click + New Workflow to create your first automation</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((w) => (
            <div key={w.id} className="bg-white p-5 rounded shadow flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{w.name}</h3>
                {w.description && (
                  <p className="text-gray-500 text-sm mt-1">{w.description}</p>
                )}
                <p className="text-gray-400 text-xs mt-2">
                  Created {new Date(w.createdAt).toLocaleDateString()}
                </p>
              </div>
              <a
                href={`/dashboard/workflows/${w.id}`}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
              >
                Open
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}