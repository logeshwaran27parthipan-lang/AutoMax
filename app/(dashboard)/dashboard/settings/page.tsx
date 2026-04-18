"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const res = await fetch("/api/org/api-key");
        if (!res.ok) {
          setError("Failed to fetch organization settings");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setOrgName(data.orgName);
        setApiKey(data.apiKey);
        setLoading(false);
      } catch (err) {
        setError("An error occurred while fetching settings");
        setLoading(false);
      }
    };
    fetchApiKey();
  }, []);

  const handleRegenerate = async () => {
    if (
      !window.confirm(
        "Are you sure? Your old API key will stop working immediately.",
      )
    ) {
      return;
    }

    setRegenerating(true);
    try {
      const res = await fetch("/api/org/api-key", { method: "PATCH" });
      if (!res.ok) {
        setError("Failed to regenerate API key");
        setRegenerating(false);
        return;
      }
      const data = await res.json();
      setApiKey(data.apiKey);
      setSuccessMsg("API key regenerated.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError("An error occurred while regenerating the API key");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Organization
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name
            </label>
            <div className="text-lg text-gray-900">{orgName}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">API Key</h2>

          <label className="block text-sm font-medium text-gray-700 mb-3">
            API Key
          </label>

          <div className="flex gap-2 mb-4">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              readOnly
              className="flex-1 font-mono border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded text-sm font-medium transition"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded text-sm font-medium transition"
          >
            {regenerating ? "Regenerating..." : "Regenerate API Key"}
          </button>

          {successMsg && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
              {successMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
