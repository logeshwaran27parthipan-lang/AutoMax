"use client";
import React, { useState } from "react";
import axios from "axios";

export default function AIPage() {
  const [model, setModel] = useState("gemini");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!prompt.trim()) return alert("Enter a prompt");
    setLoading(true);
    setError("");
    setResponse("");
    try {
      const res = await axios.post("/api/ai", { model, prompt });
      const data = res.data;
      if (model === "gemini") {
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        setResponse(text || JSON.stringify(data, null, 2));
      } else {
        const text = data?.content?.[0]?.text;
        setResponse(text || JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">AI Assistant</h1>
      <div className="bg-white rounded shadow p-6 mb-6">
        <label className="block font-medium mb-2">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        >
          <option value="gemini">Gemini</option>
          <option value="claude">Claude</option>
        </select>
        <label className="block font-medium mb-2">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          rows={4}
          placeholder="Write a follow-up email for a new lead..."
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
          {error}
        </div>
      )}

      {response && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="font-semibold mb-3">Response</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}