"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function RightPanel({
  open, onClose, title, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          backgroundColor: "rgba(0,0,0,0.35)",
        }}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50,
        width: "min(440px, 100vw)",
        backgroundColor: "var(--bg)",
        borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          padding: "18px 20px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0, flex: 1 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "transparent", border: "none", borderRadius: 6,
              color: "var(--text-tertiary)", cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
          {children}
        </div>
      </div>
    </>
  );
}
