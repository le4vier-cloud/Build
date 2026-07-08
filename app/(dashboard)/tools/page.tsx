"use client";

import { useState } from "react";
import {
  Scissors, Plus, BookOpen, Bell,
  Trash2, Clock, X, Check, ChevronRight,
  Calendar, RefreshCw, ClipboardList, Wrench,
  AlertCircle, ZapOff, Zap, Edit2,
} from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";

/* ── Types ─────────────────────────────────────────────── */
type Tool = {
  id: string;
  name: string;
  serial_number: string;
  image_url?: string;
  cost_per_min_idle: number;
  cost_per_min_working: number;
};

type ServiceRecord = {
  id: string;
  tool_id: string;
  date: string;
  technician: string;
  duration_hours: number;
  tasks_completed: string[];
  notes: string;
  next_service_date: string;
};

type RepeatType = "once" | "daily" | "weekly" | "monthly" | "yearly" | "custom";

type ServiceAlert = {
  id: string;
  tool_id: string;
  title: string;
  due_date: string;
  due_time: string;
  repeat: RepeatType;
  repeat_every: number;
  repeat_unit: "days" | "weeks" | "months";
  tasks: string[];
  notes: string;
  active: boolean;
};

/* ── Mock state ─────────────────────────────────────────── */
const SEED_TOOLS: Tool[] = [
  { id: "t1", name: "MIG Welder",        serial_number: "MW-2024-001", cost_per_min_idle: 0.18, cost_per_min_working: 0.85 },
  { id: "t2", name: "CNC Milling Machine",serial_number: "CNC-M-003",  cost_per_min_idle: 0.42, cost_per_min_working: 2.30 },
  { id: "t3", name: "Drill Press",        serial_number: "DP-0012",    cost_per_min_idle: 0.08, cost_per_min_working: 0.35 },
];

const SEED_RECORDS: ServiceRecord[] = [
  {
    id: "sr1", tool_id: "t1", date: "2026-06-15", technician: "Tom Ndlovu",
    duration_hours: 2, tasks_completed: ["Cleaned nozzle", "Replaced tip", "Checked wire feed"],
    notes: "Wire tension slightly off — adjusted.", next_service_date: "2026-09-15",
  },
  {
    id: "sr2", tool_id: "t2", date: "2026-05-10", technician: "Jane Smith",
    duration_hours: 4, tasks_completed: ["Lubricated X/Y/Z rails", "Checked spindle runout", "Calibrated tool offsets"],
    notes: "Spindle runout within spec at 0.003mm.", next_service_date: "2026-08-10",
  },
];

const SEED_ALERTS: ServiceAlert[] = [
  {
    id: "a1", tool_id: "t1", title: "Quarterly Welder Service", due_date: "2026-09-15", due_time: "08:00",
    repeat: "monthly", repeat_every: 3, repeat_unit: "months",
    tasks: ["Inspect and replace contact tip", "Clean wire feeder", "Test gas flow rate", "Check earth clamp continuity"],
    notes: "Book technician at least 1 week before.", active: true,
  },
  {
    id: "a2", tool_id: "t2", title: "CNC Monthly Lubrication", due_date: "2026-08-01", due_time: "07:30",
    repeat: "monthly", repeat_every: 1, repeat_unit: "months",
    tasks: ["Lubricate X/Y/Z linear rails", "Check coolant level", "Clean chip tray"],
    notes: "", active: true,
  },
];

/* ── Sub-nav ────────────────────────────────────────────── */
const SUB_NAV = [
  { key: "list",         label: "Tools",           icon: <Scissors size={15} strokeWidth={1.8} /> },
  { key: "add",          label: "Add Tool",         icon: <Plus size={15} strokeWidth={2} /> },
  { key: "service-book", label: "Service Book",     icon: <BookOpen size={15} strokeWidth={1.8} /> },
  { key: "alerts",       label: "Service Alerts",   icon: <Bell size={15} strokeWidth={1.8} /> },
];

