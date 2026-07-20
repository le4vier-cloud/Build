"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LogOut, ChevronLeft, Play, Check, X, Clock, FileText,
  Ruler, Cpu, File, Gauge, Power, AlertTriangle, User,
} from "lucide-react";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import { useFloorStore, type Operator, type TaskLog } from "@/stores/useFloorStore";
import type { Task, Workflow, TaskFile } from "@/types/manufacturing";

/* ══════════════════════════════════════════════════
   Demo data — enriched with SOP text, files and a
   machine binding so the floor experience has real
   content to show, independent of whatever the office
   Production Planner has seeded.
══════════════════════════════════════════════════ */
const FLOOR_DEMO = {
  tasks: [
    {
      id: "ft1", name: "Cut & Prep Materials", duration: 45, optionSet: "machine" as const,
      machineName: "CNC Router — Bay 3",
      sop: "1. Load raw sheet stock onto the bed and clamp all four corners.\n2. Confirm the cut program matches today's work order.\n3. Run the cutting cycle — do not leave the machine unattended.\n4. Deburr all edges and stack cut pieces on the prep cart.",
      files: [
        { id: "f1", name: "Sheet-Cut-Program-v3.nc", kind: "program" as const, size: "48 KB" },
        { id: "f2", name: "Cut Layout Drawing.pdf", kind: "drawing" as const, size: "1.1 MB" },
      ],
    },
    {
      id: "ft2", name: "Frame Assembly", duration: 120, optionSet: "human" as const,
      sop: "1. Collect frame components from the prep cart.\n2. Dry-fit all pieces before fastening.\n3. Apply fasteners in the order shown on the assembly drawing.\n4. Torque-check every bolted joint.\n5. Place completed frame on the QC rack.",
      files: [
        { id: "f3", name: "Frame Assembly SOP.pdf", kind: "sop" as const, size: "620 KB" },
        { id: "f4", name: "Fastener Pattern.pdf", kind: "drawing" as const, size: "310 KB" },
      ],
    },
    {
      id: "ft3", name: "Wiring & Electronics", duration: 90, optionSet: "human" as const,
      sop: "1. Pull the wiring harness kit for this unit.\n2. Route cables per the wiring diagram — avoid sharp edges.\n3. Terminate and crimp all connectors.\n4. Power on and confirm all indicator lights are green.",
      files: [
        { id: "f5", name: "Wiring Diagram Rev C.pdf", kind: "drawing" as const, size: "890 KB" },
      ],
    },
    {
      id: "ft4", name: "QC Inspection", duration: 30, optionSet: "human" as const,
      sop: "1. Check unit against the QC checklist.\n2. Photograph any defects found.\n3. Pass → move to Paint & Polish. Fail → tag and return to Assembly.",
      files: [
        { id: "f6", name: "QC Checklist.pdf", kind: "sop" as const, size: "210 KB" },
      ],
    },
    {
      id: "ft5", name: "Paint & Polish", duration: 60, optionSet: "machine" as const,
      machineName: "Spray Booth — Bay 1",
      sop: "1. Confirm booth filters were changed this shift.\n2. Mask off all non-paint surfaces.\n3. Run the spray cycle per the finish spec.\n4. Cure per the finish schedule before handling.",
      files: [
        { id: "f7", name: "Finish Spec — Gloss White.pdf", kind: "sop" as const, size: "150 KB" },
      ],
    },
  ],
  workflows: [
    { id: "fw1", name: "Core Build",   taskIds: ["ft1", "ft2"] },
    { id: "fw2", name: "Final Finish", taskIds: ["ft3", "ft4", "ft5"] },
  ],
};

