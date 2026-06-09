"use client";

import { use, useEffect, useState } from "react";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import {
  ArrowLeft, Plus, X, Clock, Cpu, User2,
  ChevronDown, ChevronRight, Workflow, BarChart3,
} from "lucide-react";
import Link from "next/link";

/* ── Demo data (same as planner page — store singleton preserves if navigating) ─ */
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

type Tab = "tasks" | "workflows";

const fmtMin = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;
};

/* ── Page ─────────────────────────────────────────── */
export default function TasksPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const [tab, setTab] = useState<Tab>("tasks");

  const {
    setData, setSelectedProduct,
    tasks, workflows,
    addTask, removeTask,
    addWorkflow, removeWorkflow,
    addTaskToWorkflow, removeTaskFromWorkflow,
  } = useManufacturingStore();

  /* Load demo data — store singleton means data persists if navigating from planner */
  useEffect(() => {
    const state = useManufacturingStore.getState();
    if (state.tasks.length === 0) {
      setData(DEMO);
      setSelectedProduct({ id: productId, name: "Product", baseTasks: DEMO.tasks.map((t) => t.id), options: [] });
    }
  }, [productId, setData, setSelectedProduct]);

  /* ── New task form ── */
  const [newTaskName,     setNewTaskName]     = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState("");
  const [newTaskType,     setNewTaskType]     = useState<"human" | "machine">("human");
  const [showTaskForm,    setShowTaskForm]    = useState(false);

  const submitTask = (e: React.FormEvent) => {
    e.preventDefault();
    const dur = parseInt(newTaskDuration, 10);
    if (!newTaskName.trim() || isNaN(dur) || dur <= 0) return;
    addTask({ name: newTaskName.trim(), duration: dur, optionSet: newTaskType });
    setNewTaskName(""); setNewTaskDuration(""); setNewTaskType("human");
    setShowTaskForm(false);
  };

  /* ── New workflow form ── */
  const [newWfName,    setNewWfName]    = useState("");
  const [showWfForm,   setShowWfForm]   = useState(false);
  const [expandedWfs,  setExpandedWfs]  = useState<Set<string>>(new Set());
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);

  const submitWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWfName.trim()) return;
    addWorkflow({ name: newWfName.trim(), taskIds: [] });
    setNewWfName(""); setShowWfForm(false);
  };

  const toggleExpand = (id: string) => {
    const s = new Set(expandedWfs);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedWfs(s);
  };

  /* Tasks not yet in any workflow */
  const unassignedTasks = tasks.filter(
    (t) => !workflows.some((w) => w.taskIds.includes(t.id))
  );

  const totalTaskTime = tasks.reduce((s, t) => s + t.duration, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "calc(100vh - 100px)" }}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/processes" style={s.back}>
            <ArrowLeft size={15} strokeWidth={2} /> Processes
          </Link>
          <h2 style={s.title}>Task Manager</h2>
          <Link href={`/processes/${productId}/planner`} style={{ ...s.back, color: "var(--text-secondary)", fontSize: 12 }}>
            <BarChart3 size={13} /> Production Planner
          </Link>
        </div>
        {/* Summary pills */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={s.pill}>
            <Clock size={11} color="#8E8E93" />
            <span>{fmtMin(totalTaskTime)} total</span>
          </div>
          <div style={s.pill}>
            <Workflow size={11} color="#8E8E93" />
            <span>{workflows.length} workflows</span>
          </div>
          <div style={s.pill}>
            <Clock size={11} color="#8E8E93" />
            <span>{tasks.length} tasks</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={s.tabBar}>
        {(["tasks", "workflows"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...s.tabBtn, ...(tab === t ? s.tabActive : {}) }}>
            {t === "tasks" ? <Clock size={13} /> : <Workflow size={13} />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "tasks" && tasks.length > 0 && (
              <span style={s.countBadge}>{tasks.length}</span>
            )}
            {t === "workflows" && workflows.length > 0 && (
              <span style={s.countBadge}>{workflows.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ══════════════ TASKS TAB ══════════════ */}
        {tab === "tasks" && (
          <div style={s.content}>
            <div style={s.sectionHeader}>
              <div>
                <h3 style={s.sectionTitle}>Tasks</h3>
                <p style={s.sectionSub}>
                  Define individual operations. Group them into workflows for reuse across stations.
                </p>
              </div>
              <button onClick={() => setShowTaskForm((v) => !v)} style={s.addBtn}>
                <Plus size={14} /> New Task
              </button>
            </div>

            {/* New task inline form */}
            {showTaskForm && (
              <form onSubmit={submitTask} style={s.inlineForm}>
                <input
                  style={{ ...s.input, flex: 2 }}
                  placeholder="Task name (e.g. Weld Frame)"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  autoFocus
                />
                <input
                  style={{ ...s.input, width: 100 }}
                  placeholder="Duration (min)"
                  type="number" min="1"
                  value={newTaskDuration}
                  onChange={(e) => setNewTaskDuration(e.target.value)}
                />
                <div style={s.typeToggle}>
                  <button type="button"
                    onClick={() => setNewTaskType("human")}
                    style={{ ...s.typeBtn, ...(newTaskType === "human" ? s.typeBtnActive : {}) }}>
                    <User2 size={12} /> Human
                  </button>
                  <button type="button"
                    onClick={() => setNewTaskType("machine")}
                    style={{ ...s.typeBtn, ...(newTaskType === "machine" ? s.typeBtnActiveMachine : {}) }}>
                    <Cpu size={12} /> Machine
                  </button>
                </div>
                <button type="submit" style={s.submitBtn}>Add Task</button>
                <button type="button" onClick={() => setShowTaskForm(false)} style={s.cancelBtn}>
                  <X size={13} />
                </button>
              </form>
            )}

            {/* Tasks table */}
            {tasks.length === 0 ? (
              <div style={s.emptyState}>
                <Clock size={32} color="#D1D1D6" strokeWidth={1.5} />
                <p style={s.emptyTitle}>No tasks yet</p>
                <p style={s.emptySub}>Create your first task to start planning production</p>
              </div>
            ) : (
              <div style={s.table}>
                {/* Table header */}
                <div style={s.tableHead}>
                  <span style={{ flex: 3 }}>Name</span>
                  <span style={{ width: 90, textAlign: "center" }}>Duration</span>
                  <span style={{ width: 90, textAlign: "center" }}>Type</span>
                  <span style={{ width: 120 }}>Workflow</span>
                  <span style={{ width: 40 }} />
                </div>

                {/* Table rows */}
                {tasks.map((task) => {
                  const wf = workflows.find((w) => w.taskIds.includes(task.id));
                  return (
                    <div key={task.id} style={s.tableRow}>
                      <span style={{ flex: 3, fontSize: 13, fontWeight: 500, color: "#1D1D1F" }}>
                        {task.name}
                      </span>
                      <div style={{ width: 90, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, color: "#6E6E73", fontSize: 12 }}>
                        <Clock size={11} color="#AEAEB2" />
                        {fmtMin(task.duration)}
                      </div>
                      <div style={{ width: 90, display: "flex", justifyContent: "center" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "3px 8px",
                          backgroundColor: task.optionSet === "machine" ? "#EFF6FF" : "#F0FAF3",
                          color: task.optionSet === "machine" ? "#2563EB" : "#059669",
                        }}>
                          {task.optionSet === "machine" ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                              <Cpu size={9} /> machine
                            </span>
                          ) : (
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                              <User2 size={9} /> human
                            </span>
                          )}
                        </span>
                      </div>
                      <div style={{ width: 120 }}>
                        {wf ? (
                          <span style={{ fontSize: 11, color: "#F56300", fontWeight: 600 }}>
                            {wf.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#AEAEB2" }}>—</span>
                        )}
                      </div>
                      <button style={s.rowRemoveBtn} onClick={() => removeTask(task.id)}>
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ WORKFLOWS TAB ══════════════ */}
        {tab === "workflows" && (
          <div style={s.content}>
            <div style={s.sectionHeader}>
              <div>
                <h3 style={s.sectionTitle}>Workflows</h3>
                <p style={s.sectionSub}>
                  Group related tasks into workflows. Drag a workflow onto a station node to assign all its tasks at once.
                </p>
              </div>
              <button onClick={() => setShowWfForm((v) => !v)} style={s.addBtn}>
                <Plus size={14} /> New Workflow
              </button>
            </div>

            {/* New workflow form */}
            {showWfForm && (
              <form onSubmit={submitWorkflow} style={s.inlineForm}>
                <input
                  style={{ ...s.input, flex: 1 }}
                  placeholder="Workflow name (e.g. Core Build)"
                  value={newWfName}
                  onChange={(e) => setNewWfName(e.target.value)}
                  autoFocus
                />
                <button type="submit" style={s.submitBtn}>Create</button>
                <button type="button" onClick={() => setShowWfForm(false)} style={s.cancelBtn}>
                  <X size={13} />
                </button>
              </form>
            )}

            {/* Workflow cards */}
            {workflows.length === 0 ? (
              <div style={s.emptyState}>
                <Workflow size={32} color="#D1D1D6" strokeWidth={1.5} />
                <p style={s.emptyTitle}>No workflows yet</p>
                <p style={s.emptySub}>Create a workflow to group tasks for reuse on stations</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {workflows.map((wf) => {
                  const wfTasks  = tasks.filter((t) => wf.taskIds.includes(t.id));
                  const wfTime   = wfTasks.reduce((s, t) => s + t.duration, 0);
                  const isOpen   = expandedWfs.has(wf.id);
                  const isAdding = addingTaskTo === wf.id;

                  return (
                    <div key={wf.id} style={s.wfCard}>
                      {/* Workflow header */}
                      <div style={s.wfHead}>
                        <button style={s.chevronBtn} onClick={() => toggleExpand(wf.id)}>
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <Workflow size={15} color="#F56300" />
                        <span style={s.wfName}>{wf.name}</span>
                        <span style={s.wfMeta}>{wfTasks.length} tasks · {fmtMin(wfTime)}</span>
                        <div style={{ flex: 1 }} />
                        <button
                          style={s.wfAddTaskBtn}
                          onClick={() => setAddingTaskTo(isAdding ? null : wf.id)}
                        >
                          <Plus size={12} /> Add task
                        </button>
                        <button style={s.rowRemoveBtn} onClick={() => removeWorkflow(wf.id)}>
                          <X size={13} />
                        </button>
                      </div>

                      {/* Add task picker */}
                      {isAdding && (
                        <div style={s.addTaskPicker}>
                          <p style={{ fontSize: 11, color: "#8E8E93", fontWeight: 600, marginBottom: 6 }}>
                            SELECT TASK TO ADD
                          </p>
                          {unassignedTasks.length === 0 ? (
                            <p style={{ fontSize: 12, color: "#AEAEB2" }}>
                              All tasks are already assigned to a workflow. Create new tasks in the Tasks tab.
                            </p>
                          ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {unassignedTasks.map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => {
                                    addTaskToWorkflow(wf.id, t.id);
                                    setAddingTaskTo(null);
                                  }}
                                  style={s.taskPickChip}
                                >
                                  {t.name}
                                  <span style={{ color: "#8E8E93", fontSize: 10 }}>
                                    {fmtMin(t.duration)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Task list (expanded) */}
                      {isOpen && (
                        <div style={s.wfTaskList}>
                          {wfTasks.length === 0 && (
                            <p style={{ fontSize: 12, color: "#AEAEB2", padding: "4px 0" }}>
                              No tasks yet — click "+ Add task" to add some.
                            </p>
                          )}
                          {wfTasks.map((t, idx) => (
                            <div key={t.id} style={s.wfTaskRow}>
                              <span style={s.wfTaskIdx}>{idx + 1}</span>
                              <span style={{ flex: 1, fontSize: 13, color: "#1D1D1F", fontWeight: 500 }}>
                                {t.name}
                              </span>
                              <span style={{
                                fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "2px 6px",
                                backgroundColor: t.optionSet === "machine" ? "#EFF6FF" : "#F0FAF3",
                                color: t.optionSet === "machine" ? "#2563EB" : "#059669",
                              }}>
                                {t.optionSet}
                              </span>
                              <span style={{ fontSize: 11, color: "#8E8E93", width: 48, textAlign: "right" }}>
                                {fmtMin(t.duration)}
                              </span>
                              <button
                                style={s.rowRemoveBtn}
                                onClick={() => removeTaskFromWorkflow(wf.id, t.id)}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0 0 14px", flexShrink: 0,
  },
  back: {
    display: "flex", alignItems: "center", gap: 6,
    color: "var(--accent)", textDecoration: "none", fontSize: 13, fontWeight: 500,
  },
  title: { fontSize: 20, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.02em" },
  pill: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "4px 10px", backgroundColor: "#F5F5F7",
    border: "1px solid #E5E5EA", borderRadius: 999,
    fontSize: 12, color: "#6E6E73", fontWeight: 500,
  },
  tabBar: {
    display: "flex", gap: 2, borderBottom: "1px solid #E5E5EA",
    padding: "0 0 0 0", marginBottom: 0, flexShrink: 0,
  },
  tabBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "10px 16px", fontSize: 13, fontWeight: 500,
    color: "#6E6E73", background: "none", border: "none",
    borderBottom: "2px solid transparent", cursor: "pointer",
    marginBottom: -1,
  },
  tabActive: {
    color: "#1D1D1F", borderBottomColor: "#F56300", fontWeight: 600,
  },
  countBadge: {
    backgroundColor: "#F5F5F7", color: "#6E6E73",
    borderRadius: 4, padding: "1px 6px", fontSize: 11, fontWeight: 700,
  },
  content: {
    padding: "20px 0", display: "flex", flexDirection: "column", gap: 16,
  },
  sectionHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#1D1D1F" },
  sectionSub: { fontSize: 12, color: "#8E8E93", marginTop: 3, maxWidth: 480 },
  addBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "0 16px", height: 34,
    backgroundColor: "#F56300", color: "#fff",
    border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    flexShrink: 0,
  },
  inlineForm: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "12px 16px",
    backgroundColor: "#FFF0E6",
    border: "1px solid #F5C49A",
    borderRadius: 10,
  },
  input: {
    height: 34, border: "1px solid #D1D1D6", borderRadius: 8,
    padding: "0 10px", fontSize: 13, color: "#1D1D1F",
    backgroundColor: "#FFFFFF", outline: "none",
  },
  typeToggle: { display: "flex", gap: 2 },
  typeBtn: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "0 10px", height: 34,
    backgroundColor: "#FFFFFF", border: "1px solid #D1D1D6",
    borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#6E6E73",
  },
  typeBtnActive: { backgroundColor: "#F0FAF3", borderColor: "#059669", color: "#059669" },
  typeBtnActiveMachine: { backgroundColor: "#EFF6FF", borderColor: "#2563EB", color: "#2563EB" },
  submitBtn: {
    height: 34, padding: "0 16px",
    backgroundColor: "#1D1D1F", color: "#fff",
    border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  cancelBtn: {
    height: 34, width: 34, display: "flex", alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff", border: "1px solid #D1D1D6",
    borderRadius: 8, cursor: "pointer", color: "#6E6E73",
  },
  table: { display: "flex", flexDirection: "column", gap: 0 },
  tableHead: {
    display: "flex", alignItems: "center",
    padding: "8px 12px",
    fontSize: 11, fontWeight: 700, color: "#AEAEB2",
    textTransform: "uppercase", letterSpacing: "0.06em",
    backgroundColor: "#F5F5F7", borderRadius: "8px 8px 0 0",
    border: "1px solid #E5E5EA",
  },
  tableRow: {
    display: "flex", alignItems: "center",
    padding: "10px 12px",
    borderBottom: "1px solid #F5F5F7",
    border: "1px solid #E5E5EA",
    borderTop: "none",
    backgroundColor: "#FFFFFF",
  },
  emptyState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 10, padding: "48px 0", color: "#AEAEB2", textAlign: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: 600, color: "#8E8E93" },
  emptySub: { fontSize: 13, color: "#AEAEB2", maxWidth: 320 },
  rowRemoveBtn: {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", color: "#AEAEB2", padding: 4, borderRadius: 4,
    flexShrink: 0,
  },
  /* Workflow card styles */
  wfCard: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E5EA",
    borderRadius: 12,
    overflow: "hidden",
  },
  wfHead: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 16px",
  },
  chevronBtn: {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", color: "#8E8E93", padding: 0,
  },
  wfName: { fontSize: 14, fontWeight: 700, color: "#1D1D1F" },
  wfMeta: { fontSize: 12, color: "#8E8E93" },
  wfAddTaskBtn: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "4px 10px", height: 28,
    backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA",
    borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#6E6E73",
  },
  wfTaskList: {
    padding: "0 16px 12px",
    display: "flex", flexDirection: "column", gap: 0,
    borderTop: "1px solid #F5F5F7",
  },
  wfTaskRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 0",
    borderBottom: "1px solid #F5F5F7",
  },
  wfTaskIdx: {
    width: 20, height: 20, borderRadius: "50%",
    backgroundColor: "#F5F5F7", color: "#6E6E73",
    fontSize: 10, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  addTaskPicker: {
    padding: "12px 16px",
    borderTop: "1px solid #F5F5F7",
    backgroundColor: "#FAFAFA",
  },
  taskPickChip: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "5px 12px",
    backgroundColor: "#FFFFFF", border: "1px solid #E5E5EA",
    borderRadius: 999, cursor: "pointer", fontSize: 12,
    fontWeight: 500, color: "#1D1D1F",
  },
};
