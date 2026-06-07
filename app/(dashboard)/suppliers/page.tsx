"use client";

import { useState } from "react";
import { Warehouse, Plus } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";
import { MultiInput } from "@/components/ui/multi-input";

const SUB_NAV = [
  { key: "list", label: "Suppliers",     icon: <Warehouse size={15} strokeWidth={1.8} /> },
  { key: "add",  label: "Add Suppliers", icon: <Plus size={15} strokeWidth={2} /> },
];

export default function SuppliersPage() {
  const [view, setView] = useState("add");
  const [form, setForm] = useState({ name: "", address: "", emails: [] as string[], cell_numbers: [] as string[] });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ModuleLayout title="Suppliers" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
      {view === "list" && <SupplierList />}
      {view === "add" && (
        <div style={s.form}>
          <h3 style={s.title}>New Supplier</h3>

          <div style={s.field}>
            <label style={s.label}>New Supplier Name*</label>
            <input value={form.name} placeholder="Type here..."
              onChange={(e) => set("name", e.target.value)} style={s.input} />
          </div>

          <div style={s.field}>
            <label style={s.label}>New Supplier Address*</label>
            <input value={form.address} placeholder="Start typing..."
              onChange={(e) => set("address", e.target.value)} style={s.input} />
          </div>

          <MultiInput label="Email Addresses" values={form.emails}
            onChange={(v) => set("emails", v)} placeholder="Type here..." type="email" />

          <MultiInput label="Cell Numbers" values={form.cell_numbers}
            onChange={(v) => set("cell_numbers", v)} placeholder="Type here..." type="tel" />

          <div style={{ marginTop: 8 }}>
            <button style={s.saveBtn}>Save</button>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}

function SupplierList() {
  return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No suppliers yet.</p>;
}

const s: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 20, maxWidth: 420 },
  title: { fontSize: 18, fontWeight: 600, color: "var(--text-primary)" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input: { height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none" },
  saveBtn: { height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