/* ── Helpers ────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 9); }

function fmtCurrency(n: number) {
  return `R ${n.toFixed(2)}`;
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(d: string) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff;
}

const REPEAT_LABELS: Record<RepeatType, string> = {
  once: "Once", daily: "Daily", weekly: "Weekly",
  monthly: "Monthly", yearly: "Yearly", custom: "Custom interval",
};

/* ═══════════════════════════════════════════════════════════
   Shared field components
═══════════════════════════════════════════════════════════ */
function Field({
  label, value, onChange, type = "text", placeholder = "Type here...", hint, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string; required?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
        {label}{required && <span style={{ color: "var(--accent)", marginLeft: 2 }}>*</span>}
      </label>
      {hint && <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: -4 }}>{hint}</span>}
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={inp}
      />
    </div>
  );
}

function CostField({
  label, hint, value, onChange,
}: {
  label: string; hint: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</label>
      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{hint}</span>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-tertiary)", pointerEvents: "none" }}>R</span>
        <input
          type="number" min="0" step="0.01" value={value} placeholder="0.00"
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inp, paddingLeft: 26 }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Tool List
═══════════════════════════════════════════════════════════ */
function ToolList({ tools, onSelect }: { tools: Tool[]; onSelect: (id: string) => void }) {
  if (!tools.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 0", color: "var(--text-tertiary)" }}>
        <Scissors size={32} strokeWidth={1.2} />
        <p style={{ fontSize: 14 }}>No tools yet — add your first tool.</p>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 680 }}>
      {tools.map(tool => {
        const hrWorking = tool.cost_per_min_working * 60;
        const hrIdle    = tool.cost_per_min_idle * 60;
        return (
          <div key={tool.id}
            style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 20, cursor: "pointer", transition: "border-color 0.15s" }}
            onClick={() => onSelect(tool.id)}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            {/* Icon */}
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", backgroundColor: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Scissors size={20} color="var(--accent)" strokeWidth={1.5} />
            </div>

            {/* Identity */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{tool.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>SN: {tool.serial_number}</div>
            </div>

            {/* Cost chips */}
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <CostChip icon={<ZapOff size={11} />} label="Idle" value={`R ${tool.cost_per_min_idle.toFixed(2)}/min`} color="var(--text-secondary)" bg="var(--surface)" />
              <CostChip icon={<Zap size={11} />}    label="Working" value={`R ${tool.cost_per_min_working.toFixed(2)}/min`} color="#10B981" bg="rgba(16,185,129,0.08)" />
            </div>

            <ChevronRight size={16} color="var(--text-tertiary)" />
          </div>
        );
      })}
    </div>
  );
}

