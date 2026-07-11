"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant,
  Controls, Panel, useNodesState, useEdgesState, useReactFlow,
  addEdge, Handle, Position,
  type Node, type Edge, type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ListTodo, Zap, Building2, ChevronRight, Plus,
  Cpu, User2, Workflow, Clock, Search, ArrowLeft, DollarSign,
  Copy, Trash2, Lock, PenLine, Maximize2, Minimize2,
} from "lucide-react";
import { TasksContent } from "@/app/(dashboard)/processes/[productId]/tasks/page";
import { ResizableDivider } from "@/components/ui/resizable-divider";
import {
  FactoryFloorBuilder, useDarkMode, FACTORY_DARK, FACTORY_LIGHT,
  type FactorySnapshot,
} from "@/components/factory/FactoryFloorBuilder";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import { useFactoryStore } from "@/stores/useFactoryStore";
import { usePlanOverlayStore } from "@/stores/usePlanOverlayStore";
import type { FactoryZone, FactoryZoneNode, FactoryFlowPath, FactoryWall, WorkflowAttachment } from "@/types/factory";
import { StartEndNode } from "@/components/manufacturing/StartEndNode";

/* ══════════════════════════════════════════════════
   Types
══════════════════════════════════════════════════ */
interface Plan {
  id: string;
  productId: string;
  name: string;
  savedAt: string;
  rfNodes: Node[];
  rfEdges: Edge[];
}

interface FactoryLayout {
  id:               string;
  name:             string;
  savedAt:          string;
  zones:            FactoryZone[];
  nodes:            FactoryZoneNode[];
  edges:            FactoryFlowPath[];
  walls:            FactoryWall[];
  planAttachments?: WorkflowAttachment[];
}

/* ══════════════════════════════════════════════════
   Demo / static data
══════════════════════════════════════════════════ */
const MOCK_PRODUCTS = [
  { id: "p1", name: "Ingane",        model: "1.0" },
  { id: "p2", name: "Alublack Trey", model: "2.1" },
  { id: "p3", name: "ProFlex 3000",  model: "1.5" },
];

const TM_PRODUCTS = [
  { id: "p1", name: "Ingane",        model: "1.0", workflows: 3, tasks: 12 },
  { id: "p2", name: "Alublack Trey", model: "1.0", workflows: 2, tasks: 8  },
];

const PLANNER_DEMO = {
  tasks: [
    { id: "t1", name: "Cut & Prep Materials", duration: 45,  optionSet: "machine" as const },
    { id: "t2", name: "Frame Assembly",       duration: 120, optionSet: "human"   as const },
    { id: "t3", name: "Wiring & Electronics", duration: 90,  optionSet: "human"   as const },
    { id: "t4", name: "QC Inspection",        duration: 30,  optionSet: "human"   as const },
    { id: "t5", name: "Paint & Polish",       duration: 60,  optionSet: "machine" as const },
  ],
  workflows: [
    { id: "w1", name: "Core Build",   taskIds: ["t1", "t2"] },
    { id: "w2", name: "Final Finish", taskIds: ["t4", "t5"] },
    { id: "w3", name: "QC & Wiring",  taskIds: ["t3", "t4"] },
  ],
};

const EDGE_BASE = {
  style: { stroke: "#F56300", strokeWidth: 2 },
  markerEnd: { type: "arrowclosed" as const, color: "#F56300" },
  interactionWidth: 20,
};

function makePlanNodes(wfIds: string[]): Node[] {
  return [
    { id: "start", type: "startEnd", position: { x: 60, y: 155 }, data: { label: "Start", type: "start" }, draggable: true },
    ...wfIds.map((wfId, i) => ({
      id: `wf-${wfId}`, type: "wfPlan",
      position: { x: 230 + i * 295, y: 90 },
      data: { workflowId: wfId, name: PLANNER_DEMO.workflows.find(w => w.id === wfId)?.name ?? "Workflow" },
      draggable: true,
    })),
    { id: "end", type: "startEnd", position: { x: 230 + wfIds.length * 295, y: 155 }, data: { label: "End", type: "end" }, draggable: true },
  ];
}

function makePlanEdges(wfIds: string[]): Edge[] {
  const chain = ["start", ...wfIds.map(id => `wf-${id}`), "end"];
  return chain.slice(0, -1).map((src, i) => ({ id: `e${i}`, source: src, target: chain[i + 1], ...EDGE_BASE }));
}

const SEED_PLANS: Plan[] = [
  { id: "plan1", productId: "p1", name: "Standard Build",  savedAt: "2026-07-01",
    rfNodes: makePlanNodes(["w1", "w2"]), rfEdges: makePlanEdges(["w1", "w2"]) },
  { id: "plan2", productId: "p1", name: "Expedited Build", savedAt: "2026-06-28",
    rfNodes: makePlanNodes(["w1"]),       rfEdges: makePlanEdges(["w1"]) },
];

/* ══════════════════════════════════════════════════
   Formatters
══════════════════════════════════════════════════ */
const fmtMin = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
};
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
const fmtRand = (n: number) =>
  `R ${Math.round(n).toLocaleString("en-ZA")}`;

