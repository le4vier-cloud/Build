"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

interface MultiInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}

export function MultiInput({ label, values, onChange, placeholder = "Type here...", required, type = "text" }: MultiInputProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) {
      onChange([...values, v]);
      setDraft("");
    }
  };

  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div style={s.wrap}>
      <label style={s.label}>{label}{required && <span style={s.req}>*</span>}</label>
      <div style={s.row}>
        <input
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          style={s.input}
        />
        <button type="button" onClick={add} style={s.addBtn} aria-label="Add">
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>
      {values.length > 0 && (
        <div style={s.chips}>
          {values.map((v, i) => (
            <span key={i} style={s.chip}>
              {v}
              <button type="button" onClick={() => remove(i)} style={s.removeBtn} aria-label="Remove">
                <X size={12} strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  req: { color: "var(--danger)", marginLeft: 2 },
  row: { display: "flex", gap: 6, alignItems: "center" },
  input: {
    flex: 1,
    height: 36,
    border: "1px solid var(--input-border)",
    borderRadius: "var(--radius-sm)",
    padding: "0 12px",
    fontSize: 14,
    color: "var(--text-primary)",
    backgroundColor: "var(--surface)",
    outline: "none",
  },
  addBtn: {
    width: 36,
    height: 36,
    border: "1px solid var(--input-border)",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    background: "var(--surface)",
    color: "var(--text-secondary)",
    flexShrink: 0,
  },
  chips: { display: "flex", flexWrap: "wrap", gap: 6 },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 10px 3px 10px",
    backgroundColor: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-full, 9999px)",
    fontSize: 13,
    color: "var(--text-primary)",
  },
  removeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    color: "var(--text-tertiary)",
  },
};
