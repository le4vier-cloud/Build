"use client";

import { useState } from "react";
import { Scissors, Plus } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";

const SUB_NAV = [
  { key: "list", label: "Tools",     icon: <Scissors size={15} strokeWidth={1.8} /> },
  { key: "add",  label: "Add Tools", icon: <Plus size={15} strokeWidth={2} /> },
];

export default function ToolsPage() {
  const [view, setView] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", serial_number: "" });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ModuleLayout title="Tools" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
      {view === "list" && <ToolList />}
      {view === "add" && (
        <div style={s.form}>
          <h3 style={s.title}>New Tool</h3>

          <div style={s.imageUpload}>
            <span style={s.imageText}>Click to upload an image</span>
          </div>

          <Field label="Name*" value={form.name} onChange={(v) => set("name", v)} />
          <Field label="Serial Number*" value={form.serial_number} onChange={(v) => set("serial_number", v)} />

          <div style={{ marginTop: 8 }}>
            <button style={s.saveBtn}>Save</button>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}

function ToolList() {
  return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No tools yet.</p>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <input value={value} placeholder="Type here..."
        onChange={(e) => onChange(e.target.value)} style={s.input} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 20, maxWidth: 420 },
  title: { fontSize: 18, fontWeight: 600, color: "var(--text-primary)" },
  imageUpload: { width: 120, height: 120, border: "1px dashed var(--input-border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backgroundColor: "var(--bg)" },
  imageText: { fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: 8 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input: { height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none" },
  select: { flex: 1, height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none" },
  row: { display: "flex", gap: 8, alignItems: "center" },
  saveBtn: { height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
