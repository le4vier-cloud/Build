"use client";

import { Pencil, Trash2 } from "lucide-react";

interface RowActionsProps {
  visible: boolean;
  onEdit?: () => void;
  onDelete: () => void;
  style?: React.CSSProperties;
}

export function RowActions({ visible, onEdit, onDelete, style }: RowActionsProps) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 4,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.12s",
        flexShrink: 0,
        ...style,
      }}
    >
      {onEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Edit"
          style={iconBtn}
        >
          <Pencil size={13} strokeWidth={1.8} />
        </button>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete"
        style={{ ...iconBtn, color: "#EF4444" }}
      >
        <Trash2 size={13} strokeWidth={1.8} />
      </button>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26, borderRadius: 6,
  border: "1px solid var(--border)", backgroundColor: "var(--surface)",
  color: "var(--text-secondary)", cursor: "pointer",
};
