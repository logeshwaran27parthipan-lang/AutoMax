"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Check,
  CreditCard,
  Zap,
  Sparkles,
  Shield,
  Code,
  Loader2,
} from "lucide-react";

export default function BillingPage() {
  const [plan, setPlan] = useState("free");
  const [status, setStatus] = useState("free");
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchBillingInfo = async () => {
      try {
        const res = await axios.get("/api/org/api-key");
        const org = res.data.org || {};
        setPlan(org.planId ?? "free");
        setStatus(org.subscriptionStatus ?? "free");
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    fetchBillingInfo();
  }, []);

  const handleUpgrade = async () => {
    setUpgrading(true);
    setMessage("");
    try {
      await axios.post("/api/billing/subscribe");
      setStatus("active");
      setPlan("pro");
      setMessage("Upgraded to Pro! Welcome to AutoMax Pro.");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  const features = [
    { icon: Zap, label: "Unlimited workflows" },
    { icon: Shield, label: "Priority support" },
    { icon: Sparkles, label: "Advanced AI steps" },
    { icon: Code, label: "API access" },
  ];

  return (
    <div
      style={{
        paddingTop: 16,
        paddingBottom: 32,
        paddingLeft: "max(16px, 5%)",
        paddingRight: "max(16px, 5%)",
        maxWidth: 900,
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
        Billing & Plan
      </h1>
      <p
        style={{
          fontSize: "clamp(13px, 3.5vw, 14px)",
          color: "var(--muted-foreground)",
          marginBottom: 24,
        }}
      >
        Manage your AutoMax subscription.
      </p>

      {loading ? (
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: "var(--muted-foreground)",
          }}
        >
          <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
          Loading billing information...
        </div>
      ) : (
        <>
          {/* Current Plan Card */}
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
                marginBottom: 24,
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
                <CreditCard size={18} color="var(--primary)" />
              </div>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--foreground)",
                }}
              >
                Current Plan
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--foreground)",
                }}
              >
                {plan === "pro" ? "AutoMax Pro" : "AutoMax Starter"}
              </h2>
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor:
                    status === "active" ? "#dcfce7" : "var(--secondary)",
                  color:
                    status === "active" ? "#16a34a" : "var(--muted-foreground)",
                }}
              >
                {status === "active" ? "Active" : "Free"}
              </span>
            </div>

            <p
              style={{
                fontSize: 14,
                color: "var(--muted-foreground)",
                lineHeight: 1.5,
              }}
            >
              {status === "active"
                ? "You have full access to all Pro features."
                : "You are on the free plan. Upgrade to unlock all features."}
            </p>
          </div>

          {/* Upgrade Card */}
          {status !== "active" && (
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
                  marginBottom: 24,
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
                  <Zap size={18} color="var(--primary)" />
                </div>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--foreground)",
                  }}
                >
                  Upgrade to Pro
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 24,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--muted-foreground)",
                      marginBottom: 4,
                    }}
                  >
                    Everything you need to automate at scale
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: "var(--primary)",
                    }}
                  >
                    ₹499
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    per month
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        backgroundColor: "var(--secondary)",
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          backgroundColor: "var(--accent)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={14} color="var(--accent-foreground)" />
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--foreground)",
                          fontWeight: 500,
                        }}
                      >
                        {feature.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Upgrade Button */}
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                style={{
                  width: "100%",
                  backgroundColor: upgrading ? "#fcd34d" : "var(--primary)",
                  color: upgrading ? "var(--foreground)" : "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: upgrading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!upgrading) {
                    (e.currentTarget as HTMLButtonElement).style.opacity =
                      "0.9";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!upgrading) {
                    (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                  }
                }}
              >
                {upgrading ? (
                  <Loader2
                    size={16}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <Zap size={16} />
                )}
                {upgrading ? "Upgrading..." : "Upgrade to Pro (Test Mode)"}
              </button>

              {/* Disclaimer */}
              <p
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  textAlign: "center",
                }}
              >
                Test mode: no payment required. Razorpay integration coming
                soon.
              </p>
            </div>
          )}

          {/* Success/Error Message */}
          {message && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                backgroundColor: message.includes("Upgraded")
                  ? "#f0fdf4"
                  : "#fef2f2",
                border: message.includes("Upgraded")
                  ? "1px solid #bbf7d0"
                  : "1px solid #fecaca",
                borderRadius: 8,
                fontSize: 13,
                color: message.includes("Upgraded") ? "#16a34a" : "#dc2626",
              }}
            >
              {message.includes("Upgraded") ? (
                <Check size={16} color="#16a34a" />
              ) : null}
              {message}
            </div>
          )}
        </>
      )}

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
