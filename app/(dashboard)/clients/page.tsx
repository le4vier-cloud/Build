"use client";

import { useState } from "react";
import { UserCircle, Plus } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";
import { RightPanel } from "@/components/ui/right-panel";
import { MultiInput } from "@/components/ui/multi-input";

const SUB_NAV = [
  { key: "list", label: "Clients", icon: <UserCircle size={15} strokeWidth={1.8} /> },
];

export default function ClientsPage() {
  const [view, setView]           = useState("list");
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", address: "", emails: [] as string[], cell_numbers: [] as string[],
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  function handleSave() {
    setPanelOpen(false);
    setForm({ name: "", address: "", emails: [], cell_numbers: [] });
  }

  return (
    <>
      <ModuleLayout title="Clients" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
        {view === "list" && <ClientList onAdd={() => setPanelOpen(true)} />}
      </ModuleLayout>

      <RightPanel open={panelOpen} onClose={() => setPanelOpen(false)} title="New Client">
        <div style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Client Name *</label>
            <input value={form.name} placeholder="Type here..."
              onChange={(e) => set("name", e.target.value)} style={s.input} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Address</label>
            <input value={form.address} placeholder="Type here..."
              onChange={(e) => set("address", e.target.value)} style={s.input} />
          </div>
          <MultiInput label="Email Addresses" required values={form.emails}
            onChange={(v) => set("emails", v)} placeholder="Type here..." type="email" />
          <MultiInput label="Cell Numbers" required values={form.cell_numbers}
            onChange={(v) => set("cell_numbers", v)} placeholder="Type here..." type="tel" />
          <button onClick={handleSave} style={s.saveBtn}>Save</button>
        </div>
      </RightPanel>
    </>
  );
}

function ClientList({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No clients yet.</p>
      <button
        onClick={onAdd}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", padding: "10px", borderRadius: 8,
          border: "1.5px dashed var(--border)", backgroundColor: "transparent",
          color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <Plus size={15} /> Add Client
      </button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  form:    { display: "flex", flexDirection: "column", gap: 20 },
  field:   { display: "flex", flexDirection: "column", gap: 6 },
  label:   { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input:   { height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none", width: "100%", boxSizing: "border-box" } as React.CSSProperties,
  saveBtn: { height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8 },
};