/* ══════════════════════════════════════════════════
   Custom ReactFlow nodes — defined at module level
   so ReactFlow never remounts them on re-render
══════════════════════════════════════════════════ */
function WfPlanNode({ data }: { data: { workflowId: string; name: string } }) {
  const { workflows, tasks } = useManufacturingStore();
  const wf       = workflows.find(w => w.id === data.workflowId);
  const wfTasks  = (wf?.taskIds ?? [])
    .map(id => tasks.find(t => t.id === id)).filter(Boolean) as typeof tasks;
  const totalMin = wfTasks.reduce((s, t) => s + t.duration, 0);
  return (
    <>
      <Handle type="target" position={Position.Left}
        style={{ background: "#F56300", width: 10, height: 10, border: "2px solid var(--bg)" }} />
      <div style={{ width: 240, backgroundColor: "var(--surface)", border: "1.5px solid rgba(245,99,0,0.35)",
        borderRadius: 10, overflow: "hidden", userSelect: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "8px 12px", backgroundColor: "rgba(245,99,0,0.12)",
          borderBottom: "1px solid rgba(245,99,0,0.2)",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Workflow size={12} color="#F56300" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#F56300" }}>{data.name}</span>
          </div>
          <span style={{ fontSize: 10, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 3 }}>
            <Clock size={9} />{" "}{fmtMin(totalMin)}
          </span>
        </div>
        <div style={{ padding: "6px 12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {wfTasks.map((t, i) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, color: "var(--text-tertiary)", width: 12, textAlign: "right" }}>{i + 1}</span>
              {t.optionSet === "machine" ? <Cpu size={9} color="#2563EB" /> : <User2 size={9} color="#059669" />}
              <span style={{ fontSize: 10, color: "var(--text-primary)", flex: 1 }}>{t.name}</span>
              <span style={{ fontSize: 9, color: "var(--text-tertiary)" }}>{fmtMin(t.duration)}</span>
            </div>
          ))}
          {wfTasks.length === 0 &&
            <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontStyle: "italic" }}>No tasks assigned</span>}
        </div>
      </div>
      <Handle type="source" position={Position.Right}
        style={{ background: "#F56300", width: 10, height: 10, border: "2px solid var(--bg)" }} />
    </>
  );
}

function TaskPlanNode({ data }: { data: { name: string; duration: number; optionSet: "human" | "machine" } }) {
  const isMachine = data.optionSet === "machine";
  return (
    <>
      <Handle type="target" position={Position.Left}
        style={{ background: isMachine ? "#2563EB" : "#059669", width: 8, height: 8, border: "2px solid var(--bg)" }} />
      <div style={{ width: 200, backgroundColor: "var(--surface)",
        border: `1.5px solid ${isMachine ? "rgba(37,99,235,0.35)" : "rgba(5,150,105,0.35)"}`,
        borderRadius: 8, padding: "8px 12px", userSelect: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          {isMachine ? <Cpu size={11} color="#2563EB" /> : <User2 size={11} color="#059669" />}
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{data.name}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
            backgroundColor: isMachine ? "rgba(37,99,235,0.15)" : "rgba(5,150,105,0.15)",
            color: isMachine ? "#2563EB" : "#059669" }}>
            {data.optionSet}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{fmtMin(data.duration)}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right}
        style={{ background: isMachine ? "#2563EB" : "#059669", width: 8, height: 8, border: "2px solid var(--bg)" }} />
    </>
  );
}

const WF_NODE_TYPES  = { startEnd: StartEndNode, wfPlan:   WfPlanNode };
const TASK_NODE_TYPES = { startEnd: StartEndNode, taskPlan: TaskPlanNode };

/* ══════════════════════════════════════════════════
   Cost / critical-path calculator
══════════════════════════════════════════════════ */
function reachable(fromId: string, toId: string, succ: Record<string, string[]>): boolean {
  const visited = new Set<string>();
  const queue = [fromId];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === toId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    (succ[cur] ?? []).forEach(n => queue.push(n));
  }
  return false;
}

function calcMetrics(rfNodes: Node[], rfEdges: Edge[], workflows: any[], tasks: any[]) {
  const succ: Record<string, string[]> = {};
  const pred: Record<string, string[]> = {};
  rfNodes.forEach(n => { succ[n.id] = []; pred[n.id] = []; });
  rfEdges.forEach(e => { succ[e.source]?.push(e.target); pred[e.target]?.push(e.source); });

  // No connected path → no estimate
  if (!reachable("start", "end", succ)) {
    return { criticalTime: null as null, laborCost: 0, machineCost: 0, total: 0 };
  }

  const nodeDur = (id: string) => {
    const n = rfNodes.find(x => x.id === id);
    if (!n || n.type !== "wfPlan") return 0;
    const wf = workflows.find((w: any) => w.id === n.data.workflowId);
    return (wf?.taskIds ?? []).reduce((s: number, tid: string) =>
      s + (tasks.find((x: any) => x.id === tid)?.duration ?? 0), 0);
  };

  // Critical path via dynamic programming (handles parallel branches — takes MAX)
  const cache: Record<string, number> = {};
  const earliest = (id: string): number => {
    if (id in cache) return cache[id];
    const ps = pred[id] ?? [];
    cache[id] = ps.length === 0 ? 0 : Math.max(...ps.map(p => earliest(p) + nodeDur(p)));
    return cache[id];
  };
  rfNodes.forEach(n => earliest(n.id));
  const criticalTime = earliest("end");

  // Sum costs only for nodes that are on the critical path (reachable from start AND can reach end)
  let laborCost = 0, machineCost = 0;
  const seen = new Set<string>();
  rfNodes.forEach(n => {
    if (n.type !== "wfPlan") return;
    // Only count if this node is on a path from start to end
    if (!reachable("start", n.id, succ)) return;
    if (!reachable(n.id, "end", succ)) return;
    const wfId = n.data.workflowId as string;
    if (seen.has(wfId)) return;
    seen.add(wfId);
    const wf = workflows.find((w: any) => w.id === wfId);
    (wf?.taskIds ?? []).forEach((tid: string) => {
      const t = tasks.find((x: any) => x.id === tid);
      if (!t) return;
      if (t.optionSet === "human") laborCost  += (t.duration / 60) * 85;
      else                         machineCost += (t.duration / 60) * 60;
    });
  });
  return { criticalTime, laborCost, machineCost, total: laborCost + machineCost };
}

