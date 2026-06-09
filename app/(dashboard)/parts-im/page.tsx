"use client";

import { useState } from "react";
import { Link2, Plus } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";

const SUB_NAV = [
  { key: "list", label: "Stock Items",     icon: <Link2 size={15} strokeWidth={1.8} /> },
  { key: "add",  label: "Add Stock Items", icon: <Plus size={15} strokeWidth={2} /> },
];

interface OsComponent { part_os_id: string; quantity: string; }

export default function PartsIMPage() {
  const [view, setView] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", serial_number: "", qty_in_stock: "", min_threshold: "",
    low_stock_alert: true, assembly_task_name: "Internal Manufacturing of",
    assembly_description: "Internal Manufacturing of 's Description.",
    max_produce_minutes: "", labour_cost_per_hour: "",
    os_components: [] as OsComponent[],
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const addComponent = () =>
    set("os_components", [...form.os_components, { part_os_id: "", quantity: "" }]);
  const updateComponent = (i: number, field: keyof OsComponent, value: string) =>
    set("os_components", form.os_components.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  return (
    <ModuleLayout title="Internally Manufactured — Stock Items" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
      {view === "list" && <PartsList />}
      {view === "add" && (
        <div style={s.form}>
          <h3 style={s.title}>New Stock Item (Internally Manufactured)</h3>

          <Field label="Name*"           value={form.name}          onChange={(v) => set("name", v)} />
          <Field label="Serial Number"   value={form.serial_number} onChange={(v) => set("serial_number", v)} />
          <Field label="Amount In Stock*" type="number" value={form.qty_in_stock} onChange={(v) => set("qty_in_stock", v)} />
          <Field label="Minimum Threshold Amount" type="number" value={form.min_threshold} onChange={(v) => set("min_threshold", v)} />

          <div style={s.toggleRow}>
            <label style={s.label}>Low Stock Alert</label>
            <button
              type="button"
              onClick={() => set("low_stock_alert", !form.low_stock_alert)}
              style={{ ...s.toggle, backgroundColor: form.low_stock_alert ? "var(--danger)" : "var(--border)" }}
            >
              <span style={{ ...s.toggleThumb, transform: form.low_stock_alert ? "translateX(20px)" : "translateX(2px)" }} />
            </button>
          </div>

          <Field label='Task "Assembly" Name*' value={form.assembly_task_name} onChange={(v) => set("assembly_task_name", v)} />

          <div style={s.field}>
            <label style={s.label}>Task "Assembly" Description</label>
            <textarea value={form.assembly_description}
              onChange={(e) => set("assembly_description", e.target.value)}
              rows={3} style={s.textarea} />
          </div>

          <Field label="Maximum Time Taken To Produce (Minutes)" type="number" value={form.max_produce_minutes} onChange={(v) => set("max_produce_minutes", v)} />
          <Field label="Labour Cost Per Hour" type="number" value={form.labour_cost_per_hour} onChange={(v) => set("labour_cost_per_hour", v)} />

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={s.label}>Stock Items (OS)</label>
              <button type="button" onClick={addComponent} style={s.addRowBtn}>
                <Plus size={14} strokeWidth={2} /> Add
              </button>
            </div>
            {form.os_components.map((c, i) => (
              <div key={i} style={s.componentRow}>
                <select value={c.part_os_id} onChange={(e) => updateComponent(i, "part_os_id", e.target.value)} style={s.select}>
                  <option value="">Choose an option...</option>
                </select>
                <input type="number" value={c.quantity} placeholder="Qty"
                  onChange={(e) => updateComponent(i, "quantity", e.target.value)} style={{ ...s.input, width: 80 }} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <button style={s.saveBtn}>Save</button>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}

function PartsList() {
  return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No internally manufactured parts yet.</p>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <input type={type} value={value} placeholder="Type here..."
        onChange={(e) => onChange(e.target.value)} style={s.input} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 },
  title: { fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input: { height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none" },
  textarea: { border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none", resize: "vertical", fontFamily: "inherit" },
  select: { flex: 1, height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none" },
  toggleRow: { display: "flex", alignItems: "center", gap: 12 },
  toggle: { width: 44, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative", transition: "background-color 0.2s", flexShrink: 0 },
  toggleThumb: { position: "absolute", top: 3, width: 20, height: 20, borderRadius: "50%", backgroundColor: "#fff", transition: "transform 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" },
  componentRow: { display: "flex", gap: 8, marginBottom: 8, alignItems: "center" },
  addRowBtn: { display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" },
  saveBtn: { height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
