"use client";

import { useState } from "react";
import { ShoppingBag, SlidersHorizontal, CalendarDays, Plus } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";
import { RightPanel } from "@/components/ui/right-panel";

const SUB_NAV = [
  { key: "list",    label: "Products", icon: <ShoppingBag       size={15} strokeWidth={1.8} /> },
  { key: "options", label: "Options",  icon: <SlidersHorizontal size={15} strokeWidth={1.8} /> },
  { key: "events",  label: "Events",   icon: <CalendarDays      size={15} strokeWidth={1.8} /> },
];

export default function ProductsPage() {
  const [view, setView]           = useState("list");
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState({ name: "", model: "", description: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function handleSave() {
    setPanelOpen(false);
    setForm({ name: "", model: "", description: "" });
  }

  return (
    <>
      <ModuleLayout title="Products" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
        {view === "list"    && <ProductList onAdd={() => setPanelOpen(true)} />}
        {view === "options" && <OptionsView />}
        {view === "events"  && <EventsView />}
      </ModuleLayout>

      <RightPanel open={panelOpen} onClose={() => setPanelOpen(false)} title="New Product">
        <div style={s.form}>
          <div style={s.imageUpload}>
            <span style={s.imageText}>Click to upload an image</span>
          </div>
          <Field label="Product Name *" value={form.name} onChange={(v) => set("name", v)} />
          <Field label="Model"          value={form.model} onChange={(v) => set("model", v)} />
          <div style={s.field}>
            <label style={s.label}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Type here..."
              rows={4}
              style={s.textarea}
            />
          </div>
          <button onClick={handleSave} style={s.saveBtn}>Save</button>
        </div>
      </RightPanel>
    </>
  );
}

function ProductList({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No products yet.</p>
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
        <Plus size={15} /> Add Product
      </button>
    </div>
  );
}

function OptionsView() {
  return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Product options will appear here.</p>;
}
function EventsView() {
  return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Product events will appear here.</p>;
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
  form:        { display: "flex", flexDirection: "column", gap: 20 },
  imageUpload: { width: 120, height: 120, border: "1px dashed var(--input-border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backgroundColor: "var(--bg)" },
  imageText:   { fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" as const, padding: 8 },
  field:       { display: "flex", flexDirection: "column", gap: 6 },
  label:       { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input:       { height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none", width: "100%", boxSizing: "border-box" as const },
  textarea:    { border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none", resize: "vertical" as const, fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const },
  saveBtn:     { height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8 },
};