/* ══════════════════════════════════════════════════
   Workflow canvas (inside ReactFlowProvider)
══════════════════════════════════════════════════ */
function WorkflowCanvasInner({
  planKey, initNodes, initEdges, workflows,
  onNodeClick, onCanvasChange, editMode,
}: {
  planKey: string;
  initNodes: Node[];
  initEdges: Edge[];
  workflows: any[];
  onNodeClick: (wfId: string) => void;
  onCanvasChange: (nodes: Node[], edges: Edge[]) => void;
  editMode: boolean;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  const { screenToFlowPosition } = useReactFlow();
  const cbRef = useRef(onCanvasChange);
  cbRef.current = onCanvasChange;

  useEffect(() => { cbRef.current(nodes, edges); }, [nodes, edges]);

  const onConnect = useCallback(
    (c: Connection) => setEdges(es => addEdge({ ...c, ...EDGE_BASE }, es)),
    [setEdges],
  );
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!editMode) return;
    e.preventDefault(); e.dataTransfer.dropEffect = "copy";
  }, [editMode]);
  const onDrop = useCallback((e: React.DragEvent) => {
    if (!editMode) return;
    e.preventDefault();
    const wfId = e.dataTransfer.getData("wf-id");
    if (!wfId) return;
    const wf = workflows.find((w: any) => w.id === wfId);
    if (!wf) return;
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setNodes(ns => [...ns, {
      id: `wf-${wfId}-${Date.now()}`, type: "wfPlan",
      position: pos,
      data: { workflowId: wfId, name: wf.name },
      draggable: true,
    }]);
  }, [editMode, workflows, screenToFlowPosition, setNodes]);

  return (
    <ReactFlow
      nodes={nodes} edges={edges}
      nodeTypes={WF_NODE_TYPES}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      onConnect={onConnect} onDragOver={onDragOver} onDrop={onDrop}
      onNodeClick={(_, node) => { if (node.type === "wfPlan") onNodeClick(node.data.workflowId as string); }}
      fitView fitViewOptions={{ padding: 0.3 }}
      deleteKeyCode={editMode ? ["Delete", "Backspace"] : []}
      nodesDraggable={editMode} nodesConnectable={editMode}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ ...EDGE_BASE, interactionWidth: 20 }}
      connectionLineStyle={{ stroke: "#F56300", strokeWidth: 2, strokeDasharray: "6 3" }}
      edgesFocusable
    >
      <Background id="bg-minor" variant={BackgroundVariant.Lines} gap={20}  lineWidth={0.4} color="var(--border)" style={{ backgroundColor: "var(--bg)" }} />
      <Background id="bg-major" variant={BackgroundVariant.Lines} gap={100} lineWidth={0.8} color="var(--border)" />
      <Controls style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
    </ReactFlow>
  );
}

/* ══════════════════════════════════════════════════
   Task canvas (inside ReactFlowProvider)
══════════════════════════════════════════════════ */
function TaskCanvasInner({ workflowId, workflowName, workflows, tasks, onBack, editMode }: {
  workflowId: string; workflowName: string;
  workflows: any[]; tasks: any[];
  onBack: () => void; editMode: boolean;
}) {
  const wf = workflows.find((w: any) => w.id === workflowId);
  const wfTasks = (wf?.taskIds ?? []).map((id: string) => tasks.find((t: any) => t.id === id)).filter(Boolean);

  const initNodes: Node[] = [
    { id: "start", type: "startEnd", position: { x: 60, y: 120 }, data: { label: "Start", type: "start" }, draggable: true },
    ...wfTasks.map((t: any, i: number) => ({
      id: `task-${t.id}`, type: "taskPlan",
      position: { x: 210 + i * 255, y: 78 },
      data: { name: t.name, duration: t.duration, optionSet: t.optionSet },
      draggable: true,
    })),
    { id: "end", type: "startEnd", position: { x: 210 + wfTasks.length * 255, y: 120 }, data: { label: "End", type: "end" }, draggable: true },
  ];
  const chain = ["start", ...wfTasks.map((t: any) => `task-${t.id}`), "end"];
  const TASK_EDGE = { style: { stroke: "#3B82F6", strokeWidth: 2 }, markerEnd: { type: "arrowclosed" as const, color: "#3B82F6" }, interactionWidth: 20 };
  const initEdges: Edge[] = chain.slice(0, -1).map((src, i) => ({ id: `te${i}`, source: src, target: chain[i + 1], ...TASK_EDGE }));

  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  const onConnect = useCallback(
    (c: Connection) => setEdges(es => addEdge({ ...c, ...TASK_EDGE }, es)),
    [setEdges],
  );

  return (
    <ReactFlow
      nodes={nodes} edges={edges} nodeTypes={TASK_NODE_TYPES}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
      fitView fitViewOptions={{ padding: 0.3 }}
      deleteKeyCode={editMode ? ["Delete", "Backspace"] : []}
      nodesDraggable={editMode} nodesConnectable={editMode}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ interactionWidth: 20 }}
      edgesFocusable
      connectionLineStyle={{ stroke: "#3B82F6", strokeWidth: 2, strokeDasharray: "6 3" }}
    >
      <Background id="bg-minor" variant={BackgroundVariant.Lines} gap={20}  lineWidth={0.4} color="var(--border)" style={{ backgroundColor: "var(--bg)" }} />
      <Background id="bg-major" variant={BackgroundVariant.Lines} gap={100} lineWidth={0.8} color="var(--border)" />
      <Controls style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
      <Panel position="top-left">
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px 6px 10px",
            backgroundColor: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, cursor: "pointer", color: "var(--text-primary)",
            fontSize: 13, fontWeight: 600,
            transition: "border-color 0.12s, color 0.12s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#F56300";
            (e.currentTarget as HTMLButtonElement).style.color = "#F56300";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
          }}
        >
          <ArrowLeft size={13} />
          {workflowName}
        </button>
      </Panel>
    </ReactFlow>
  );
}

