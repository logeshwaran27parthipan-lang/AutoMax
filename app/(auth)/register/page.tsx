"use client";
import React from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await axios.post("/api/auth/register", data);
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      alert("Registration failed");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #FFFBF0 0%, #F5F5F0 100%)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#1A1A2E",
                letterSpacing: "-0.5px",
              }}
            >
              Auto<span style={{ color: "#F59E0B" }}>Max</span>
            </span>
          </a>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{
            width: "100%",
            padding: 32,
            background: "#FFFFFF",
            borderRadius: 12,
            boxShadow: "0 4px 32px rgba(26,26,46,0.10)",
            border: "1px solid #E5E7EB",
          }}
        >
          <div style={{ marginBottom: 28 }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#1A1A2E",
                marginBottom: 4,
              }}
            >
              Create account
            </h1>
            <p style={{ fontSize: 14, color: "#6B7280" }}>
              Start automating your business with AutoMax
            </p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 6,
              }}
            >
              Name
            </label>
            <input
              {...register("name")}
              placeholder="Your name"
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                color: "#1A1A2E",
                background: "#FFFFFF",
                fontFamily: "Inter, sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                color: "#1A1A2E",
                background: "#FFFFFF",
                fontFamily: "Inter, sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#6B7280",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              {...register("password")}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                color: "#1A1A2E",
                background: "#FFFFFF",
                fontFamily: "Inter, sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "11px 16px",
              background: "#F59E0B",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Create account
          </button>
          <p
            style={{
              marginTop: 20,
              textAlign: "center",
              fontSize: 14,
              color: "#6B7280",
            }}
          >
            Already have an account?{" "}
            <a
              href="/login"
              style={{
                color: "#2563EB",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
