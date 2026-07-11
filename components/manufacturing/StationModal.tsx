"use client";

import { useState } from "react";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import {
  X, Clock, Users, Package, Wrench, ChevronDown, ChevronRight,
  Minus, Plus,
} from "lucide-react";

interface StationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const R = (n: number) =>
  `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtMin = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}` : `${m}m`;
};

export const StationModal = ({ open, onOpenChange }: StationModalProps) => {
  const {
    selectedNodeId, stationNodes, stations, tasks, workflows,
    getNodeDuration,
    removeTaskFromStation, removeWorkflowFromStation,
    removeStaffFromStation, removeMaterialFromStation, updateMaterialQty,
    removeToolFromStation,
  } = useManufacturingStore();

  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());

  if (!open) return null;

  const node     = stationNodes.find((n) => n.id === selectedNodeId);
  const station  = node ? stations.find((s) => s.id === node.stationId) : null;
  if (!node || !station) return null;

  const duration   = getNodeDuration(node);
  const nodeTasks  = tasks.filter((t) => node.assignedTasks.includes(t.id));
  const nodeWfs    = workflows.filter((w) => node.assignedWorkflows.includes(w.id));

  /* Cost at this station */
  const durHours   = duration / 60;
  const labourCost = node.assignedStaff.reduce((s, st) => s + st.wagePerHour * durHours, 0);
  const matCost    = node.assignedMaterials.reduce((s, m) => s + m.qty * m.unitCost, 0);
  const toolCost   = node.assignedTools.reduce((s, t) => s + t.costPerHour * durHours, 0);
  const totalCost  = labourCost + matCost + toolCost;

  const toggleWf = (id: string) => {
    const s = new Set(expandedWorkflows);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedWorkflows(s);
  };

  const close = () => onOpenChange(false);

  return (
    /* Backdrop */
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(2px)",
      }}
      onClick={close}
    >
      {/* Panel */}
      <div
        style={{
          width: "min(460px, calc(100vw - 32px))", maxHeight: "82vh",
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={s.header}>
          <div>
            <h2 style={s.title}>{station.name}</h2>
            <div style={s.meta}>
              <Clock size={12} color="#8E8E93" />
              <span>{fmtMin(duration)}</span>
              {totalCost > 0 && (
                <>
                  <span style={{ color: "#D1D1D6" }}>·</span>
                  <span style={{ color: "#F56300", fontWeight: 600 }}>{R(totalCost)}</span>
                </>
              )}
            </div>
          </div>
          <button style={s.closeBtn} onClick={close}>
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={s.body}>

          {/* ── Tasks & Workflows ── */}
          <SectionHead
            icon={<Clock size={13} color="#F56300" />}
            label="Tasks & Workflows"
            value={nodeTasks.length + nodeWfs.length > 0 ? fmtMin(duration) : undefined}
            color="#F56300"
          />
          {nodeWfs.length === 0 && nodeTasks.length === 0 && (
            <EmptyRow text="Drag tasks or workflows from the Resources panel" />
          )}
          {nodeWfs.map((wf) => {
            const wfTasks    = tasks.filter((t) => wf.taskIds.includes(t.id));
            const wfDuration = wfTasks.reduce((s, t) => s + t.duration, 0);
            const isOpen     = expandedWorkflows.has(wf.id);
            return (
              <div key={wf.id}>
                <div style={s.row}>
                  <button style={s.chevron} onClick={() => toggleWf(wf.id)}>
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <span style={s.rowLabel}>{wf.name}</span>
                  <span style={{ ...s.pill, backgroundColor: "#FFF0E6", color: "#F56300" }}>
                    workflow
                  </span>
                  <span style={s.rowMeta}>{fmtMin(wfDuration)}</span>
                  <button style={s.removeBtn} onClick={() => removeWorkflowFromStation(node.id, wf.id)}>
                    <X size={12} />
                  </button>
                </div>
                {isOpen && wfTasks.map((t) => (
                  <div key={t.id} style={{ ...s.row, paddingLeft: 36 }}>
                    <span style={{ ...s.rowLabel, color: "var(--text-secondary, #6E6E73)" }}>{t.name}</span>
                    <span style={{ ...s.pill, backgroundColor: t.optionSet === "machine" ? "#F1F5FF" : "#F0FAF3", color: t.optionSet === "machine" ? "#2563EB" : "#059669" }}>
                      {t.optionSet}
                    </span>
                    <span style={s.rowMeta}>{fmtMin(t.duration)}</span>
                  </div>
                ))}
              </div>
            );
          })}
          {nodeTasks.map((t) => (
            <div key={t.id} style={s.row}>
              <span style={s.rowLabel}>{t.name}</span>
              <span style={{ ...s.pill, backgroundColor: t.optionSet === "machine" ? "#F1F5FF" : "#F0FAF3", color: t.optionSet === "machine" ? "#2563EB" : "#059669" }}>
                {t.optionSet}
              </span>
              <span style={s.rowMeta}>{fmtMin(t.duration)}</span>
              <button style={s.removeBtn} onClick={() => removeTaskFromStation(node.id, t.id)}>
                <X size={12} />
              </button>
            </div>
          ))}

          <Divider />

          {/* ── Labour ── */}
          <SectionHead
            icon={<Users size={13} color="#2563EB" />}
            label="Labour"
            value={labourCost > 0 ? R(labourCost) : undefined}
            color="#2563EB"
          />
          {node.assignedStaff.length === 0 && (
            <EmptyRow text="Drag staff from Resources → Labour" />
          )}
          {node.assignedStaff.map((st) => (
            <div key={st.staffId} style={s.row}>
              <div style={s.avatar}>{st.name.charAt(0)}</div>
              <span style={s.rowLabel}>{st.name}</span>
              <span style={s.rowMeta}>{R(st.wagePerHour)}/hr</span>
              <button style={s.removeBtn} onClick={() => removeStaffFromStation(node.id, st.staffId)}>
                <X size={12} />
              </button>
            </div>
          ))}

          <Divider />

          {/* ── Materials ── */}
          <SectionHead
            icon={<Package size={13} color="#059669" />}
            label="Materials"
            value={matCost > 0 ? R(matCost) : undefined}
            color="#059669"
          />
          {node.assignedMaterials.length === 0 && (
            <EmptyRow text="Drag parts from Resources → Parts" />
          )}
          {node.assignedMaterials.map((m) => (
            <div key={m.partId} style={s.row}>
              <span style={s.rowLabel}>{m.name}</span>
              <span style={s.rowMeta}>{R(m.unitCost)}/unit</span>
              {/* Qty stepper */}
              <div style={s.qtyWrap}>
                <button style={s.qtyBtn}
                  onClick={() => updateMaterialQty(node.id, m.partId, Math.max(1, m.qty - 1))}>
                  <Minus size={10} />
                </button>
                <span style={s.qtyVal}>{m.qty}</span>
                <button style={s.qtyBtn}
                  onClick={() => updateMaterialQty(node.id, m.partId, m.qty + 1)}>
                  <Plus size={10} />
                </button>
              </div>
              <span style={{ ...s.rowMeta, color: "#059669", fontWeight: 600 }}>
                {R(m.qty * m.unitCost)}
              </span>
              <button style={s.removeBtn} onClick={() => removeMaterialFromStation(node.id, m.partId)}>
                <X size={12} />
              </button>
            </div>
          ))}

          <Divider />

          {/* ── Machines ── */}
          <SectionHead
            icon={<Wrench size={13} color="#D97706" />}
            label="Machines & Equipment"
            value={toolCost > 0 ? R(toolCost) : undefined}
            color="#D97706"
          />
          {node.assignedTools.length === 0 && (
            <EmptyRow text="Drag tools from Resources → Tools" />
          )}
          {node.assignedTools.map((t) => (
            <div key={t.toolId} style={s.row}>
              <span style={s.rowLabel}>{t.name}</span>
              <span style={s.rowMeta}>{R(t.costPerHour)}/hr</span>
              <button style={s.removeBtn} onClick={() => removeToolFromStation(node.id, t.toolId)}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Footer total */}
        {totalCost > 0 && (
          <div style={s.footer}>
            <span style={s.footerLabel}>Station cost contribution</span>
            <span style={s.footerValue}>{R(totalCost)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Helpers ─────────────────────────────── */

function SectionHead({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value?: string; color: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "12px 0 6px",
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6,
        backgroundColor: color + "18",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#1D1D1F", flex: 1 }}>{label}</span>
      {value && <span style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", fontVariantNumeric: "tabular-nums" }}>{value}</span>}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: "#F5F5F7", margin: "4px 0" }} />;
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 11, color: "#AEAEB2", padding: "4px 0 8px", fontStyle: "italic" }}>
      {text}
    </p>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "18px 20px 14px",
    borderBottom: "1px solid #F5F5F7",
    flexShrink: 0,
  },
  title: { fontSize: 17, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.01em" },
  meta: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 12, color: "#8E8E93", marginTop: 4,
  },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", color: "#8E8E93", padding: 4,
    borderRadius: 6, transition: "background 0.15s",
  },
  body: {
    flex: 1, overflowY: "auto",
    padding: "4px 20px 16px",
  },
  row: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "7px 0",
    borderBottom: "1px solid #F5F5F7",
    minHeight: 38,
  },
  rowLabel: { fontSize: 13, color: "#1D1D1F", flex: 1, fontWeight: 500 },
  rowMeta: { fontSize: 11, color: "#8E8E93", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" },
  pill: {
    fontSize: 9, fontWeight: 700, borderRadius: 4,
    padding: "2px 6px", whiteSpace: "nowrap", flexShrink: 0,
  },
  chevron: {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", color: "#8E8E93", padding: 0, flexShrink: 0,
  },
  removeBtn: {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", color: "#AEAEB2", padding: 3, flexShrink: 0,
    borderRadius: 4,
  },
  avatar: {
    width: 24, height: 24, borderRadius: "50%",
    backgroundColor: "#F56300", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700, flexShrink: 0,
  },
  qtyWrap: {
    display: "flex", alignItems: "center", gap: 2,
    backgroundColor: "#F5F5F7", borderRadius: 6, padding: "2px 4px",
  },
  qtyBtn: {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", color: "#6E6E73", padding: 2, borderRadius: 3,
  },
  qtyVal: { fontSize: 12, fontWeight: 600, color: "#1D1D1F", minWidth: 18, textAlign: "center" },
  footer: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 20px",
    borderTop: "2px solid #1D1D1F",
    flexShrink: 0,
  },
  footerLabel: { fontSize: 12, fontWeight: 700, color: "#1D1D1F" },
  footerValue: { fontSize: 16, fontWeight: 800, color: "#1D1D1F", fontVariantNumeric: "tabular-nums" },
};
