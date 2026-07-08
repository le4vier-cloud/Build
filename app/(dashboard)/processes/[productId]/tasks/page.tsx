"use client";

import { use, useEffect, useState } from "react";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import {
  ArrowLeft, Plus, X, Clock, Cpu, User2,
  Workflow, BarChart3, Pencil,
} from "lucide-react";
import Link from "next/link";

/* ── Demo data ────────────────────────────────────────────────────────── */
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
  staffResources:  [
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

/* ── Types ─────────────────────────────────────────────────────────────── */
type PanelState =
  | { mode: "new-workflow" }
  | { mode: "edit-workflow"; wfId: string; name: string }
  | { mode: "new-task"; targetWfId: string }
  | { mode: "edit-task"; taskId: string; name: string; duration: string; optionSet: "human" | "machine" }
  | null;

const fmtMin = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
};

/* ── Slide-out panel ───────────────────────────────────────────────────── */
function SlidePanel({ panel, onClose, onSave }: {
  panel: PanelState;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [name,     setName]     = useState("");
  const [duration, setDuration] = useState("");
  const [taskType, setTaskType] = useState<"human" | "machine">("human");

  useEffect(() => {
    if (!panel) return;
    if (panel.mode === "edit-workflow") {
      setName(panel.name);
    } else if (panel.mode === "edit-task") {
      setName(panel.name);
      setDuration(panel.duration);
      setTaskType(panel.optionSet);
    } else {
      setName(""); setDuration(""); setTaskType("human");
    }
  }, [panel]);

  const isOpen     = panel !== null;
  const isWorkflow = panel?.mode === "new-workflow" || panel?.mode === "edit-workflow";
  const isEdit     = panel?.mode?.startsWith("edit");

  const title =
    panel?.mode === "new-workflow" ? "New Workflow"
    : panel?.mode === "edit-workflow" ? "Edit Workflow"
    : panel?.mode === "new-task"     ? "New Task"
    : panel?.mode === "edit-task"    ? "Edit Task"
    : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isWorkflow) {
      onSave({ name: name.trim() });
    } else {
      const dur = parseInt(duration, 10);
      if (isNaN(dur) || dur <= 0) return;
      onSave({ name: name.trim(), duration: dur, optionSet: taskType });
    }
  };

  return (
    <>
      {/* Transparent backdrop to close on outside click */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 49,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      />
      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh",
        width: 320, zIndex: 50,
        backgroundColor: "var(--bg)",
        borderLeft: "1px solid var(--border)",
        boxShadow: isOpen ? "-8px 0 32px rgba(0,0,0,0.1)" : "none",
        transform: `translateX(${isOpen ? 0 : 320}px)`,
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
        pointerEvents: isOpen ? "auto" : "none",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 20px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            {title}
          </h3>
          <button onClick={onClose} style={sp.iconBtn}><X size={14} /></button>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
          <div style={sp.fieldWrap}>
            <label style={sp.label}>Name *</label>
            <input
              style={sp.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isWorkflow ? "e.g. Core Build" : "e.g. Weld Frame"}
              autoFocus
            />
          </div>
          {!isWorkflow && (
            <>
              <div style={sp.fieldWrap}>
                <label style={sp.label}>Duration (minutes) *</label>
                <input
                  style={sp.input}
                  type="number" min="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 45"
                />
              </div>
              <div style={sp.fieldWrap}>
                <label style={sp.label}>Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button"
                    onClick={() => setTaskType("human")}
                    style={{ ...sp.typeBtn, ...(taskType === "human" ? sp.typeBtnHuman : {}) }}>
                    <User2 size={13} /> Human
                  </button>
                  <button type="button"
                    onClick={() => setTaskType("machine")}
                    style={{ ...sp.typeBtn, ...(taskType === "machine" ? sp.typeBtnMachine : {}) }}>
                    <Cpu size={13} /> Machine
                  </button>
                </div>
              </div>
            </>
          )}
          <div style={{ marginTop: "auto", display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="submit" style={{ ...sp.primaryBtn, flex: 1 }}>
              {isEdit ? "Save changes" : "Create"}
            </button>
            <button type="button" onClick={onClose} style={sp.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function TasksPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const [panel, setPanel] = useState<PanelState>(null);

  const {
    setData, setSelectedProduct,
    tasks, workflows,
    updateTask,
    addWorkflow, removeWorkflow,
    removeTaskFromWorkflow,
  } = useManufacturingStore();

  useEffect(() => {
    const state = useManufacturingStore.getState();
    if (state.tasks.length === 0) {
      setData(DEMO);
      setSelectedProduct({
        id: productId, name: "Product",
        baseTasks: DEMO.tasks.map((t) => t.id),
        options: [],
      });
    }
  }, [productId, setData, setSelectedProduct]);

  const closePanel = () => setPanel(null);

  const handleSave = (data: Record<string, unknown>) => {
    if (!panel) return;
    switch (panel.mode) {
      case "new-workflow":
        addWorkflow({ name: data.name as string, taskIds: [] });
        break;
      case "edit-workflow":
        useManufacturingStore.setState((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === panel.wfId ? { ...w, name: data.name as string } : w
          ),
        }));
        break;
      case "new-task":
        useManufacturingStore.setState((state) => {
          const newId = `t-${Date.now()}`;
          return {
            tasks: [...state.tasks, {
              id: newId,
              name: data.name as string,
              duration: data.duration as number,
              optionSet: data.optionSet as "human" | "machine",
            }],
            workflows: state.workflows.map((w) =>
              w.id === panel.targetWfId ? { ...w, taskIds: [...w.taskIds, newId] } : w
            ),
          };
        });
        break;
      case "edit-task":
        updateTask(panel.taskId, {
          name: data.name as string,
          duration: data.duration as number,
          optionSet: data.optionSet as "human" | "machine",
        });
        break;
    }
    closePanel();
  };

  const totalTime = tasks.reduce((sum, t) => sum + t.duration, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "calc(100vh - 100px)" }}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/processes" style={s.back}>
            <ArrowLeft size={15} strokeWidth={2} /> Processes
          </Link>
          <h2 style={s.title}>Task Manager</h2>
          <Link
            href={`/processes/${productId}/planner`}
            style={{ ...s.back, color: "var(--text-secondary)", fontSize: 12 }}
          >
            <BarChart3 size={13} /> Production Planner
          </Link>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={s.pill}>
            <Clock size={11} color="var(--text-secondary)" />
            <span>{fmtMin(totalTime)} total</span>
          </div>
          <div style={s.pill}>
            <Workflow size={11} color="var(--text-secondary)" />
            <span>{workflows.length} workflows</span>
          </div>
        </div>
      </div>

      {/* ── Section intro ── */}
      <div style={{ flexShrink: 0, marginBottom: 16 }}>
        <h3 style={s.sectionTitle}>Workflows</h3>
        <p style={s.sectionSub}>
          Group tasks into workflows. Drag a workflow onto a station node in the Planner to assign all its tasks at once.
        </p>
      </div>

      {/* ── Workflow list ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {workflows.map((wf) => {
            const wfTasks = tasks.filter((t) => wf.taskIds.includes(t.id));
            const wfTime  = wfTasks.reduce((sum, t) => sum + t.duration, 0);
            return (
              <div key={wf.id} style={s.wfCard}>

                {/* Workflow header */}
                <div style={s.wfHead}>
                  <Workflow size={15} color="#F56300" />
                  <span style={s.wfName}>{wf.name}</span>
                  <span style={s.wfMeta}>{wfTasks.length} tasks · {fmtMin(wfTime)}</span>
                  <div style={{ flex: 1 }} />
                  <button
                    style={s.iconBtn}
                    title="Edit workflow"
                    onClick={() => setPanel({ mode: "edit-workflow", wfId: wf.id, name: wf.name })}
                  >
                    <Pencil size={12} />
                  </button>
                  <button style={s.iconBtn} title="Remove workflow" onClick={() => removeWorkflow(wf.id)}>
                    <X size={13} />
                  </button>
                </div>

                {/* Task list */}
                <div style={s.wfBody}>
                  {wfTasks.map((t, idx) => (
                    <div key={t.id} style={s.taskRow}>
                      <span style={s.taskIdx}>{idx + 1}</span>
                      <span style={s.taskName}>{t.name}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "2px 6px", flexShrink: 0,
                        backgroundColor: t.optionSet === "machine" ? "rgba(37,99,235,0.12)" : "rgba(5,150,105,0.12)",
                        color: t.optionSet === "machine" ? "#2563EB" : "#059669",
                      }}>
                        {t.optionSet}
                      </span>
                      <span style={s.taskDur}>{fmtMin(t.duration)}</span>
                      <button
                        style={s.iconBtn}
                        title="Edit task"
                        onClick={() => setPanel({
                          mode: "edit-task",
                          taskId: t.id,
                          name: t.name,
                          duration: String(t.duration),
                          optionSet: t.optionSet,
                        })}
                      >
                        <Pencil size={11} />
                      </button>
                      <button style={s.iconBtn} title="Remove task" onClick={() => removeTaskFromWorkflow(wf.id, t.id)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Add task skeleton */}
                  <button
                    style={s.addTaskSkeleton}
                    onClick={() => setPanel({ mode: "new-task", targetWfId: wf.id })}
                  >
                    <Plus size={13} strokeWidth={2} /> Add task
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add workflow skeleton */}
          <button style={s.addWfSkeleton} onClick={() => setPanel({ mode: "new-workflow" })}>
            <Plus size={14} strokeWidth={2} /> Add Workflow
          </button>

        </div>
      </div>

      {/* ── Slide-out panel ── */}
      <SlidePanel panel={panel} onClose={closePanel} onSave={handleSave} />
    </div>
  );
}

