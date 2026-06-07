"use client";

import { useState } from "react";
import { LayoutGrid, Plus } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";

const SUB_NAV = [
  { key: "list", label: "Stations", icon: <LayoutGrid size={15} strokeWidth={1.8} /> },
  { key: "add",  label: "Add Station", icon: <Plus size={15} strokeWidth={2} /> },
];

interface WorkflowRow { productLabel: string; workflowId: string; }

export default function StationsPage() {
  const [view, setView] = useState("add");
  const [name, setName] = useState("Station 13");
  const [image, setImage] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([
    { productLabel: "Ingane - 1.0", workflowId: "" },
    { productLabel: "Alublack Trey - 1.0", workflowId: "" },
  ]);

  const updateWorkflow = (i: number, workflowId: string) =>
    setWorkflows((w) => w.map((r, idx) => (idx === i ? { ...r, workflowId } : r)));

  return (
    <ModuleLayout title="Stations" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
      {view === "list" && <StationList />}
      {view === "add" && (
        <div style={s.grid}>
          <div style={s.left}>
            <h3 style={s.title}>Add New Station</h3>

            <div style={s.field}>
              <label style={s.label}>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} style={s.input} />
            </div>

            <div style={s.field}>
              <label style={s.label}>Staff</label>
              <div style={s.row}>
                <select style={s.select}><option value="">Choose an option...</option></select>
                <PlusBtn />
              </div>
            </div>

            <div style={s.wageDisplay}>
              <span style={s.wageLabel}>Station Wage/Hour:</span>
            </div>

            <div style={s.field}>
              <label style={s.label}>Tools</label>
              <div style={s.row}>
                <select style={s.select}><option value="">Choose an option...</option></select>
                <PlusBtn />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <h4 style={s.sectionLabel}>Workflows per Product</h4>
              {workflows.map((w, i) => (
                <div key={i} style={{ ...s.row, marginBottom: 8 }}>
                  <input readOnly value={w.productLabel} style={{ ...s.input, width: 180 }} />
                  <select value={w.workflowId} onChange={(e) => updateWorkflow(i, e.target.value)}
                    style={s.select}>
                    <option value="">Choose Workflow...</option>
                  </select>
                  <PlusBtn />
                </div>
              ))}
            </div>
          </div>

          <div style={s.right}>
            <label style={s.label}>Image</label>
            <div style={s.imageBox}>
              {image
                ? <img src={image} alt="station" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "var(--radius-md)" }} />
                : <span style={s.imagePlaceholder}>Upload An Image Of Your Station</span>
              }
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <SaveBtn />
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}

function StationList() {
  return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No stations yet. Add one to get started.</p>;
}

function PlusBtn() {
  return (
    <button style={{
      width: 32, height: 32, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)",
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      background: "var(--surface)", flexShrink: 0,
    }}>
      <Plus size={14} strokeWidth={2} color="var(--text-secondary)" />
    </button>
  );
}

function SaveBtn() {
  return (
    <button style={{
      height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "#fff",
      border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600, cursor: "pointer",
    }}>Save</button>
  );
}

const s: Record<string, React.CSSProperties> = {
  grid: { display: "grid", gridTemplateColumns: "1fr 280px", gap: 32 },
  left: { display: "flex", flexDirection: "column", gap: 16 },
  right: { display: "flex", flexDirection: "column", gap: 12 },
  title: { fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  sectionLabel: { fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 },
  input: { height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none" },
  select: { flex: 1, height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none" },
  row: { display: "flex", gap: 8, alignItems: "center" },
  wageDisplay: { borderBottom: "1px solid var(--border)", paddingBottom: 8 },
  wageLabel: { fontSize: 13, fontStyle: "italic", color: "var(--text-secondary)" },
  imageBox: { flex: 1, minHeight: 200, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg)", cursor: "pointer" },
  imagePlaceholder: { fontSize: 13, color: "var(--text-secondary)", textAlign: "center", padding: 16 },
};