/* ══════════════════════════════════════════════════
   Workflow library item (draggable)
══════════════════════════════════════════════════ */
function WorkflowLibItem({ wf, tasks }: { wf: any; tasks: any[] }) {
  const wfTasks = (wf.taskIds ?? []).map((id: string) => tasks.find((t: any) => t.id === id)).filter(Boolean);
  const totalMin = wfTasks.reduce((s: number, t: any) => s + t.duration, 0);
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData("wf-id", wf.id); e.dataTransfer.effectAllowed = "copy"; }}
      style={{ padding: "9px 12px", backgroundColor: "rgba(245,99,0,0.07)",
        border: "1px solid rgba(245,99,0,0.22)", borderRadius: 8, cursor: "grab",
        userSelect: "none", transition: "border-color 0.1s" }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "#F56300"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(245,99,0,0.22)"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{wf.name}</span>
        <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600 }}>{fmtMin(totalMin)}</span>
      </div>
      {wfTasks.map((task: any, i: number) => (
        <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <span style={{ fontSize: 9, color: "var(--text-tertiary)", width: 10, textAlign: "right" }}>{i + 1}</span>
          {task.optionSet === "machine" ? <Cpu size={9} color="#2563EB" /> : <User2 size={9} color="#059669" />}
          <span style={{ fontSize: 10, color: "var(--text-secondary)", flex: 1 }}>{task.name}</span>
          <span style={{ fontSize: 9, color: "var(--text-tertiary)" }}>{fmtMin(task.duration)}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Cost & Time right panel
══════════════════════════════════════════════════ */
function CostTimePanel({
  rfNodes, rfEdges, workflows, tasks, drillWfId,
}: {
  rfNodes: Node[]; rfEdges: Edge[];
  workflows: any[]; tasks: any[];
  drillWfId: string | null;
}) {
  const { criticalTime, laborCost, machineCost, total } = calcMetrics(rfNodes, rfEdges, workflows, tasks);

  const drillWf    = drillWfId ? workflows.find((w: any) => w.id === drillWfId) : null;
  const drillTasks = drillWf
    ? (drillWf.taskIds ?? []).map((id: string) => tasks.find((t: any) => t.id === id)).filter(Boolean)
    : [];
  const drillTime    = drillTasks.reduce((s: number, t: any) => s + t.duration, 0);
  let   drillLabor   = 0, drillMachine = 0;
  drillTasks.forEach((t: any) => {
    if (t.optionSet === "human") drillLabor  += (t.duration / 60) * 85;
    else                         drillMachine += (t.duration / 60) * 60;
  });

  const section = (label: string) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase",
      letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
  );
  const row = (label: string, val: string, highlight?: boolean) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: highlight ? 700 : 500, color: highlight ? "var(--accent)" : "var(--text-primary)" }}>{val}</span>
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* On-canvas list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {section(drillWfId ? "Tasks in workflow" : "On canvas")}
        {drillWfId ? (
          drillTasks.length === 0
            ? <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>No tasks in this workflow.</p>
            : drillTasks.map((t: any, i: number) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0",
                borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 9, color: "var(--text-tertiary)", width: 14 }}>{i + 1}</span>
                {t.optionSet === "machine" ? <Cpu size={9} color="#2563EB" /> : <User2 size={9} color="#059669" />}
                <span style={{ flex: 1, fontSize: 11, color: "var(--text-primary)" }}>{t.name}</span>
                <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{fmtMin(t.duration)}</span>
              </div>
            ))
        ) : (
          rfNodes.filter(n => n.type === "wfPlan").length === 0
            ? <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>Drag workflows onto the canvas.</p>
            : rfNodes.filter(n => n.type === "wfPlan").map(n => {
              const wf = workflows.find((w: any) => w.id === n.data.workflowId);
              const dur = (wf?.taskIds ?? [])
                .reduce((s: number, id: string) => s + (tasks.find((t: any) => t.id === id)?.duration ?? 0), 0);
              return (
                <div key={n.id} style={{ display: "flex", justifyContent: "space-between",
                  padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, color: "var(--text-primary)" }}>{n.data.name as string}</span>
                  <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{fmtMin(dur)}</span>
                </div>
              );
            })
        )}
      </div>

      {/* Prediction */}
      <div style={{ padding: "14px", borderTop: "1px solid var(--border)", backgroundColor: "var(--bg)", flexShrink: 0 }}>
        {section(drillWfId ? "Workflow estimate" : "Plan estimate")}
        {drillWfId ? (
          <>
            {row("Duration",  fmtMin(drillTime))}
            <div style={{ height: 1, backgroundColor: "var(--border)", margin: "4px 0" }} />
            {row("Labour",    fmtRand(drillLabor))}
            {row("Machine",   fmtRand(drillMachine))}
            {row("Materials", "—")}
            <div style={{ height: 1, backgroundColor: "var(--border)", margin: "6px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Per unit</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{fmtRand(drillLabor + drillMachine)}</span>
            </div>
          </>
        ) : criticalTime === null ? (
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic", lineHeight: 1.6 }}>
            Connect Start → workflows → End to see time and cost estimates.
          </p>
        ) : (
          <>
            {row("Critical path", fmtMin(criticalTime))}
            <div style={{ height: 1, backgroundColor: "var(--border)", margin: "4px 0" }} />
            {row("Labour",    fmtRand(laborCost))}
            {row("Machine",   fmtRand(machineCost))}
            {row("Materials", "—")}
            <div style={{ height: 1, backgroundColor: "var(--border)", margin: "6px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Per unit</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{fmtRand(total)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Production Planner Tab
══════════════════════════════════════════════════ */
function ProductionPlannerTab() {
  const [view,         setView]         = useState<"landing" | "edit">("landing");
  const [selectedProd, setSelectedProd] = useState("p1");
  const [searchQ,      setSearchQ]      = useState("");
  const [plans,        setPlans]        = useState<Plan[]>(SEED_PLANS);
  const [activePlan,   setActivePlan]   = useState<Plan | null>(null);
  const [drillWfId,    setDrillWfId]    = useState<string | null>(null);
  const [canvasNodes,  setCanvasNodes]  = useState<Node[]>([]);
  const [canvasEdges,  setCanvasEdges]  = useState<Edge[]>([]);
  const [isEditMode,   setIsEditMode]   = useState(false);
  const [libWidth,     setLibWidth]     = useState(200);
  const [costWidth,    setCostWidth]    = useState(220);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) editorRef.current?.requestFullscreen()?.catch(() => {});
      else document.exitFullscreen()?.catch(() => {});
    } catch { /* Fullscreen API unavailable/blocked in this context */ }
  };

  useEffect(() => {
    if (view !== "edit") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view]);

  const { setData, workflows, tasks } = useManufacturingStore();
  const setOverlayPlans = usePlanOverlayStore(s => s.setPlans);

  useEffect(() => {
    if (useManufacturingStore.getState().tasks.length === 0) setData(PLANNER_DEMO);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const palette = ["#F56300", "#2563EB", "#059669", "#7C3AED", "#DC2626", "#0891B2"];
    const overlayPlans = plans.map(plan => {
      const seen = new Set<string>();
      const wfEntries = plan.rfNodes
        .filter(n => n.type === "wfPlan")
        .map(n => (n.data as { workflowId: string }).workflowId)
        .filter(wfId => (seen.has(wfId) ? false : (seen.add(wfId), true)))
        .map((wfId, i) => {
          const wf = workflows.find((w: any) => w.id === wfId);
          const durationMin = (wf?.taskIds ?? []).reduce((s: number, tid: string) =>
            s + (tasks.find((t: any) => t.id === tid)?.duration ?? 0), 0);
          return {
            id: wfId,
            name: wf?.name ?? "Workflow",
            durationH: Math.round((durationMin / 60) * 100) / 100,
            color: palette[i % palette.length],
          };
        });
      return { id: plan.id, name: plan.name, workflows: wfEntries };
    });
    setOverlayPlans(overlayPlans);
  }, [plans, workflows, tasks, setOverlayPlans]);

  const filteredProducts = MOCK_PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(searchQ.toLowerCase()));

  const productPlans = plans.filter(p => p.productId === selectedProd);
  const activeProd   = MOCK_PRODUCTS.find(p => p.id === selectedProd);

  const openPlan = (plan: Plan) => {
    setActivePlan(plan);
    setCanvasNodes(plan.rfNodes);
    setCanvasEdges(plan.rfEdges);
    setDrillWfId(null);
    setIsEditMode(false);
    setView("edit");
  };

  const createPlan = () => {
    const id = `plan-${Date.now()}`;
    const blank: Plan = {
      id, productId: selectedProd, name: "New Production Plan",
      savedAt: new Date().toISOString().slice(0, 10),
      rfNodes: [
        { id: "start", type: "startEnd", position: { x: 100, y: 155 }, data: { label: "Start", type: "start" }, draggable: true },
        { id: "end",   type: "startEnd", position: { x: 400, y: 155 }, data: { label: "End",   type: "end"   }, draggable: true },
      ],
      rfEdges: [],
    };
    setPlans(prev => [...prev, blank]);
    openPlan(blank);
  };

  const savePlan = () => {
    if (!activePlan) return;
    const updated: Plan = { ...activePlan, rfNodes: canvasNodes, rfEdges: canvasEdges, savedAt: new Date().toISOString().slice(0, 10) };
    setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
    setActivePlan(updated);
  };

  const duplicatePlan = () => {
    if (!activePlan) return;
    const copy: Plan = {
      ...activePlan,
      id: `plan-${Date.now()}`,
      name: `${activePlan.name} (copy)`,
      savedAt: new Date().toISOString().slice(0, 10),
      rfNodes: [...canvasNodes],
      rfEdges: [...canvasEdges],
    };
    setPlans(prev => [...prev, copy]);
  };

  const deletePlan = () => {
    if (!activePlan) return;
    setPlans(prev => prev.filter(p => p.id !== activePlan.id));
    setActivePlan(null);
    setDrillWfId(null);
    setView("landing");
  };

  const onCanvasChange = useCallback((ns: Node[], es: Edge[]) => {
    setCanvasNodes(ns);
    setCanvasEdges(es);
  }, []);

  /* ── Landing ────────────────────────────────── */
  if (view === "landing") {
    return (
      <div style={{ width: "100%", height: "100%", overflowY: "auto", backgroundColor: "var(--bg)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Zap size={20} color="var(--accent)" />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Production Planner
            </h2>
          </div>

          {/* Product search */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
              Select product
            </label>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }} />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search products…"
                style={{ width: "100%", height: 40, border: "1px solid var(--border)", borderRadius: 10,
                  paddingLeft: 36, paddingRight: 12, fontSize: 14, color: "var(--text-primary)",
                  backgroundColor: "var(--surface)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredProducts.map(p => (
                <button key={p.id} onClick={() => setSelectedProd(p.id)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 16px",
                    backgroundColor: selectedProd === p.id ? "rgba(245,99,0,0.06)" : "var(--surface)",
                    border: `1px solid ${selectedProd === p.id ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 10, cursor: "pointer", width: "100%", transition: "all 0.12s" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    backgroundColor: selectedProd === p.id ? "rgba(245,99,0,0.12)" : "var(--bg)",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Workflow size={17} color={selectedProd === p.id ? "var(--accent)" : "var(--text-tertiary)"} strokeWidth={1.5} />
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>
                      Model {p.model} · {plans.filter(pl => pl.productId === p.id).length} production plans
                    </div>
                  </div>
                  {selectedProd === p.id && <ChevronRight size={16} color="var(--accent)" />}
                </button>
              ))}
            </div>
          </div>

          {/* Plans for selected product */}
          {activeProd && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
                Production plans — {activeProd.name}
              </label>

              {/* New plan button */}
              <button onClick={createPlan}
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", width: "100%",
                  backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
                  cursor: "pointer", marginBottom: 8, transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  backgroundColor: "var(--bg)", border: "1px dashed var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={18} color="var(--accent)" strokeWidth={2} />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>New production plan</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    Start with a blank canvas for {activeProd.name}
                  </div>
                </div>
                <ChevronRight size={16} color="var(--text-tertiary)" />
              </button>

              {/* Existing plans */}
              {productPlans.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-tertiary)", fontStyle: "italic", textAlign: "center", padding: "24px 0" }}>
                  No production plans yet.
                </p>
              ) : productPlans.map(plan => {
                const wfCount  = plan.rfNodes.filter(n => n.type === "wfPlan").length;
                const m        = calcMetrics(plan.rfNodes, plan.rfEdges, workflows, tasks);
                const hasRoute = m.criticalTime !== null;
                return (
                  <button key={plan.id} onClick={() => openPlan(plan)}
                    style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", width: "100%",
                      backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
                      cursor: "pointer", marginBottom: 8, transition: "border-color 0.15s", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      backgroundColor: "rgba(245,99,0,0.08)", border: "1px solid rgba(245,99,0,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Zap size={18} color="var(--accent)" strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{plan.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Saved {fmtDate(plan.savedAt)}</span>
                        {wfCount > 0 && (
                          <>
                            <span style={{ color: "var(--border)" }}>·</span>
                            <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 3,
                              color: "var(--text-secondary)" }}>
                              <Workflow size={10} />{wfCount} workflow{wfCount !== 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                        {hasRoute && (
                          <>
                            <span style={{ color: "var(--border)" }}>·</span>
                            <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 3,
                              color: "var(--text-secondary)" }}>
                              <Clock size={10} />{fmtMin(m.criticalTime!)}
                            </span>
                            <span style={{ color: "var(--border)" }}>·</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>
                              {fmtRand(m.total)}/unit
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Editor ─────────────────────────────────── */
  if (!activePlan) return null;

  const drillWorkflow = drillWfId ? workflows.find(w => w.id === drillWfId) : null;

  return (
    <div ref={editorRef} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "var(--bg)" }}>
      {/* Editor header */}
      <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 16px",
        backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)", flexShrink: 0, gap: 10 }}>
        <button onClick={() => { setView("landing"); setDrillWfId(null); }}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
            cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, padding: "0 4px", flexShrink: 0 }}>
          <ArrowLeft size={14} /> Plans
        </button>
        <span style={{ color: "var(--border)" }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flexShrink: 0 }}>{activePlan.name}</span>
        {drillWorkflow && (
          <>
            <span style={{ color: "var(--border)" }}>›</span>
            <button onClick={() => setDrillWfId(null)}
              style={{ fontSize: 13, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>
              {drillWorkflow.name}
            </button>
          </>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={duplicatePlan} title="Duplicate plan"
          style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", color: "var(--text-secondary)",
            transition: "border-color 0.12s, color 0.12s", flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--text-tertiary)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}>
          <Copy size={13} />
        </button>
        <button onClick={deletePlan} title="Delete plan"
          style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", color: "var(--text-secondary)",
            transition: "border-color 0.12s, color 0.12s", flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}>
          <Trash2 size={13} />
        </button>
        <div style={{ width: 1, height: 20, backgroundColor: "var(--border)", flexShrink: 0 }} />
        <button
          onClick={() => setIsEditMode(m => !m)}
          title={isEditMode ? "Lock (view mode)" : "Unlock (edit mode)"}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 10px", height: 28,
            border: `1px solid ${isEditMode ? "#F5630066" : "var(--border)"}`,
            borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0,
            backgroundColor: isEditMode ? "rgba(245,99,0,0.12)" : "transparent",
            color: isEditMode ? "var(--accent)" : "var(--text-secondary)", transition: "all 0.15s" }}
        >
          {isEditMode ? <PenLine size={12} /> : <Lock size={12} />}
          {isEditMode ? "Editing" : "View"}
        </button>
        <div style={{ width: 1, height: 20, backgroundColor: "var(--border)", flexShrink: 0 }} />
        <button onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
          style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", color: "var(--text-secondary)",
            transition: "border-color 0.12s, color 0.12s", flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--text-tertiary)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}>
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
        <div style={{ width: 1, height: 20, backgroundColor: "var(--border)", flexShrink: 0 }} />
        <button onClick={savePlan}
          style={{ padding: "0 16px", height: 28, backgroundColor: "var(--accent)", border: "none",
            borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
          Save plan
        </button>
      </div>

      {/* Editor body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: workflow library */}
        {!drillWfId && (<>
          <div style={{ width: libWidth, minWidth: libWidth, backgroundColor: "var(--surface)",
            display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0, position: "relative" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Workflows
              </span>
              <p style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 3, lineHeight: 1.5, marginBottom: 0 }}>
                {isEditMode ? "Drag onto canvas" : "Enable edit mode to drag"}
              </p>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8,
              opacity: isEditMode ? 1 : 0.35, pointerEvents: isEditMode ? "auto" : "none", transition: "opacity 0.15s" }}>
              {(() => {
                const placedIds = new Set(
                  canvasNodes.filter(n => n.type === "wfPlan").map(n => n.data.workflowId as string)
                );
                const available = workflows.filter(wf => !placedIds.has(wf.id));
                if (available.length === 0 && workflows.length > 0)
                  return <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>All workflows are on the canvas.</p>;
                if (workflows.length === 0)
                  return <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>No workflows. Add them in the Task Manager.</p>;
                return available.map(wf => <WorkflowLibItem key={wf.id} wf={wf} tasks={tasks} />);
              })()}
            </div>
          </div>
          <ResizableDivider onDrag={dx => setLibWidth(w => Math.max(140, Math.min(380, w + dx)))} />
        </>)}

        {/* Center: canvas */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ReactFlowProvider>
            {drillWfId ? (
              <TaskCanvasInner
                key={drillWfId}
                workflowId={drillWfId}
                workflowName={drillWorkflow?.name ?? "Workflow"}
                workflows={workflows}
                tasks={tasks}
                onBack={() => setDrillWfId(null)}
                editMode={isEditMode}
              />
            ) : (
              <WorkflowCanvasInner
                key={activePlan.id}
                planKey={activePlan.id}
                initNodes={canvasNodes}
                initEdges={canvasEdges}
                workflows={workflows}
                onNodeClick={setDrillWfId}
                onCanvasChange={onCanvasChange}
                editMode={isEditMode}
              />
            )}
          </ReactFlowProvider>
        </div>

        {/* Right: cost & time */}
        <ResizableDivider onDrag={dx => setCostWidth(w => Math.max(140, Math.min(380, w - dx)))} />
        <div style={{ width: costWidth, minWidth: costWidth, backgroundColor: "var(--surface)",
          display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <DollarSign size={12} color="var(--text-tertiary)" />
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Cost & Time
              </span>
            </div>
          </div>
          <CostTimePanel
            rfNodes={canvasNodes} rfEdges={canvasEdges}
            workflows={workflows} tasks={tasks}
            drillWfId={drillWfId}
          />
        </div>
      </div>

      {/* Status bar */}
      <div style={{ height: 24, display: "flex", alignItems: "center", padding: "0 16px",
        backgroundColor: "var(--bg)", borderTop: "1px solid var(--border)", gap: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: "var(--text-tertiary)", fontFamily: "monospace" }}>
          {drillWfId
            ? "drag tasks · del key removes · draw connections between tasks"
            : "drag workflow from library · click node to inspect tasks · del key removes · connect for parallel"}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Factory Tab — layout landing + editor
══════════════════════════════════════════════════ */
/*
  Mock layout — exercises every builder feature at once:
  - 4 zone types across the floor
  - a perimeter + two full-span dividers, so the dividers meet the
    perimeter as T-junctions and cross each other as a 4-way junction
  - one walkway segment (distinct from wall) inside a zone
  - a conveyor/manual/agv flow chain linking zones in build order
  - two plan attachments tying real SEED_PLANS workflows to zones
*/
const MOCK_ZONES: FactoryZone[] = [
  { id: "zone-rawmat",  name: "Raw Materials", type: "raw_materials", capacity: 40 },
  { id: "zone-machine", name: "Machining",     type: "machining",     capacity: 12 },
  { id: "zone-assembly",name: "Assembly",      type: "assembly",      capacity: 20 },
  { id: "zone-qc",      name: "QC Station",    type: "station",       capacity: 6  },
  { id: "zone-dispatch",name: "Dispatch",      type: "dispatch",      capacity: 10 },
];

const MOCK_NODES: FactoryZoneNode[] = [
  { id: "fn-rawmat",   zoneId: "zone-rawmat",   position: { x: 40,  y: 40  }, width: 320, height: 140 },
  { id: "fn-machine",  zoneId: "zone-machine",  position: { x: 420, y: 40  }, width: 320, height: 140 },
  { id: "fn-assembly", zoneId: "zone-assembly", position: { x: 420, y: 230 }, width: 320, height: 140 },
  { id: "fn-qc",       zoneId: "zone-qc",       position: { x: 40,  y: 230 }, width: 150, height: 140 },
  { id: "fn-dispatch", zoneId: "zone-dispatch", position: { x: 210, y: 230 }, width: 150, height: 140 },
];

const MOCK_EDGES: FactoryFlowPath[] = [
  { id: "fp-1", sourceId: "fn-rawmat",   targetId: "fn-machine",  pathType: "conveyor", label: "Feed"     },
  { id: "fp-2", sourceId: "fn-machine",  targetId: "fn-assembly", pathType: "conveyor", label: "Machined" },
  { id: "fp-3", sourceId: "fn-assembly", targetId: "fn-qc",       pathType: "manual",   label: "Inspect"  },
  { id: "fp-4", sourceId: "fn-qc",       targetId: "fn-dispatch", pathType: "agv",      label: "Ship"     },
];

const MOCK_WALLS: FactoryWall[] = [
  // Perimeter
  { id: "wall-perim-top",    wallType: "wall", start: { x: 20,  y: 20  }, end: { x: 780, y: 20  }, thickness: 12 },
  { id: "wall-perim-right",  wallType: "wall", start: { x: 780, y: 20  }, end: { x: 780, y: 400 }, thickness: 12 },
  { id: "wall-perim-bottom", wallType: "wall", start: { x: 780, y: 400 }, end: { x: 20,  y: 400 }, thickness: 12 },
  { id: "wall-perim-left",   wallType: "wall", start: { x: 20,  y: 400 }, end: { x: 20,  y: 20  }, thickness: 12 },
  // Full-span dividers — vertical meets top/bottom as T-junctions, horizontal
  // meets left/right as T-junctions, and the two cross each other at (400,210)
  { id: "wall-div-vert",  wallType: "wall", start: { x: 400, y: 20  }, end: { x: 400, y: 400 }, thickness: 12 },
  { id: "wall-div-horiz", wallType: "wall", start: { x: 20,  y: 210 }, end: { x: 780, y: 210 }, thickness: 12 },
  // Internal walkway inside the Machining zone
  { id: "walkway-machine", wallType: "walkway", start: { x: 440, y: 120 }, end: { x: 720, y: 120 }, thickness: 60 },
];

const MOCK_ATTACHMENTS: WorkflowAttachment[] = [
  { planId: "plan1", workflowId: "w1", workflowName: "Core Build",   zoneNodeId: "fn-machine",  durationH: 2.75, color: "#F56300" },
  { planId: "plan1", workflowId: "w2", workflowName: "Final Finish", zoneNodeId: "fn-assembly", durationH: 1.5,  color: "#2563EB" },
];

const SEED_FACTORY_LAYOUTS: FactoryLayout[] = [
  {
    id: "fl-mock-1",
    name: "Ingane — Main Floor",
    savedAt: new Date().toISOString().slice(0, 10),
    zones: MOCK_ZONES,
    nodes: MOCK_NODES,
    edges: MOCK_EDGES,
    walls: MOCK_WALLS,
    planAttachments: MOCK_ATTACHMENTS,
  },
];

function FactoryTab() {
  const isDark = useDarkMode();
  const t      = isDark ? FACTORY_DARK : FACTORY_LIGHT;
  const [view,          setView]          = useState<"landing" | "edit">("landing");
  const [layouts,       setLayouts]       = useState<FactoryLayout[]>(SEED_FACTORY_LAYOUTS);
  const [activeLayout,  setActiveLayout]  = useState<FactoryLayout | null>(null);

  const openLayout = (layout: FactoryLayout) => {
    useFactoryStore.getState().loadSnapshot(layout);
    setActiveLayout(layout);
    setView("edit");
  };

  const createLayout = () => {
    useFactoryStore.getState().clearFloor();
    const newLayout: FactoryLayout = {
      id: `fl-${Date.now()}`, name: "New Factory Layout",
      savedAt: new Date().toISOString().slice(0, 10),
      zones: [], nodes: [], edges: [], walls: [],
    };
    setLayouts(prev => [...prev, newLayout]);
    setActiveLayout(newLayout);
    setView("edit");
  };

  const handleSave = (snap: FactorySnapshot) => {
    if (!activeLayout) return;
    const updated: FactoryLayout = { ...activeLayout, ...snap, savedAt: new Date().toISOString().slice(0, 10) };
    setLayouts(prev => prev.map(l => l.id === updated.id ? updated : l));
    setActiveLayout(updated);
  };

  if (view === "edit") {
    return (
      <FactoryFloorBuilder
        embedded
        onSave={handleSave}
        layoutName={activeLayout?.name ?? "Factory Floor"}
        onBack={() => setView("landing")}
      />
    );
  }

  /* ── Landing ── */
  return (
    <div style={{ width: "100%", height: "100%", overflowY: "auto", backgroundColor: "var(--bg)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Building2 size={20} color="var(--accent)" />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Factory Floor Builder
          </h2>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
            Factory Layouts
          </label>

          {/* New layout button */}
          <button onClick={createLayout}
            style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", width: "100%",
              backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
              cursor: "pointer", marginBottom: 8, transition: "border-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              backgroundColor: "var(--bg)", border: "1px dashed var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus size={18} color="var(--accent)" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>New factory layout</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                Start with a blank floor plan
              </div>
            </div>
            <ChevronRight size={16} color="var(--text-tertiary)" />
          </button>

          {/* Saved layouts */}
          {layouts.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", fontStyle: "italic", textAlign: "center", padding: "24px 0" }}>
              No layouts saved yet. Create your first factory floor.
            </p>
          ) : layouts.map(layout => (
            <button key={layout.id} onClick={() => openLayout(layout)}
              style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", width: "100%",
                backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
                cursor: "pointer", marginBottom: 8, transition: "border-color 0.15s", textAlign: "left" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                backgroundColor: "rgba(245,99,0,0.08)", border: "1px solid rgba(245,99,0,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={18} color="var(--accent)" strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{layout.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Saved {fmtDate(layout.savedAt)}</span>
                  {layout.zones.length > 0 && (
                    <>
                      <span style={{ color: "var(--border)" }}>·</span>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        {layout.zones.length} zone{layout.zones.length !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                  {layout.walls.length > 0 && (
                    <>
                      <span style={{ color: "var(--border)" }}>·</span>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        {layout.walls.length} segment{layout.walls.length !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Task Manager Tab
══════════════════════════════════════════════════ */
function TaskManagerTab() {
  const [selectedProdId, setSelectedProdId] = useState<string | null>(null);
  const [leftWidth, setLeftWidth] = useState(260);

  return (
    <div style={{ margin: "-24px", height: "calc(100vh - 96px)", display: "flex", overflow: "hidden" }}>
      {/* Left: product list */}
      <div style={{
        width: selectedProdId ? leftWidth : "100%",
        maxWidth: selectedProdId ? leftWidth : 760,
        overflowY: "auto",
        padding: 24,
        flexShrink: 0,
        boxSizing: "border-box",
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 16 }}>
          Task Manager
        </h2>
        {TM_PRODUCTS.map(p => {
          const active = selectedProdId === p.id;
          return (
            <button key={p.id}
              onClick={() => setSelectedProdId(active ? null : p.id)}
              style={{
                display: "flex", alignItems: "center", padding: "14px 16px", width: "100%",
                backgroundColor: active ? "rgba(245,99,0,0.06)" : "var(--surface)",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "var(--radius-lg)", gap: 14, cursor: "pointer",
                transition: "border-color 0.15s, background-color 0.15s",
                marginBottom: 8, textAlign: "left",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "var(--radius-md)", flexShrink: 0,
                backgroundColor: active ? "rgba(245,99,0,0.12)" : "var(--bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Workflow size={18} color={active ? "var(--accent)" : "var(--text-tertiary)"} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                {!selectedProdId && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    {p.workflows} workflows · {p.tasks} tasks · Model {p.model}
                  </div>
                )}
              </div>
              <ChevronRight size={16} color={active ? "var(--accent)" : "var(--text-tertiary)"} />
            </button>
          );
        })}
      </div>

      {/* Divider + right detail */}
      {selectedProdId && (
        <>
          <ResizableDivider onDrag={dx => setLeftWidth(w => Math.max(160, Math.min(520, w + dx)))} />
          <div style={{ flex: 1, overflowY: "auto", padding: 24, minWidth: 0 }}>
            <TasksContent productId={selectedProdId} hideHeader />
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Page — 3-tab layout
══════════════════════════════════════════════════ */
type Tab = "tasks" | "planner" | "factory";

export default function ProcessesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const isDark = useDarkMode();
  const t      = isDark ? FACTORY_DARK : FACTORY_LIGHT;
  const isCanvas = activeTab === "planner" || activeTab === "factory";

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "tasks",   label: "Task Manager",       icon: <ListTodo   size={14} /> },
    { id: "planner", label: "Production Planner", icon: <Zap        size={14} /> },
    { id: "factory", label: "Factory",            icon: <Building2  size={14} /> },
  ];

  return (
    <div style={{ margin: "-24px", height: "calc(100vh - 52px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Tab bar */}
      <div style={{ height: 44, display: "flex", alignItems: "center", gap: 2, padding: "0 20px",
        backgroundColor: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0 }}>
        <span style={{
          fontFamily: "var(--font-geist-pixel-square)",
          fontSize: 28,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
          paddingRight: 14,
          marginRight: 6,
          borderRight: "1px solid var(--border)",
          whiteSpace: "nowrap",
        }}>
          Processes
        </span>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", height: 32,
                borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                transition: "background-color 0.15s, color 0.15s",
                backgroundColor: active ? "var(--bg)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}>
              {tab.icon}
              <span style={{ marginLeft: 2 }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: isCanvas ? "hidden" : "auto",
        padding: isCanvas ? 0 : 24,
        backgroundColor: isCanvas ? t.canvasBg : "var(--bg)",
        transition: "background-color 0.2s" }}>
        {activeTab === "tasks"   && <TaskManagerTab />}
        {activeTab === "planner" && <ProductionPlannerTab />}
        {activeTab === "factory" && <FactoryTab />}
      </div>
    </div>
  );
}