/* ── Page styles ────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0 0 14px", flexShrink: 0,
  },
  back: {
    display: "flex", alignItems: "center", gap: 6,
    color: "var(--accent)", textDecoration: "none", fontSize: 13, fontWeight: 500,
  },
  title: { fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" },
  pill: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "4px 10px", backgroundColor: "var(--bg)",
    border: "1px solid var(--border)", borderRadius: 999,
    fontSize: 12, color: "var(--text-secondary)", fontWeight: 500,
  },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "var(--text-primary)" },
  sectionSub: { fontSize: 12, color: "var(--text-secondary)", marginTop: 3, maxWidth: 480 },
  iconBtn: {
    background: "none", border: "none", cursor: "pointer", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--text-tertiary)", padding: 4, borderRadius: 4,
  },
  /* Workflow card */
  wfCard: {
    backgroundColor: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 12, overflow: "hidden",
  },
  wfHead: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 16px",
  },
  wfName: { fontSize: 14, fontWeight: 700, color: "var(--text-primary)" },
  wfMeta: { fontSize: 12, color: "var(--text-secondary)" },
  /* Task rows */
  wfBody: {
    padding: "0 16px 12px",
    display: "flex", flexDirection: "column", gap: 0,
    borderTop: "1px solid var(--border)",
  },
  taskRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 0",
    borderBottom: "1px solid var(--border)",
  },
  taskIdx: {
    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
    border: "1px solid var(--border)",
    backgroundColor: "var(--surface)", color: "var(--text-secondary)",
    fontSize: 10, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  taskName: { flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 },
  taskDur: { fontSize: 11, color: "var(--text-tertiary)", width: 40, textAlign: "right", flexShrink: 0 },
  /* Skeleton add buttons */
  addTaskSkeleton: {
    width: "100%", height: 36, marginTop: 8,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    border: "1.5px dashed var(--border)", borderRadius: 8,
    background: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)",
  },
  addWfSkeleton: {
    width: "100%", height: 52,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    border: "2px dashed var(--border)", borderRadius: 12,
    background: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 500, color: "var(--text-tertiary)",
  },
};

