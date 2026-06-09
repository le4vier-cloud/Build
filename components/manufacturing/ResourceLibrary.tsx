"use client";

import React, { useState } from "react";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import {
  Clock, GripVertical, User, Package, Wrench, ChevronDown, ChevronRight,
} from "lucide-react";

type Tab = "tasks" | "staff" | "parts" | "tools";

const fmt = (n: number) => `R${n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function ResourceLibrary() {
  const [tab, setTab] = useState<Tab>("tasks");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { getAvailableTasks, workflows, tasks, stationNodes, staffResources, partResources, toolResources } =
    useManufacturingStore();

  const availableTasks = getAvailableTasks();
  const assignedWorkflowIds = new Set(stationNodes.flatMap((n) => n.assignedWorkflows));
  const assignedTaskIds = new Set(stationNodes.flatMap((n) => n.assignedTasks));
  const tasksInAssignedWorkflows = new Set(
    workflows.filter((w) => assignedWorkflowIds.has(w.id)).flatMap((w) => w.taskIds)
  );
  const availableWorkflows = workflows.filter((w) => !assignedWorkflowIds.has(w.id));
  const availableIndividualTasks = availableTasks.filter(
    (t) => !assignedTaskIds.has(t.id) && !tasksInAssignedWorkflows.has(t.id)
  );

  const handleDragStart = (e: React.DragEvent, type: string, payload: Record<string, unknown>) => {
    e.dataTransfer.setData("resourceType", type);
    e.dataTransfer.setData("resourcePayload", JSON.stringify(payload));
    // Backward-compat for FlowCanvas task/workflow drops
    if (type === "task") { e.dataTransfer.setData("type", "task"); e.dataTransfer.setData("id", payload.id as string); }
    if (type === "workflow") { e.dataTransfer.setData("type", "workflow"); e.dataTransfer.setData("id", payload.id as string); }
    e.dataTransfer.effectAllowed = "copy";
  };

  const toggleExpand = (id: string) => {
    const s = new Set(expanded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpanded(s);
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "tasks",  label: "Tasks",  icon: <Clock size={13} strokeWidth={1.8} /> },
    { key: "staff",  label: "Staff",  icon: <User size={13} strokeWidth={1.8} /> },
    { key: "parts",  label: "Parts",  icon: <Package size={13} strokeWidth={1.8} /> },
    { key: "tools",  label: "Tools",  icon: <Wrench size={13} strokeWidth={1.8} /> },
  ];

  return (
    <div style={s.panel}>
      {/* Header */}
      <div style={s.header}>
        <p style={s.headerTitle}>Resources</p>
        <p style={s.headerSub}>Drag onto stations</p>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...s.tab, ...(tab === t.key ? s.tabActive : {}) }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={s.scroll}>

        {/* ── TASKS ── */}
        {tab === "tasks" && (
          <div style={s.section}>
            {availableWorkflows.length > 0 && (
              <>
                <p style={s.sectionLabel}>Workflows</p>
                {availableWorkflows.map((wf) => {
                  const wfTasks = tasks.filter((t) => wf.taskIds.includes(t.id));
                  const totalMin = wfTasks.reduce((s, t) => s + t.duration, 0);
                  const isOpen = expanded.has(wf.id);
                  return (
                    <div key={wf.id}>
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, "workflow", { id: wf.id, name: wf.name })}
                        style={s.card}
                      >
                        <button onClick={() => toggleExpand(wf.id)} style={s.chevronBtn}>
                          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                        <GripVertical size={13} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={s.cardTitle}>{wf.name}</p>
                          <p style={s.cardMeta}><Clock size={10} /> {totalMin} min · {wfTasks.length} tasks</p>
                        </div>
                      </div>
                      {isOpen && wfTasks.map((t) => (
                        <div key={t.id} draggable
                          onDragStart={(e) => handleDragStart(e, "task", { id: t.id, name: t.name, duration: t.duration })}
                          style={{ ...s.card, marginLeft: 16 }}>
                          <GripVertical size={11} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <p style={s.cardTitle}>{t.name}</p>
                            <p style={s.cardMeta}><Clock size={10} /> {t.duration} min</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            )}

            {availableIndividualTasks.length > 0 && (
              <>
                <p style={{ ...s.sectionLabel, marginTop: 12 }}>Individual Tasks</p>
                {availableIndividualTasks.map((t) => (
                  <div key={t.id} draggable
                    onDragStart={(e) => handleDragStart(e, "task", { id: t.id, name: t.name, duration: t.duration })}
                    style={s.card}>
                    <GripVertical size={13} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={s.cardTitle}>{t.name}</p>
                      <p style={s.cardMeta}><Clock size={10} /> {t.duration} min · {t.optionSet}</p>
                    </div>
                  </div>
                ))}
              </>
            )}

            {availableWorkflows.length === 0 && availableIndividualTasks.length === 0 && (
              <p style={s.empty}>All tasks assigned</p>
            )}
          </div>
        )}

        {/* ── STAFF (Labour) ── */}
        {tab === "staff" && (
          <div style={s.section}>
            <p style={s.sectionLabel}>Labour</p>
            {staffResources.map((st) => (
              <div key={st.id} draggable
                onDragStart={(e) => handleDragStart(e, "staff", { staffId: st.id, name: st.name, wagePerHour: st.wagePerHour })}
                style={s.card}>
                <GripVertical size={13} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                <div style={s.avatarCircle}>{st.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <p style={s.cardTitle}>{st.name}</p>
                  <p style={s.cardMeta}>{fmt(st.wagePerHour)}/hr</p>
                </div>
              </div>
            ))}
            {staffResources.length === 0 && <p style={s.empty}>No staff in database yet</p>}
          </div>
        )}

        {/* ── PARTS (Materials) ── */}
        {tab === "parts" && (
          <div style={s.section}>
            <p style={s.sectionLabel}>Materials</p>
            {partResources.map((p) => (
              <div key={p.id} draggable
                onDragStart={(e) => handleDragStart(e, "material", {
                  partId: p.id, name: p.name, unitCost: p.unitCost, qty: 1,
                })}
                style={s.card}>
                <GripVertical size={13} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={s.cardTitle}>{p.name}</p>
                  <p style={s.cardMeta}>
                    <span style={{ ...s.typePill, backgroundColor: p.type === "OS" ? "#EFF6FF" : "#F5F3FF", color: p.type === "OS" ? "#3B82F6" : "#7C3AED" }}>
                      {p.type}
                    </span>
                    {fmt(p.unitCost)}/unit
                  </p>
                </div>
              </div>
            ))}
            {partResources.length === 0 && <p style={s.empty}>No parts in database yet</p>}
          </div>
        )}

        {/* ── TOOLS (Machines) ── */}
        {tab === "tools" && (
          <div style={s.section}>
            <p style={s.sectionLabel}>Machines & Equipment</p>
            {toolResources.map((t) => (
              <div key={t.id} draggable
                onDragStart={(e) => handleDragStart(e, "tool", {
                  toolId: t.id, name: t.name, costPerHour: t.costPerHour,
                })}
                style={s.card}>
                <GripVertical size={13} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={s.cardTitle}>{t.name}</p>
                  <p style={s.cardMeta}>{fmt(t.costPerHour)}/hr usage</p>
                </div>
              </div>
            ))}
            {toolResources.length === 0 && <p style={s.empty}>No tools in database yet</p>}
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  panel: {
    width: 260,
    minWidth: 260,
    height: "100%",
    backgroundColor: "var(--surface)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  header: {
    padding: "14px 16px 10px",
    borderBottom: "1px solid var(--border)",
  },
  headerTitle: { fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 },
  headerSub: { fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 },
  tabs: {
    display: "flex",
    borderBottom: "1px solid var(--border)",
    padding: "0 8px",
    gap: 2,
    flexShrink: 0,
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "8px 8px",
    fontSize: 11,
    fontWeight: 500,
    color: "var(--text-secondary)",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    whiteSpace: "nowrap",
    marginBottom: -1,
  },
  tabActive: {
    color: "var(--text-primary)",
    borderBottomColor: "var(--accent)",
    fontWeight: 600,
  },
  scroll: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 10px",
  },
  section: { display: "flex", flexDirection: "column", gap: 4 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--text-tertiary)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 4,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    backgroundColor: "var(--bg)",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    cursor: "grab",
    marginBottom: 4,
  },
  cardTitle: { fontSize: 12, fontWeight: 500, color: "var(--text-primary)", margin: 0 },
  cardMeta: {
    fontSize: 11,
    color: "var(--text-tertiary)",
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  chevronBtn: {
    background: "none", border: "none", cursor: "pointer", padding: 0,
    display: "flex", alignItems: "center", color: "var(--text-secondary)",
  },
  avatarCircle: {
    width: 24, height: 24, borderRadius: "50%",
    backgroundColor: "var(--accent)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700, flexShrink: 0,
  },
  typePill: {
    fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "1px 4px",
  },
  empty: { fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", marginTop: 24 },
};
