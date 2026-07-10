"use client";

import { useState } from "react";
import { Pencil, Download, Trash2, X } from "lucide-react";

interface BulkActionBarProps {
  count: number;
  entityLabel: string;
  onEdit?: () => void;
  onExport?: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BulkActionBar({ count, entityLabel, onEdit, onExport, onDelete, onClear }: BulkActionBarProps) {
  const [confirming, setConfirming] = useState(false);

  if (count === 0) return null;

  function handleDeleteClick() {
    if (confirming) {
      onDelete();
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 150,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "8px 8px 8px 16px",
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 999,
        boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", paddingRight: 10, borderRight: "1px solid var(--border)" }}>
        {count} {entityLabel}{count !== 1 ? "s" : ""} selected
      </span>

      {onEdit && (
        <button onClick={onEdit} title="Edit" style={btnStyle}>
          <Pencil size={13} strokeWidth={2} /> Edit
        </button>
      )}

      {onExport && (
        <button onClick={onExport} title="Export selected" style={btnStyle}>
          <Download size={13} strokeWidth={2} /> Export
        </button>
      )}

      {confirming ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 2 }}>
          <span style={{ fontSize: 12, color: "#EF4444", fontWeight: 600, whiteSpace: "nowrap" }}>Delete?</span>
          <button onClick={handleDeleteClick} style={{ ...btnStyle, backgroundColor: "#EF4444", color: "#fff" }}>Yes</button>
          <button onClick={() => setConfirming(false)} style={btnStyle}>No</button>
        </div>
      ) : (
        <button onClick={handleDeleteClick} title="Delete" style={{ ...btnStyle, color: "#EF4444" }}>
          <Trash2 size={13} strokeWidth={2} /> Delete
        </button>
      )}

      <button
        onClick={onClear}
        title="Clear selection"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, marginLeft: 4, borderRadius: "50%",
          border: "none", backgroundColor: "transparent", cursor: "pointer",
          color: "var(--text-tertiary)",
        }}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 5,
  height: 30, padding: "0 12px",
  backgroundColor: "transparent", border: "1px solid var(--border)", borderRadius: 999,
  fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer",
  whiteSpace: "nowrap",
};