function CostChip({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", padding: "6px 10px", backgroundColor: bg, border: "1px solid var(--border)", borderRadius: 8, minWidth: 110 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, color, marginBottom: 2 }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Add / Edit Tool Form
═══════════════════════════════════════════════════════════ */
function blankTool() {
  return { name: "", serial_number: "", cost_per_min_idle: "", cost_per_min_working: "" };
}

function AddToolForm({ onSave }: { onSave: (t: Tool) => void }) {
  const [f, setF] = useState(blankTool());
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  function handleSave() {
    if (!f.name.trim() || !f.serial_number.trim()) return;
    onSave({
      id: uid(),
      name: f.name.trim(),
      serial_number: f.serial_number.trim(),
      cost_per_min_idle:    parseFloat(f.cost_per_min_idle)    || 0,
      cost_per_min_working: parseFloat(f.cost_per_min_working) || 0,
    });
    setF(blankTool());
  }

  const idleMin   = parseFloat(f.cost_per_min_idle)    || 0;
  const workMin   = parseFloat(f.cost_per_min_working) || 0;
  const idleHr    = idleMin * 60;
  const workHr    = workMin * 60;
  const workDay   = workHr * 8;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 480 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>New Tool</h3>

      {/* Image */}
      <div style={{ width: 100, height: 100, border: "1.5px dashed var(--input-border)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", backgroundColor: "var(--bg)" }}>
        <Scissors size={22} color="var(--text-tertiary)" strokeWidth={1.2} />
        <span style={{ fontSize: 10, color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.4, padding: "0 8px" }}>Upload photo</span>
      </div>

      <Field label="Name"          required value={f.name}          onChange={v => set("name", v)} />
      <Field label="Serial Number" required value={f.serial_number} onChange={v => set("serial_number", v)} />

      {/* Cost section */}
      <div style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Machine Cost Rates</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            These rates are used automatically when this machine is assigned to a manufacturing task — giving you accurate job costing.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <CostField
            label="Idle cost / min"
            hint="On but not manufacturing (power, depreciation, space)"
            value={f.cost_per_min_idle}
            onChange={v => set("cost_per_min_idle", v)}
          />
          <CostField
            label="Working cost / min"
            hint="Actively running (consumables, wear, energy)"
            value={f.cost_per_min_working}
            onChange={v => set("cost_per_min_working", v)}
          />
        </div>

        {/* Live preview */}
        {(idleMin > 0 || workMin > 0) && (
          <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Projected rates</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <RateRow label="Idle / hr"    value={`R ${idleHr.toFixed(2)}`} muted />
              <RateRow label="Working / hr" value={`R ${workHr.toFixed(2)}`} accent />
              <RateRow label="8-hr day (working)" value={`R ${workDay.toFixed(2)}`} accent span />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={!f.name.trim() || !f.serial_number.trim()}
        style={{ ...solidBtn, opacity: !f.name.trim() || !f.serial_number.trim() ? 0.45 : 1, alignSelf: "flex-start" }}
      >
        Save Tool
      </button>
    </div>
  );
}

function RateRow({ label, value, accent, muted, span }: { label: string; value: string; accent?: boolean; muted?: boolean; span?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gridColumn: span ? "span 2" : undefined, padding: "4px 0", borderTop: span ? "1px solid var(--border)" : undefined, marginTop: span ? 4 : undefined, paddingTop: span ? 8 : undefined }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: accent ? "#10B981" : muted ? "var(--text-tertiary)" : "var(--text-primary)", fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Service Book
═══════════════════════════════════════════════════════════ */
function blankRecord(toolId: string): Omit<ServiceRecord, "id"> {
  return {
    tool_id: toolId, date: new Date().toISOString().slice(0, 10),
    technician: "", duration_hours: 1, tasks_completed: [],
    notes: "", next_service_date: "",
  };
}

function ServiceBook({ tools, records, onAdd }: {
  tools: Tool[];
  records: ServiceRecord[];
  onAdd: (r: ServiceRecord) => void;
}) {
  const [selectedToolId, setSelectedToolId] = useState(tools[0]?.id ?? "");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => blankRecord(tools[0]?.id ?? ""));
  const [newTask, setNewTask] = useState("");

  const toolRecords = records
    .filter(r => r.tool_id === selectedToolId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const selectedTool = tools.find(t => t.id === selectedToolId);

  function selectTool(id: string) {
    setSelectedToolId(id);
    setForm(blankRecord(id));
    setShowForm(false);
  }

  function addTask() {
    const t = newTask.trim();
    if (!t) return;
    setForm(f => ({ ...f, tasks_completed: [...f.tasks_completed, t] }));
    setNewTask("");
  }

  function handleSave() {
    if (!form.technician.trim() || !form.date) return;
    onAdd({ ...form, id: uid() });
    setForm(blankRecord(selectedToolId));
    setShowForm(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 680 }}>
      {/* Tool selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>Showing records for</span>
        <select value={selectedToolId} onChange={e => selectTool(e.target.value)} style={{ ...inp, flex: 1, maxWidth: 260 }}>
          {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button onClick={() => setShowForm(s => !s)} style={{ ...solidBtn, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Add Record
        </button>
      </div>

      {/* Add record form */}
      {showForm && (
        <div style={{ backgroundColor: "var(--bg)", border: "1.5px solid var(--accent)", borderRadius: "var(--radius-md)", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>New Service Record — {selectedTool?.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbl}>Date*</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbl}>Duration (hours)</label>
              <input type="number" min="0.5" step="0.5" value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: parseFloat(e.target.value) || 1 }))} style={inp} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={lbl}>Technician*</label>
            <input value={form.technician} placeholder="Name of technician" onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} style={inp} />
          </div>

          {/* Tasks */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={lbl}>Tasks Completed</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newTask} placeholder="e.g. Replaced filter" onChange={e => setNewTask(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }} style={{ ...inp, flex: 1 }} />
              <button onClick={addTask} style={{ ...solidBtn, padding: "0 14px" }}><Plus size={14} /></button>
            </div>
            {form.tasks_completed.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
                <Check size={13} color="#10B981" />
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)" }}>{t}</span>
                <button onClick={() => setForm(f => ({ ...f, tasks_completed: f.tasks_completed.filter((_, j) => j !== i) }))} style={iconBtn}><X size={12} /></button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={lbl}>Notes</label>
            <textarea value={form.notes} placeholder="Any observations, issues found, parts replaced..." onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, height: 72, resize: "vertical", padding: "8px 12px", lineHeight: 1.5 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={lbl}>Next Service Due</label>
            <input type="date" value={form.next_service_date} onChange={e => setForm(f => ({ ...f, next_service_date: e.target.value }))} style={inp} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={!form.technician.trim()} style={{ ...solidBtn, opacity: !form.technician.trim() ? 0.45 : 1 }}>Save Record</button>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {/* Records timeline */}
      {toolRecords.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 0", color: "var(--text-tertiary)" }}>
          <BookOpen size={32} strokeWidth={1.2} />
          <p style={{ fontSize: 14 }}>No service records yet for this tool.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {toolRecords.map((rec, i) => (
            <div key={rec.id} style={{ display: "flex", gap: 16 }}>
              {/* Timeline spine */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "var(--accent)", marginTop: 6, flexShrink: 0 }} />
                {i < toolRecords.length - 1 && <div style={{ width: 2, flex: 1, backgroundColor: "var(--border)", marginTop: 4 }} />}
              </div>

              {/* Card */}
              <div style={{ flex: 1, backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "14px 18px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{fmtDate(rec.date)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      {rec.technician} · {rec.duration_hours}h service
                    </div>
                  </div>
                  {rec.next_service_date && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, flexShrink: 0 }}>
                      <Calendar size={11} color="var(--text-tertiary)" />
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Next: {fmtDate(rec.next_service_date)}</span>
                    </div>
                  )}
                </div>
                {rec.tasks_completed.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Tasks</span>
                    {rec.tasks_completed.map((t, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <Check size={12} color="#10B981" />
                        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{t}</span>
                      </div>
                    ))}
                  </div>
                )}
                {rec.notes && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, backgroundColor: "var(--surface)", padding: "8px 12px", borderRadius: 6, borderLeft: "3px solid var(--border)" }}>
                    {rec.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Service Alerts
═══════════════════════════════════════════════════════════ */
function blankAlert(toolId: string): Omit<ServiceAlert, "id"> {
  return {
    tool_id: toolId, title: "", due_date: "", due_time: "08:00",
    repeat: "monthly", repeat_every: 1, repeat_unit: "months",
    tasks: [], notes: "", active: true,
  };
}

function ServiceAlerts({ tools, alerts, onAdd, onToggle, onDelete }: {
  tools: Tool[];
  alerts: ServiceAlert[];
  onAdd: (a: ServiceAlert) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<ServiceAlert, "id">>(() => blankAlert(tools[0]?.id ?? ""));
  const [newTask, setNewTask] = useState("");

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  function addTask() {
    const t = newTask.trim();
    if (!t) return;
    setForm(f => ({ ...f, tasks: [...f.tasks, t] }));
    setNewTask("");
  }

  function handleSave() {
    if (!form.title.trim() || !form.due_date || !form.tool_id) return;
    onAdd({ ...form, id: uid() });
    setForm(blankAlert(tools[0]?.id ?? ""));
    setShowForm(false);
  }

  function repeatSummary(a: ServiceAlert) {
    if (a.repeat === "once") return "Once";
    if (a.repeat === "daily") return "Every day";
    if (a.repeat === "weekly") return "Every week";
    if (a.repeat === "monthly") return `Every ${a.repeat_every === 1 ? "" : a.repeat_every + " "}month${a.repeat_every > 1 ? "s" : ""}`;
    if (a.repeat === "yearly") return "Every year";
    if (a.repeat === "custom") return `Every ${a.repeat_every} ${a.repeat_unit}`;
    return "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 680 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Service Alerts</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Scheduled maintenance reminders with associated tasks</div>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{ ...solidBtn, display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> New Alert
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ backgroundColor: "var(--bg)", border: "1.5px solid var(--accent)", borderRadius: "var(--radius-md)", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>New Service Alert</div>

          {/* Tool + Title */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbl}>Tool*</label>
              <select value={form.tool_id} onChange={e => set("tool_id", e.target.value)} style={inp}>
                {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbl}>Alert Title*</label>
              <input value={form.title} placeholder="e.g. Quarterly service" onChange={e => set("title", e.target.value)} style={inp} />
            </div>
          </div>

          {/* Date + Time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbl}>First Due Date*</label>
              <input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} style={inp} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbl}>Time</label>
              <input type="time" value={form.due_time} onChange={e => set("due_time", e.target.value)} style={inp} />
            </div>
          </div>

          {/* Repeat */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={lbl}>Repeat</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(["once", "daily", "weekly", "monthly", "yearly", "custom"] as RepeatType[]).map(r => (
                <button key={r} onClick={() => set("repeat", r)}
                  style={{
                    height: 30, padding: "0 14px", borderRadius: 20, border: "1.5px solid",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    backgroundColor: form.repeat === r ? "var(--accent)" : "transparent",
                    borderColor: form.repeat === r ? "var(--accent)" : "var(--border)",
                    color: form.repeat === r ? "var(--btn-primary-text)" : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}>
                  {REPEAT_LABELS[r]}
                </button>
              ))}
            </div>

            {/* Custom interval controls */}
            {form.repeat === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Every</span>
                <input
                  type="number" min="1" value={form.repeat_every}
                  onChange={e => set("repeat_every", parseInt(e.target.value) || 1)}
                  style={{ ...inp, width: 72 }}
                />
                <select value={form.repeat_unit} onChange={e => set("repeat_unit", e.target.value as "days" | "weeks" | "months")} style={{ ...inp, width: 120 }}>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
            )}

            {/* Monthly: show interval option */}
            {form.repeat === "monthly" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Every</span>
                <input
                  type="number" min="1" max="24" value={form.repeat_every}
                  onChange={e => set("repeat_every", parseInt(e.target.value) || 1)}
                  style={{ ...inp, width: 72 }}
                />
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>month(s)</span>
              </div>
            )}
          </div>

          {/* Service tasks */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={lbl}>Service Tasks</label>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: -4 }}>Checklist of work items to complete during this service</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={newTask} placeholder="e.g. Inspect and replace contact tip"
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }}
                style={{ ...inp, flex: 1 }}
              />
              <button onClick={addTask} style={{ ...solidBtn, padding: "0 14px" }}><Plus size={14} /></button>
            </div>
            {form.tasks.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
                <ClipboardList size={12} color="var(--accent)" />
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)" }}>{t}</span>
                <button onClick={() => setForm(f => ({ ...f, tasks: f.tasks.filter((_, j) => j !== i) }))} style={iconBtn}><X size={12} /></button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={lbl}>Notes</label>
            <textarea value={form.notes} placeholder="Any additional instructions or context..." onChange={e => set("notes", e.target.value)} style={{ ...inp, height: 64, resize: "vertical", padding: "8px 12px", lineHeight: 1.5 }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={!form.title.trim() || !form.due_date} style={{ ...solidBtn, opacity: !form.title.trim() || !form.due_date ? 0.45 : 1 }}>
              Create Alert
            </button>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {/* Alerts list */}
      {alerts.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 0", color: "var(--text-tertiary)" }}>
          <Bell size={32} strokeWidth={1.2} />
          <p style={{ fontSize: 14 }}>No service alerts yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alerts.map(alert => {
            const tool  = tools.find(t => t.id === alert.tool_id);
            const days  = daysUntil(alert.due_date);
            const overdue = days !== null && days < 0;
            const soon    = days !== null && days >= 0 && days <= 7;
            return (
              <div key={alert.id}
                style={{ backgroundColor: "var(--bg)", border: `1px solid ${overdue ? "#EF444444" : "var(--border)"}`, borderRadius: "var(--radius-md)", padding: "16px 20px", opacity: alert.active ? 1 : 0.55, display: "flex", flexDirection: "column", gap: 12 }}
              >
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{alert.title}</span>
                      {overdue && <Pill text="Overdue" color="#EF4444" />}
                      {soon && !overdue && <Pill text="Due soon" color="#F59E0B" />}
                      {!alert.active && <Pill text="Paused" color="var(--text-tertiary)" />}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                      {tool?.name} · {fmtDate(alert.due_date)} at {alert.due_time}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => onToggle(alert.id)} title={alert.active ? "Pause" : "Resume"}
                      style={{ ...iconBtn, width: 30, height: 30, backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
                      {alert.active ? <AlertCircle size={14} color="var(--text-secondary)" /> : <Bell size={14} color="var(--text-secondary)" />}
                    </button>
                    <button onClick={() => onDelete(alert.id)} title="Delete"
                      style={{ ...iconBtn, width: 30, height: 30, backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
                      <Trash2 size={14} color="#EF4444" />
                    </button>
                  </div>
                </div>

                {/* Repeat + tasks summary */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20 }}>
                    <RefreshCw size={11} color="var(--text-tertiary)" />
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>{repeatSummary(alert)}</span>
                  </div>
                  {alert.tasks.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20 }}>
                      <ClipboardList size={11} color="var(--text-tertiary)" />
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>{alert.tasks.length} task{alert.tasks.length > 1 ? "s" : ""}</span>
                    </div>
                  )}
                </div>

                {/* Tasks list */}
                {alert.tasks.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {alert.tasks.map((t, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 14, height: 14, border: "1.5px solid var(--border)", borderRadius: 3, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t}</span>
                      </div>
                    ))}
                  </div>
                )}

                {alert.notes && (
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6, borderLeft: "3px solid var(--border)", paddingLeft: 10 }}>
                    {alert.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, backgroundColor: color + "18", border: `1px solid ${color}44`, borderRadius: 999, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {text}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   Shared styles
═══════════════════════════════════════════════════════════ */
const inp: React.CSSProperties = {
  height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)",
  padding: "0 12px", fontSize: 14, color: "var(--text-primary)",
  backgroundColor: "var(--surface)", outline: "none", width: "100%", boxSizing: "border-box",
};

const lbl: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
};

const solidBtn: React.CSSProperties = {
  height: 38, padding: "0 20px",
  backgroundColor: "var(--btn-primary)", color: "var(--btn-primary-text)",
  border: "none", borderRadius: "var(--radius-full, 9999px)",
  fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  height: 38, padding: "0 20px",
  backgroundColor: "transparent", color: "var(--text-secondary)",
  border: "1px solid var(--border)", borderRadius: "var(--radius-full, 9999px)",
  fontSize: 13, fontWeight: 500, cursor: "pointer",
};

const iconBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4,
  color: "var(--text-tertiary)",
};

/* ═══════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════ */
export default function ToolsPage() {
  const [view, setView] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>(SEED_TOOLS);
  const [records, setRecords] = useState<ServiceRecord[]>(SEED_RECORDS);
  const [alerts, setAlerts] = useState<ServiceAlert[]>(SEED_ALERTS);

  return (
    <ModuleLayout title="Tools" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
      {view === "list" && (
        <ToolList tools={tools} onSelect={() => {}} />
      )}
      {view === "add" && (
        <AddToolForm onSave={t => { setTools(p => [...p, t]); setView("list"); }} />
      )}
      {view === "service-book" && (
        <ServiceBook
          tools={tools}
          records={records}
          onAdd={r => setRecords(p => [r, ...p])}
        />
      )}
      {view === "alerts" && (
        <ServiceAlerts
          tools={tools}
          alerts={alerts}
          onAdd={a => setAlerts(p => [a, ...p])}
          onToggle={id => setAlerts(p => p.map(a => a.id === id ? { ...a, active: !a.active } : a))}
          onDelete={id => setAlerts(p => p.filter(a => a.id !== id))}
        />
      )}
    </ModuleLayout>
  );
}
