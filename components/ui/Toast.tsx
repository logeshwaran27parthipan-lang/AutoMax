"use client";
import React, { useEffect } from "react";
import { create } from "zustand";

type ToastType = "error" | "success" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  const { addToast } = useToastStore();
  return {
    error: (msg: string) => addToast(msg, "error"),
    success: (msg: string) => addToast(msg, "success"),
    info: (msg: string) => addToast(msg, "info"),
  };
}

const colors: Record<
  ToastType,
  { bg: string; border: string; icon: string; iconColor: string }
> = {
  error: { bg: "#FFF1F2", border: "#FCA5A5", icon: "✕", iconColor: "#DC2626" },
  success: {
    bg: "#F0FDF4",
    border: "#86EFAC",
    icon: "✓",
    iconColor: "#16A34A",
  },
  info: { bg: "#FFFBEB", border: "#FCD34D", icon: "i", iconColor: "#F59E0B" },
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: () => void;
}) {
  const c = colors[toast.type];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        boxShadow: "0 4px 24px rgba(26,26,46,0.12)",
        fontFamily: "Inter, sans-serif",
        fontSize: 14,
        fontWeight: 500,
        color: "#1A1A2E",
        minWidth: 280,
        maxWidth: 400,
        pointerEvents: "auto",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: c.iconColor,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {c.icon}
      </span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onRemove}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#9CA3AF",
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
