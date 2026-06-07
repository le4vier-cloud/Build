"use client";

import { use } from "react";
import { useState, useEffect } from "react";
import { FlowCanvas } from "@/components/manufacturing/FlowCanvas";
import { TaskSidebar } from "@/components/manufacturing/TaskSidebar";
import { StationModal } from "@/components/manufacturing/StationModal";
import { AddStationDialog } from "@/components/manufacturing/AddStationDialog";
import { SaveProcessDialog } from "@/components/manufacturing/SaveProcessDialog";
import { TimingDisplay } from "@/components/manufacturing/TimingDisplay";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import { Plus, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

const DEMO_DATA = {
  stations: [
    { id: "s1", name: "Prep Station",    childWorkflows: [],   wagePerHour: 65, tools: [] },
    { id: "s2", name: "Assembly",        childWorkflows: [],   wagePerHour: 75, tools: [] },
    { id: "s3", name: "Quality Control", childWorkflows: [],   wagePerHour: 85, tools: [] },
    { id: "s4", name: "Finishing",       childWorkflows: [],   wagePerHour: 70, tools: [] },
  ],
  tasks: [
    { id: "t1", name: "Cut & Prep Materials",  duration: 45, optionSet: "machine" as const },
    { id: "t2", name: "Frame Assembly",        duration: 120, optionSet: "human" as const },
    { id: "t3", name: "Wiring & Electronics",  duration: 90, optionSet: "human" as const },
    { id: "t4", name: "QC Inspection",         duration: 30, optionSet: "human" as const },
    { id: "t5", name: "Paint & Polish",        duration: 60, optionSet: "machine" as const },
  ],
  workflows: [
    { id: "w1", name: "Core Build",   taskIds: ["t1", "t2"] },
    { id: "w2", name: "Final Finish", taskIds: ["t4", "t5"] },
  ],
};

export default function PlannerPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const [showStationModal, setShowStationModal] = useState(false);
  const [showAddStation, setShowAddStation] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const { setData, setSelectedProduct, selectedNodeId, setSelectedNode,
    assignTaskToStation, assignWorkflowToStation, stationNodes } = useManufacturingStore();

  useEffect(() => {
    setData(DEMO_DATA);
    setSelectedProduct({
      id: productId, name: "Product", baseTasks: ["t1","t2","t3","t4","t5"], options: [],
    });
  }, [productId, setData, setSelectedProduct]);

  useEffect(() => {
    if (selectedNodeId) setShowStationModal(true);
  }, [selectedNodeId]);

  return (
    <div style={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <Link href="/processes" style={s.back}>
            <ArrowLeft size={16} strokeWidth={2} /> Processes
          </Link>
          <h2 style={s.headerTitle}>Production Planner</h2>
        </div>
        <div style={s.headerActions}>
          <button onClick={() => setShowAddStation(true)} style={s.outlineBtn}>
            <Plus size={15} strokeWidth={2} /> Add Station
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={stationNodes.length === 0}
            style={{ ...s.solidBtn, opacity: stationNodes.length === 0 ? 0.5 : 1 }}
          >
            <Save size={15} strokeWidth={2} /> Save Process
          </button>
        </div>
      </div>

      <div style={s.timing}>
        <TimingDisplay />
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <TaskSidebar />
        <div style={{ flex: 1, padding: 16 }}>
          <FlowCanvas />
        </div>
      </div>

      <StationModal open={showStationModal} onOpenChange={(o) => { setShowStationModal(o); if (!o) setSelectedNode(null); }} />
      <AddStationDialog open={showAddStation} onOpenChange={setShowAddStation} />
      <SaveProcessDialog open={showSaveDialog} onOpenChange={setShowSaveDialog} onSave={(name) => console.log("Saved:", name)} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 0 16px", flexShrink: 0 },
  headerLeft: { display: "flex", alignItems: "center", gap: 16 },
  back: { display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", textDecoration: "none", fontSize: 14, fontWeight: 500 },
  headerTitle: { fontSize: 20, fontWeight: 700, color: "var(--text-primary)" },
  headerActions: { display: "flex", gap: 10 },
  outlineBtn: { display: "flex", alignItems: "center", gap: 6, padding: "0 16px", height: 36, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  solidBtn: { display: "flex", alignItems: "center", gap: 6, padding: "0 16px", height: 36, backgroundColor: "var(--btn-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  timing: { backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 16px", marginBottom: 12, flexShrink: 0 },
};
