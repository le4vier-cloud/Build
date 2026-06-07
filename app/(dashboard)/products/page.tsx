"use client";

import { useState } from "react";
import { ShoppingBag, Plus, SlidersHorizontal, CalendarDays } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";

const SUB_NAV = [
  { key: "list",    label: "Products",     icon: <ShoppingBag size={15} strokeWidth={1.8} /> },
  { key: "add",     label: "Add Products", icon: <Plus size={15} strokeWidth={2} /> },
  { key: "options", label: "Options",      icon: <SlidersHorizontal size={15} strokeWidth={1.8} /> },
  { key: "events",  label: "Events",       icon: <CalendarDays size={15} strokeWidth={1.8} /> },
];

export default function ProductsPage() {
  const [view, setView] = useState("add");
  const [form, setForm] = useState({ name: "", model: "", description: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ModuleLayout title="Products" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
      {view === "list" && <ProductList />}
      {view === "add" && (
        <div style={s.form}>
          <h3 style={s.title}>New Product</h3>

          <div style={s.imageUpload}>
            <span style={s.imageText}>Click to upload an image</span>
          </div>

          <Field label="New Product Name*" value={form.name} onChange={(v) => set("name", v)} />
          <Field label="New Product Model" value={form.model} onChange={(v) => set("model", v)} />

          <div style={s.field}>
            <label style={s.label}>New Product Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Type here..."
              rows={4}
              style={s.textarea}
            />
          </div>

          <SaveBtn />
        </div>
      )}
      {view === "options" && <OptionsView />}
      {view === "events"  && <EventsView />}
    </ModuleLayout>
  );
}

function ProductList() {
  return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No products yet.</p>;
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

function SaveBtn() {
  return (
    <div style={{ marginTop: 8 }}>
      <button style={s.saveBtn}>Save</button>
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
  textarea: { border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none", resize: "vertical", fontFamily: "inherit" },
  saveBtn: { height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
