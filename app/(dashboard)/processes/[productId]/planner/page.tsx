"use client";

import { use, useEffect, useState } from "react";
import { FlowCanvas }        from "@/components/manufacturing/FlowCanvas";
import { ResourceLibrary }   from "@/components/manufacturing/ResourceLibrary";
import { CostPanel }         from "@/components/manufacturing/CostPanel";
import { StationModal }      from "@/components/manufacturing/StationModal";
import { AddStationDialog }  from "@/components/manufacturing/AddStationDialog";
import { SaveProcessDialog } from "@/components/manufacturing/SaveProcessDialog";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import { Plus, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

/* ── Demo data (replaced by Supabase later) ─────────────────────────── */
const DEMO = {
  stations: [
    { id: "s1", name: "Prep Station",    childWorkflows: [], wagePerHour: 65, tools: [] },
    { id: "s2", name: "Assembly",        childWorkflows: [], wagePerHour: 75, tools: [] },
    { id: "s3", name: "Quality Control", childWorkflows: [], wagePerHour: 85, tools: [] },
    { id: "s4", name: "Finishing",       childWorkflows: [], wagePerHour: 70, tools: [] },
  ],
  tasks: [
    { id: "t1", name: "Cut & Prep Materials",  duration: 45,  optionSet: "machine" as const },
    { id: "t2", name: "Frame Assembly",        duration: 120, optionSet: "human"   as const },
    { id: "t3", name: "Wiring & Electronics",  duration: 90,  optionSet: "human"   as const },
    { id: "t4", name: "QC Inspection",         duration: 30,  optionSet: "human"   as const },
    { id: "t5", name: "Paint & Polish",        duration: 60,  optionSet: "machine" as const },
  ],
  workflows: [
    { id: "w1", name: "Core Build",   taskIds: ["t1", "t2"] },
    { id: "w2", name: "Final Finish", taskIds: ["t4", "t5"] },
  ],
  /* ── Resources from other modules ── */
  staffResources: [
    { id: "st1", name: "Jane Smith",          wagePerHour: 85 },
    { id: "st2", name: "Tom Ndlovu",          wagePerHour: 65 },
    { id: "st3", name: "Damien De Villiers",  wagePerHour: 95 },
  ],
  partResources: [
    { id: "p1", name: "Compression Latch",  unitCost: 100,  type: "OS" as const },
    { id: "p2", name: "M5 Washer (Small)",  unitCost: 10,   type: "OS" as const },
    { id: "p3", name: "M5 Locknut",         unitCost: 10,   type: "OS" as const },
    { id: "p4", name: "E3 Fridge Door",     unitCost: 1206, type: "IM" as const },
  ],
  toolResources: [
    { id: "tl1", name: "MIG Welder",   costPerHour: 50 },
    { id: "tl2", name: "Drill Press",  costPerHour: 30 },
    { id: "tl3", name: "Paint Booth",  costPerHour: 80 },
  ],
};

/* ── Page ───────────────────────────────────────────────────────────── */
export default function PlannerPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const [showStationModal, setShowStationModal] = useState(false);
  const [showAddStation,   setShowAddStation]   = useState(false);
  const [showSaveDialog,   setShowSaveDialog]   = useState(false);

  const {
    setData, setSelectedProduct,
    selectedNodeId, setSelectedNode,
    stationNodes,
  } = useManufacturingStore();

  useEffect(() => {
    setData(DEMO);
    setSelectedProduct({
      id: productId, name: "Product",
      baseTasks: ["t1", "t2", "t3", "t4", "t5"],
      options: [],
    });
  }, [productId, setData, setSelectedProduct]);

  useEffect(() => {
    if (selectedNodeId) setShowStationModal(true);
  }, [selectedNodeId]);

  return (
    <div style={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <Link href="/processes" style={s.back}>
            <ArrowLeft size={15} strokeWidth={2} /> Processes
          </Link>
          <h2 style={s.headerTitle}>Production Planner</h2>
        </div>
        <div style={s.headerActions}>
          <button onClick={() => setShowAddStation(true)} style={s.outlineBtn}>
            <Plus size={14} strokeWidth={2} /> Add Station
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={stationNodes.length === 0}
            style={{ ...s.solidBtn, opacity: stationNodes.length === 0 ? 0.5 : 1 }}
          >
            <Save size={14} strokeWidth={2} /> Save Process
          </button>
        </div>
      </div>

      {/* ── 3-column canvas area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
        <ResourceLibrary />

        {/* Centre canvas */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <FlowCanvas />
        </div>

        <CostPanel />
      </div>

      {/* ── Dialogs ── */}
      <StationModal
        open={showStationModal}
        onOpenChange={(o) => { setShowStationModal(o); if (!o) setSelectedNode(null); }}
      />
      <AddStationDialog open={showAddStation} onOpenChange={setShowAddStation} />
      <SaveProcessDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={(name) => console.log("Saved:", name)}
      />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0 0 14px", flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 16 },
  back: {
    display: "flex", alignItems: "center", gap: 6,
    color: "var(--accent)", textDecoration: "none", fontSize: 13, fontWeight: 500,
  },
  headerTitle: { fontSize: 18, fontWeight: 700, color: "var(--text-primary)" },
  headerActions: { display: "flex", gap: 8 },
  outlineBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "0 14px", height: 34,
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    background: "var(--surface)", cursor: "pointer", fontSize: 13, fontWeight: 500,
    color: "var(--text-primary)",
  },
  solidBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "0 14px", height: 34,
    backgroundColor: "var(--btn-primary)", color: "#fff", border: "none",
    borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 13, fontWeight: 600,
  },
};
