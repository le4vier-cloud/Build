"use client";

import { useState } from "react";
import { ArrowUpCircle, Plus } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";

const SUB_NAV = [
  { key: "list", label: "Stock Items",      icon: <ArrowUpCircle size={15} strokeWidth={1.8} /> },
  { key: "add",  label: "Add Stock Items",  icon: <Plus size={15} strokeWidth={2} /> },
];

export default function PartsOSPage() {
  const [view, setView] = useState("add");
  const [form, setForm] = useState({
    name: "", supplier_id: "", barcode: "", serial_number: "",
    qty_in_stock: "", min_threshold: "", cost_price: "", sale_price: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ModuleLayout title="Outsourced — Stock Items" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
      {view === "list" && <PartsList />}
      {view === "add" && (
        <div style={s.form}>
          <h3 style={s.title}>New Outsourced Stock Item</h3>

          <Field label="Name*"           value={form.name}          onChange={(v) => set("name", v)} />

          <div style={s.field}>
            <label style={s.label}>Supplier*</label>
            <select value={form.supplier_id} onChange={(e) => set("supplier_id", e.target.value)} style={s.input}>
              <option value="">Choose an option...</option>
            </select>
          </div>

          <Field label="Barcode Number"  value={form.barcode}       onChange={(v) => set("barcode", v)} />
          <Field label="Serial Number"   value={form.serial_number} onChange={(v) => set("serial_number", v)} />
          <Field label="Amount In Stock*" type="number" value={form.qty_in_stock} onChange={(v) => set("qty_in_stock", v)} />
          <Field label="Minimum Threshold Amount" type="number" value={form.min_threshold} onChange={(v) => set("min_threshold", v)} />
          <Field label="Cost Price"      type="number" value={form.cost_price}  onChange={(v) => set("cost_price", v)} />
          <Field label="Sale Price"      type="number" value={form.sale_price}  onChange={(v) => set("sale_price", v)} />

          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <button style={s.saveBtn}>Save</button>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}

function PartsList() {
  return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No outsourced parts yet.</p>;
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
  form: { display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 },
  title: { fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input: { height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none" },
  saveBtn: { height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