/* ══════════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════════ */
function useElapsedSeconds(startedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

function fmtClock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const FILE_ICON: Record<TaskFile["kind"], React.ReactNode> = {
  sop:     <FileText size={20} />,
  drawing: <Ruler size={20} />,
  program: <Cpu size={20} />,
  other:   <File size={20} />,
};

function workflowFor(task: Task, workflows: Workflow[]) {
  return workflows.find((w) => w.taskIds.includes(task.id));
}

/* ══════════════════════════════════════════════════
   Root page — routes between the four floor screens
══════════════════════════════════════════════════ */
export default function FloorPage() {
  const { tasks, workflows, setData } = useManufacturingStore();
  const {
    operators, activeWorkerId, activeTaskId, activeTaskStartedAt, logs,
    clockIn, clockOut, startTask, cancelTask, completeTask,
  } = useFloorStore();
  const [showPerformance, setShowPerformance] = useState(false);

  useEffect(() => {
    if (useManufacturingStore.getState().tasks.length === 0) setData(FLOOR_DEMO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!activeWorkerId) {
    return <WorkerSelect operators={operators} onSelect={clockIn} />;
  }

  const worker = operators.find((o) => o.id === activeWorkerId);
  if (!worker) return null;

  const activeTask = tasks.find((t) => t.id === activeTaskId);
  if (activeTask && activeTaskStartedAt) {
    return (
      <TaskExecution
        task={activeTask}
        workflow={workflowFor(activeTask, workflows)}
        startedAt={activeTaskStartedAt}
        onComplete={completeTask}
        onCancel={cancelTask}
      />
    );
  }

  if (showPerformance) {
    return (
      <Performance
        worker={worker}
        logs={logs.filter((l) => l.workerId === worker.id)}
        tasks={tasks}
        onBack={() => setShowPerformance(false)}
      />
    );
  }

  return (
    <Queue
      worker={worker}
      tasks={tasks}
      workflows={workflows}
      completedToday={logs.filter((l) => l.workerId === worker.id && isToday(l.completedAt)).map((l) => l.taskId)}
      onStart={startTask}
      onClockOut={clockOut}
      onShowPerformance={() => setShowPerformance(true)}
    />
  );
}

function isToday(ts: number) {
  const d = new Date(ts), n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

/* ══════════════════════════════════════════════════
   Screen 1 — Worker select
══════════════════════════════════════════════════ */
function WorkerSelect({ operators, onSelect }: { operators: Operator[]; onSelect: (id: string) => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Gauge size={40} color="#F56300" style={{ marginBottom: 16 }} />
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>Who&apos;s working?</h1>
      <p style={{ fontSize: 16, color: "#9A9A9A", marginBottom: 40 }}>Tap your name to clock in</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, width: "100%", maxWidth: 720 }}>
        {operators.map((op) => (
          <button
            key={op.id}
            onClick={() => onSelect(op.id)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
              padding: "32px 20px", borderRadius: 20,
              backgroundColor: "#1F1F1F", border: "2px solid #2E2E2E",
              cursor: "pointer", transition: "border-color 0.15s, transform 0.1s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = op.color; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2E2E2E"; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <div style={{
              width: 84, height: 84, borderRadius: "50%", backgroundColor: op.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 800, color: "#fff",
            }}>
              {initials(op.name)}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 19, fontWeight: 700 }}>{op.name}</div>
              <div style={{ fontSize: 13, color: "#9A9A9A", marginTop: 2 }}>{op.role}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Screen 2 — Task queue
══════════════════════════════════════════════════ */
function Queue({
  worker, tasks, workflows, completedToday, onStart, onClockOut, onShowPerformance,
}: {
  worker: Operator; tasks: Task[]; workflows: Workflow[]; completedToday: string[];
  onStart: (taskId: string) => void; onClockOut: () => void; onShowPerformance: () => void;
}) {
  const pending = tasks.filter((t) => !completedToday.includes(t.id));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "20px 28px", borderBottom: "1px solid #262626", gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", backgroundColor: worker.color,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>
          {initials(worker.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{worker.name}</div>
          <div style={{ fontSize: 12, color: "#9A9A9A" }}>{worker.role}</div>
        </div>
        <button onClick={onShowPerformance} style={topBtn}>
          <Gauge size={16} /> My Performance
        </button>
        <button onClick={onClockOut} style={{ ...topBtn, color: "#FF6B5E", borderColor: "#4A2A26" }}>
          <LogOut size={16} /> Clock Out
        </button>
      </div>

      {/* Summary */}
      <div style={{ padding: "20px 28px 4px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Your Tasks</h2>
        <p style={{ fontSize: 14, color: "#9A9A9A", marginTop: 4 }}>
          {completedToday.length} of {tasks.length} done today
        </p>
      </div>

      {/* Task list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
        {pending.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#6B6B6B" }}>
            <Check size={40} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 16 }}>All tasks complete for today. Nice work.</p>
          </div>
        )}
        {pending.map((task) => {
          const wf = workflowFor(task, workflows);
          const isMachine = task.optionSet === "machine";
          return (
            <div
              key={task.id}
              style={{
                display: "flex", alignItems: "center", gap: 18,
                padding: "22px 24px", borderRadius: 18,
                backgroundColor: "#1F1F1F", border: "1px solid #2A2A2A",
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                backgroundColor: isMachine ? "rgba(245,99,0,0.12)" : "rgba(37,99,235,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isMachine ? <Cpu size={24} color="#F56300" /> : <User size={24} color="#4A90D9" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{task.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                  {wf && <span style={{ fontSize: 12, color: "#9A9A9A" }}>{wf.name}</span>}
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#9A9A9A" }}>
                    <Clock size={12} /> ~{task.duration}m
                  </span>
                  {isMachine && task.machineName && (
                    <span style={{ fontSize: 12, color: "#F56300" }}>{task.machineName}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onStart(task.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
                  padding: "16px 28px", borderRadius: 14, border: "none",
                  backgroundColor: "#F56300", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
                }}
              >
                <Play size={18} fill="#fff" /> Start
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const topBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 7,
  padding: "10px 16px", borderRadius: 12,
  backgroundColor: "transparent", border: "1px solid #2E2E2E", color: "#D0D0D0",
  fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0,
};

/* ══════════════════════════════════════════════════
   Screen 3 — Task execution
══════════════════════════════════════════════════ */
function TaskExecution({
  task, workflow, startedAt, onComplete, onCancel,
}: {
  task: Task; workflow: Workflow | undefined; startedAt: number;
  onComplete: () => void; onCancel: () => void;
}) {
  const elapsed = useElapsedSeconds(startedAt);
  const estimateSeconds = task.duration * 60;
  const overEstimate = elapsed > estimateSeconds;
  const [machineRunning, setMachineRunning] = useState(false);
  const [openFile, setOpenFile] = useState<TaskFile | null>(null);
  const isMachine = task.optionSet === "machine";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "18px 28px", borderBottom: "1px solid #262626" }}>
        <button
          onClick={onCancel}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#9A9A9A", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          <ChevronLeft size={18} /> Cancel Task
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 40px", maxWidth: 720, width: "100%", margin: "0 auto" }}>
        {workflow && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            {workflow.name}
          </div>
        )}
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 24 }}>{task.name}</h1>

        {/* Timer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "22px 26px", borderRadius: 18, marginBottom: 20,
          backgroundColor: overEstimate ? "rgba(255,107,94,0.1)" : "rgba(34,197,94,0.08)",
          border: `1px solid ${overEstimate ? "#4A2A26" : "#1F3A2A"}`,
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#9A9A9A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Time on task</div>
            <div style={{ fontSize: 40, fontWeight: 800, fontFamily: "monospace", color: overEstimate ? "#FF6B5E" : "#4ADE80", marginTop: 4 }}>
              {fmtClock(elapsed)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#9A9A9A" }}>Estimated</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#D0D0D0" }}>{fmtClock(estimateSeconds)}</div>
            {overEstimate && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#FF6B5E", marginTop: 4, justifyContent: "flex-end" }}>
                <AlertTriangle size={12} /> over estimate
              </div>
            )}
          </div>
        </div>

        {/* Machine panel */}
        {isMachine && (
          <div style={{ padding: "18px 22px", borderRadius: 16, backgroundColor: "#1F1F1F", border: "1px solid #2A2A2A", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Cpu size={18} color="#F56300" />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{task.machineName ?? "Machine"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: machineRunning ? "#4ADE80" : "#9A9A9A", marginTop: 2 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: machineRunning ? "#4ADE80" : "#6B6B6B" }} />
                    {machineRunning ? "Running" : "Idle"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMachineRunning((r) => !r)}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 12, border: "none",
                  backgroundColor: machineRunning ? "#3A1F1D" : "rgba(74,222,128,0.12)",
                  color: machineRunning ? "#FF6B5E" : "#4ADE80", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                <Power size={15} /> {machineRunning ? "Stop Machine" : "Start Machine"}
              </button>
            </div>
          </div>
        )}

        {/* SOP */}
        {task.sop && (
          <div style={{ padding: "18px 22px", borderRadius: 16, backgroundColor: "#1F1F1F", border: "1px solid #2A2A2A", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Instructions
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.8, color: "#E0E0E0", whiteSpace: "pre-line" }}>{task.sop}</div>
          </div>
        )}

        {/* Files */}
        {task.files && task.files.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Files
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {task.files.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setOpenFile(f)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 14,
                    backgroundColor: "#1F1F1F", border: "1px solid #2A2A2A", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{ color: "#9A9A9A" }}>{FILE_ICON[f.kind]}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{f.name}</span>
                  <span style={{ fontSize: 12, color: "#6B6B6B" }}>{f.size}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Complete button */}
      <div style={{ padding: "16px 28px 28px", maxWidth: 720, width: "100%", margin: "0 auto" }}>
        <button
          onClick={onComplete}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%",
            padding: "20px", borderRadius: 16, border: "none",
            backgroundColor: "#22C55E", color: "#0A1F12", fontSize: 18, fontWeight: 800, cursor: "pointer",
          }}
        >
          <Check size={22} strokeWidth={3} /> Complete Task
        </button>
      </div>

      {/* File preview modal (mock — no real file storage) */}
      {openFile && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}
          onClick={() => setOpenFile(null)}
        >
          <div
            style={{ width: "100%", maxWidth: 420, backgroundColor: "#1F1F1F", border: "1px solid #2E2E2E", borderRadius: 20, padding: 28, textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: "#F56300", marginBottom: 14, display: "flex", justifyContent: "center" }}>{FILE_ICON[openFile.kind]}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{openFile.name}</div>
            <div style={{ fontSize: 13, color: "#9A9A9A", marginBottom: 22 }}>{openFile.size}</div>
            <button
              onClick={() => setOpenFile(null)}
              style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", backgroundColor: "#F56300", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Screen 4 — Performance
══════════════════════════════════════════════════ */
function Performance({
  worker, logs, tasks, onBack,
}: {
  worker: Operator; logs: TaskLog[]; tasks: Task[]; onBack: () => void;
}) {
  const todaysLogs = useMemo(() => logs.filter((l) => isToday(l.completedAt)), [logs]);

  const stats = useMemo(() => {
    if (todaysLogs.length === 0) return { count: 0, onTimeRate: 0, avgVariancePct: 0 };
    let onTime = 0, varianceSum = 0;
    todaysLogs.forEach((l) => {
      const task = tasks.find((t) => t.id === l.taskId);
      if (!task) return;
      const actualMin = (l.completedAt - l.startedAt) / 60000;
      if (actualMin <= task.duration) onTime++;
      varianceSum += ((actualMin - task.duration) / task.duration) * 100;
    });
    return {
      count: todaysLogs.length,
      onTimeRate: Math.round((onTime / todaysLogs.length) * 100),
      avgVariancePct: Math.round(varianceSum / todaysLogs.length),
    };
  }, [todaysLogs, tasks]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "18px 28px", borderBottom: "1px solid #262626" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#9A9A9A", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <ChevronLeft size={18} /> Back to Tasks
        </button>
      </div>

      <div style={{ padding: "24px 28px 40px", maxWidth: 640, width: "100%", margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{worker.name}&apos;s Performance</h1>
        <p style={{ fontSize: 14, color: "#9A9A9A", marginBottom: 24 }}>Today</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
          <StatTile label="Completed" value={String(stats.count)} />
          <StatTile label="On-Time Rate" value={`${stats.onTimeRate}%`} accent={stats.onTimeRate >= 70 ? "#4ADE80" : "#FF6B5E"} />
          <StatTile
            label="Avg vs Estimate"
            value={`${stats.avgVariancePct > 0 ? "+" : ""}${stats.avgVariancePct}%`}
            accent={stats.avgVariancePct <= 0 ? "#4ADE80" : "#FF6B5E"}
          />
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Completed Today
        </div>
        {todaysLogs.length === 0 ? (
          <p style={{ fontSize: 14, color: "#6B6B6B" }}>No tasks completed yet today.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todaysLogs.map((l) => {
              const task = tasks.find((t) => t.id === l.taskId);
              if (!task) return null;
              const actualMin = Math.round((l.completedAt - l.startedAt) / 60000);
              const over = actualMin > task.duration;
              return (
                <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 14, backgroundColor: "#1F1F1F", border: "1px solid #2A2A2A" }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{task.name}</span>
                  <span style={{ fontSize: 13, color: over ? "#FF6B5E" : "#4ADE80", fontWeight: 700 }}>
                    {actualMin}m <span style={{ color: "#6B6B6B", fontWeight: 500 }}>/ {task.duration}m est</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ padding: "18px 14px", borderRadius: 14, backgroundColor: "#1F1F1F", border: "1px solid #2A2A2A", textAlign: "center" }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent ?? "#F0F0F0" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 4 }}>{label}</div>
    </div>
  );
}