/* ── Panel styles ───────────────────────────────────────────────────────── */
const sp: Record<string, React.CSSProperties> = {
  iconBtn: {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--text-secondary)", padding: 6, borderRadius: 6,
  },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input: {
    height: 38, border: "1px solid var(--input-border)", borderRadius: 8,
    padding: "0 12px", fontSize: 14, color: "var(--text-primary)",
    backgroundColor: "var(--surface)", outline: "none",
    width: "100%", boxSizing: "border-box",
  },
  typeBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "0 14px", height: 36, flex: 1,
    backgroundColor: "var(--bg)", border: "1px solid var(--input-border)",
    borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
    color: "var(--text-secondary)",
  },
  typeBtnHuman:   { backgroundColor: "rgba(5,150,105,0.1)",  borderColor: "#059669", color: "#059669" },
  typeBtnMachine: { backgroundColor: "rgba(37,99,235,0.1)",  borderColor: "#2563EB", color: "#2563EB" },
  primaryBtn: {
    height: 40, padding: "0 20px",
    backgroundColor: "var(--btn-primary)", color: "#fff",
    border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  cancelBtn: {
    height: 40, padding: "0 14px",
    backgroundColor: "var(--bg)", border: "1px solid var(--input-border)",
    borderRadius: 8, cursor: "pointer",
    fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
  },
};
