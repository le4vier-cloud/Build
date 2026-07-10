"use client";

import { Check } from "lucide-react";

interface SelectCheckboxProps {
  checked: boolean;
  visible: boolean;
  onChange: () => void;
  style?: React.CSSProperties;
}

export function SelectCheckbox({ checked, visible, onChange, style }: SelectCheckboxProps) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      aria-label={checked ? "Deselect" : "Select"}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
        border: `1.5px solid ${checked ? "var(--accent)" : "var(--border)"}`,
        backgroundColor: checked ? "var(--accent)" : "var(--surface)",
        opacity: visible || checked ? 1 : 0,
        transition: "opacity 0.12s, background-color 0.12s, border-color 0.12s",
        cursor: "pointer",
        pointerEvents: visible || checked ? "auto" : "none",
        ...style,
      }}
    >
      {checked && <Check size={12} strokeWidth={3} color="#fff" />}
    </button>
  );
}
