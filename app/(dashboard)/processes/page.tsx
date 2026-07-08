"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant,
  Controls, MiniMap, Panel, useNodesState, useEdgesState,
  useReactFlow, useViewport, type Node, type Edge, type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ListTodo, Zap, Building2, ChevronRight,
  Box, Cpu, Workflow, MousePointer2, Spline, RotateCcw,
} from "lucide-react";
import Link from "next/link";
import {
  FactoryFloorBuilder, useDarkMode,
  FACTORY_DARK, FACTORY_LIGHT,
} from "@/components/factory/FactoryFloorBuilder";

/* ── Mock data ── */
const MOCK_PRODUCTS = [
  { id: "p1", name: "Ingane",        model: "1.0", workflows: 3, tasks: 12 },
  { id: "p2", name: "Alublack Trey", model: "1.0", workflows: 2, tasks: 8 },
];

/* ── Planner node types ── */
function PlannerProductNode({ data }: { data: { name: string; model: string } }) {
  return (
    <div style={{
      padding: "10px 16px", borderRadius: 10, minWidth: 140,
      backgroundColor: "rgba(245,99,0,0.12)", border: "1.5px solid #F56300",
      display: "flex", flexDirection: "column", gap: 4, userSelect: "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Box size={12} color="#F56300" />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#F56300" }}>Product</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#E8E8E8" }}>{data.name}</span>
      <span style={{ fontSize: 10, color: "#888" }}>v{data.model}</span>
    </div>
  );
}

function PlannerStationNode({ data }: { data: { name: string } }) {
  return (
    <div style={{
      padding: "10px 16px", borderRadius: 10, minWidth: 140,
      backgroundColor: "rgba(59,130,246,0.12)", border: "1.5px solid #3B82F6",
      display: "flex", flexDirection: "column", gap: 4, userSelect: "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Cpu size={12} color="#3B82F6" />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#3B82F6" }}>Station</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#E8E8E8" }}>{data.name}</span>
    </div>
  );
}

const plannerNodeTypes = {
  product: PlannerProductNode,
  station: PlannerStationNode,
};

/* ══════════════════════════════════════════════════
   Production Planner — inner canvas
══════════════════════════════════════════════════ */
function PlannerCanvasInner({ t }: { t: typeof FACTORY_DARK }) {
  const { zoom } = useViewport();

  const initNodes: Node[] = [
    { id: "na", type: "product", position: { x: 80,  y: 100 }, data: { name: "Ingane",        model: "1.0" } },
    { id: "nb", type: "product", position: { x: 80,  y: 260 }, data: { name: "Alublack Trey", model: "1.0" } },
    { id: "nc", type: "station", position: { x: 360, y: 100 }, data: { name: "Prep Station" } },
    { id: "nd", type: "station", position: { x: 360, y: 260 }, data: { name: "Assembly" } },
    { id: "ne", type: "station", position: { x: 620, y: 180 }, data: { name: "QC & Dispatch" } },
  ];
  const initEdges: Edge[] = [
    { id: "e1", source: "na", target: "nc", style: { stroke: "#F56300", strokeWidth: 2 }, markerEnd: { type: "arrowclosed" as const, color: "#F56300" } },
    { id: "e2", source: "nb", target: "nd", style: { stroke: "#F56300", strokeWidth: 2 }, markerEnd: { type: "arrowclosed" as const, color: "#F56300" } },
    { id: "e3", source: "nc", target: "ne", style: { stroke: "#3B82F6", strokeWidth: 2 }, markerEnd: { type: "arrowclosed" as const, color: "#3B82F6" } },
    { id: "e4", source: "nd", target: "ne", style: { stroke: "#3B82F6", strokeWidth: 2 }, markerEnd: { type: "arrowclosed" as const, color: "#3B82F6" } },
  ];

  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  let eid = 10;

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => [...eds, {
      id: `e${eid++}`, source: connection.source!, target: connection.target!,
      style: { stroke: "#3B82F6", strokeWidth: 2 },
      markerEnd: { type: "arrowclosed" as const, color: "#3B82F6" },
    }]);
  }, [setEdges]);

  return (
    <ReactFlow
      nodes={nodes} edges={edges} nodeTypes={plannerNodeTypes}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView snapGrid={[20, 20]} snapToGrid
      minZoom={0.2} maxZoom={4}
      proOptions={{ hideAttribution: true }}
      style={{ backgroundColor: t.canvasBg }}
      defaultEdgeOptions={{
        style: { stroke: "#3B82F6", strokeWidth: 2 },
        markerEnd: { type: "arrowclosed" as const, color: "#3B82F6" },
      }}
      connectionLineStyle={{ stroke: "#F56300", strokeWidth: 2, strokeDasharray: "6 3" }}
    >
      <Background id="minor" variant={BackgroundVariant.Lines} gap={20} lineWidth={0.4} color={t.gridMinor} style={{ backgroundColor: t.canvasBg }} />
      <Background id="major" variant={BackgroundVariant.Lines} gap={100} lineWidth={0.8} color={t.gridMajor} />
      <Controls style={{ backgroundColor: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8 }} />
      <MiniMap
        style={{ backgroundColor: t.statusBg, border: `1px solid ${t.border}`, borderRadius: 8 }}
        nodeColor={(node) => node.type === "product" ? "#F56300" : "#3B82F6"}
        maskColor={t.overlayBg.replace("0.65)", "0.5)").replace("0.35)", "0.3)")}
      />
      <Panel position="bottom-center">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 12px", backgroundColor: t.panelBg + "CC", border: `1px solid ${t.border}`, borderRadius: 999, backdropFilter: "blur(4px)" }}>
          <span style={{ fontSize: 10, color: t.textMuted, fontFamily: "monospace" }}>{Math.round(zoom * 100)}%</span>
        </div>
      </Panel>
    </ReactFlow>
  );
}

/* ══════════════════════════════════════════════════
   Production Planner Tab
══════════════════════════════════════════════════ */
function ProductionPlannerTab() {
  const isDark = useDarkMode();
  const t = isDark ? FACTORY_DARK : FACTORY_LIGHT;
  const [toolMode, setToolMode] = useState<"select" | "connect">("select");

  const hBtnGhost: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 5, padding: "0 12px", height: 28,
    backgroundColor: t.btnGhostBg, color: t.textMuted,
    border: `1px solid ${t.border}`, borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer",
  };

  function ToolBtn({ children, active, onClick, title }: { children: React.ReactNode; active: boolean; onClick: () => void; title: string }) {
    return (
      <button onClick={onClick} title={title}
        style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: active ? "#F56300" : "transparent", border: `1px solid ${active ? "#F56300" : "transparent"}`, borderRadius: 8, color: active ? "#fff" : t.textMuted, cursor: "pointer", transition: "all 0.15s" }}
        onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = t.toolHover; }}
        onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
      >{children}</button>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: t.canvasBg }}>
      {/* Planner header */}
      <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 16px", backgroundColor: t.headerBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={16} color="#F56300" />
          <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, letterSpacing: "-0.01em" }}>Production Planner</span>
        </div>
        <div style={{ width: 1, height: 20, backgroundColor: t.border }} />
        <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "monospace" }}>
          {MOCK_PRODUCTS.length} products · global flow canvas
        </span>
        <div style={{ flex: 1 }} />
        <button style={hBtnGhost}><RotateCcw size={13} /> Reset</button>
      </div>

      {/* Canvas + left toolbar */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left toolbar */}
        <div style={{ width: 52, minWidth: 52, height: "100%", backgroundColor: t.panelBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10, gap: 4, flexShrink: 0 }}>
          <ToolBtn active={toolMode === "select"}  onClick={() => setToolMode("select")}  title="Select">
            <MousePointer2 size={17} strokeWidth={1.8} />
          </ToolBtn>
          <ToolBtn active={toolMode === "connect"} onClick={() => setToolMode("connect")} title="Connect">
            <Spline size={17} strokeWidth={1.8} />
          </ToolBtn>
          <div style={{ width: 28, height: 1, backgroundColor: t.border, margin: "4px 0" }} />
          <div style={{ fontSize: 9, color: t.textDim, fontFamily: "monospace", padding: "2px 0" }}>ADD</div>
          <button title="Add Product node"
            style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,99,0,0.12)", border: "1px solid #F56300", borderRadius: 8, color: "#F56300", cursor: "pointer" }}
          >
            <Box size={15} />
          </button>
          <button title="Add Station node"
            style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(59,130,246,0.12)", border: "1px solid #3B82F6", borderRadius: 8, color: "#3B82F6", cursor: "pointer" }}
          >
            <Cpu size={15} />
          </button>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ReactFlowProvider>
            <PlannerCanvasInner t={t} />
          </ReactFlowProvider>
        </div>

        {/* Right info panel */}
        <div style={{ width: 220, minWidth: 220, backgroundColor: t.panelBg, borderLeft: `1px solid ${t.border}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Workflow size={13} color={t.textMuted} />
              <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Products</span>
            </div>
          </div>
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
            {MOCK_PRODUCTS.map(p => (
              <div key={p.id} style={{ padding: "8px 10px", backgroundColor: "rgba(245,99,0,0.08)", border: "1px solid #F5630044", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary }}>{p.name}</div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>{p.workflows} workflows · {p.tasks} tasks</div>
              </div>
            ))}
            <div style={{ height: 1, backgroundColor: t.border, margin: "4px 0" }} />
            <p style={{ fontSize: 10, color: t.textDim, lineHeight: 1.6 }}>
              Connect products to stations to map your production flow. Click a node to select it.
            </p>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ height: 24, display: "flex", alignItems: "center", padding: "0 16px", backgroundColor: t.statusBg, borderTop: `1px solid ${t.borderFaint}`, gap: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: t.textDim, fontFamily: "monospace" }}>
          V — select · C — connect · scroll to zoom · drag to pan
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Task Manager Tab
══════════════════════════════════════════════════ */
function TaskManagerTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 720 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 8 }}>
        Task Manager
      </h2>
      {MOCK_PRODUCTS.map(p => (
        <Link
          key={p.id}
          href={`/processes/${p.id}/tasks`}
          style={{ display: "flex", alignItems: "center", padding: "14px 20px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", textDecoration: "none", gap: 16, transition: "border-color 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; }}
        >
          <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", backgroundColor: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Workflow size={20} color="var(--accent)" strokeWidth={1.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              {p.workflows} workflows · {p.tasks} tasks · Model {p.model}
            </div>
          </div>
          <ChevronRight size={16} color="var(--text-tertiary)" />
        </Link>
      ))}
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
  const t = isDark ? FACTORY_DARK : FACTORY_LIGHT;

  const isCanvas = activeTab === "planner" || activeTab === "factory";

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "tasks",   label: "Task Manager",       icon: <ListTodo size={14} /> },
    { id: "planner", label: "Production Planner", icon: <Zap size={14} /> },
    { id: "factory", label: "Factory",            icon: <Building2 size={14} /> },
  ];

  return (
    <div style={{
      margin: "-24px",
      height: "calc(100vh - 52px)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Tab bar */}
      <div style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "0 20px",
        backgroundColor: isCanvas ? t.headerBg : "var(--surface)",
        borderBottom: `1px solid ${isCanvas ? t.border : "var(--border)"}`,
        flexShrink: 0,
        transition: "background-color 0.2s, border-color 0.2s",
      }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "0 14px", height: 32, borderRadius: 8,
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                transition: "all 0.15s",
                backgroundColor: active
                  ? (isCanvas ? "rgba(245,99,0,0.15)" : "var(--bg)")
                  : "transparent",
                color: active
                  ? (isCanvas ? "#F56300" : "var(--text-primary)")
                  : (isCanvas ? t.textMuted : "var(--text-tertiary)"),
              }}>
              {tab.icon}
              <span style={{ marginLeft: 2 }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        overflow: isCanvas ? "hidden" : "auto",
        padding: isCanvas ? 0 : 24,
        backgroundColor: isCanvas ? t.canvasBg : "var(--bg)",
        transition: "background-color 0.2s",
      }}>
        {activeTab === "tasks"   && <TaskManagerTab />}
        {activeTab === "planner" && <ProductionPlannerTab />}
        {activeTab === "factory" && <FactoryFloorBuilder embedded />}
      </div>
    </div>
  );
}
