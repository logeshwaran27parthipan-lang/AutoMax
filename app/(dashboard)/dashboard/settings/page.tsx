"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  Loader2,
  MessageCircle,
} from "lucide-react";

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [wahaUrl, setWahaUrl] = useState("");
  const [wahaSaving, setWahaSaving] = useState(false);
  const [wahaMessage, setWahaMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
      setSuccessMsg("API key regenerated successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError("An error occurred while regenerating the API key");
    } finally {
      setRegenerating(false);
    }
  };

  const handleUpdateWahaUrl = async () => {
    setWahaSaving(true);
    setWahaMessage(null);

    try {
      const res = await fetch("/api/settings/waha-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: wahaUrl }),
      });

      if (res.ok) {
        setWahaMessage({
          type: "success",
          text: "WAHA URL updated! Redeploy Vercel to apply.",
        });
      } else {
        const errorData = await res.json();
        setWahaMessage({
          type: "error",
          text: errorData.error || "Failed to update WAHA URL",
        });
      }
    } catch (err) {
      setWahaMessage({
        type: "error",
        text: "Failed to update WAHA URL",
      });
    } finally {
      setWahaSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 32,
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: "var(--muted-foreground)",
        }}
      >
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        Loading settings...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, color: "#dc2626", fontSize: 14 }}>{error}</div>
    );
  }

  return (
    <div
      style={{
        paddingTop: 16,
        paddingBottom: 32,
        paddingLeft: "max(16px, 5%)",
        paddingRight: "max(16px, 5%)",
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      {/* Page Header */}
      <h1
        style={{
          fontSize: "clamp(20px, 5vw, 28px)",
          fontWeight: 700,
          color: "var(--foreground)",
          marginBottom: 8,
        }}
      >
        Settings
      </h1>
      <p
        style={{
          fontSize: "clamp(13px, 3.5vw, 14px)",
          color: "var(--muted-foreground)",
          marginBottom: 24,
        }}
      >
        Manage your organization and API access.
      </p>

      {/* Organization Card */}
      <div
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: "#fef3c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Building2 size={18} color="var(--primary)" />
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--foreground)",
            }}
          >
            Organization
          </span>
        </div>

        {/* Organization Name Field */}
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--muted-foreground)",
              marginBottom: 6,
              display: "block",
            }}
          >
            Organization Name
          </label>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--foreground)",
              padding: "10px 14px",
              backgroundColor: "var(--secondary)",
              borderRadius: 8,
            }}
          >
            {orgName}
          </div>
        </div>
      </div>

      {/* API Key Card */}
      <div
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: "#fef3c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Key size={18} color="var(--primary)" />
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--foreground)",
            }}
          >
            API Key
          </span>
        </div>

        {/* Warning Text */}
        <p
          style={{
            fontSize: 13,
            color: "var(--muted-foreground)",
            marginBottom: 20,
          }}
        >
          Use this key to authenticate AutoMax API requests. Keep it secret.
        </p>

        {/* API Key Label */}
        <label
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--muted-foreground)",
            marginBottom: 8,
            display: "block",
          }}
        >
          Your API Key
        </label>

        {/* Input and Show/Hide Button */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            readOnly
            style={{
              flex: 1,
              fontFamily: "monospace",
              fontSize: 13,
              padding: "10px 14px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              backgroundColor: "var(--secondary)",
              color: "var(--foreground)",
              outline: "none",
            }}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            style={{
              padding: "10px 16px",
              backgroundColor: "var(--secondary)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--foreground)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "var(--secondary)";
            }}
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            {showKey ? "Hide" : "Show"}
          </button>
        </div>

        {/* Regenerate Button */}
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          style={{
            backgroundColor: regenerating ? "#fca5a5" : "#dc2626",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 600,
            cursor: regenerating ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!regenerating) {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "#b91c1c";
            }
          }}
          onMouseLeave={(e) => {
            if (!regenerating) {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "#dc2626";
            }
          }}
        >
          {regenerating ? (
            <Loader2
              size={15}
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : (
            <RefreshCw size={15} />
          )}
          {regenerating ? "Regenerating..." : "Regenerate API Key"}
        </button>

        {/* Warning Text Below Button */}
        <p
          style={{
            fontSize: 12,
            color: "var(--muted-foreground)",
            marginTop: 8,
          }}
        >
          ⚠ Regenerating will immediately invalidate your current key.
        </p>

        {/* Success Message */}
        {successMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 16,
              padding: "12px 16px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              fontSize: 13,
              color: "#16a34a",
            }}
          >
            <CheckCircle2 size={16} color="#16a34a" />
            {successMsg}
          </div>
        )}
      </div>

      {/* WAHA Configuration Card */}
      <div
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: "#fef3c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MessageCircle size={18} color="var(--primary)" />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--foreground)",
              }}
            >
              WhatsApp (WAHA) Configuration
            </span>
            <span
              style={{
                fontSize: 13,
                color: "var(--muted-foreground)",
              }}
            >
              Update this when your Cloudflare tunnel URL changes
            </span>
          </div>
        </div>

        {/* URL Input */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="https://your-tunnel-url.trycloudflare.com"
            value={wahaUrl}
            onChange={(e) => setWahaUrl(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "inherit",
              boxSizing: "border-box",
              color: "var(--foreground)",
              backgroundColor: "var(--secondary)",
            }}
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleUpdateWahaUrl}
          disabled={wahaSaving}
          style={{
            backgroundColor: "#F59E0B",
            color: "white",
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            cursor: wahaSaving ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 600,
            opacity: wahaSaving ? 0.7 : 1,
          }}
        >
          {wahaSaving ? "Updating..." : "Update WAHA URL"}
        </button>

        {/* Message Display */}
        {wahaMessage && (
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: wahaMessage.type === "success" ? "#16A34A" : "#DC2626",
            }}
          >
            {wahaMessage.text}
          </div>
        )}
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
      `}</style>
    </div>
  );
}
