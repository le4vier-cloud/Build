"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  useViewport,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useFactoryStore } from "@/stores/useFactoryStore";
import { FactoryZoneNode } from "@/components/factory/FactoryZoneNode";
import {
  ZONE_COLORS, ZONE_LABELS, ZoneType,
  type FactoryZone,
} from "@/types/factory";
import {
  MousePointer2, Square, Spline, Trash2, Maximize2, Minimize2,
  Building2, X, Plus, Save, RotateCcw,
} from "lucide-react";

/* ── Lucide icons per zone type ─────────────────── */
import { Cpu, Wrench, CheckCheck, Archive, Truck, Briefcase, Package, Send } from "lucide-react";

const ZONE_TYPE_LIST: ZoneType[] = [
  "machining", "assembly", "quality", "storage",
  "logistics", "office", "raw_materials", "dispatch",
];

const ZONE_ICON: Record<ZoneType, React.ReactNode> = {
  machining:     <Cpu size={13} />,
  assembly:      <Wrench size={13} />,
  quality:       <CheckCheck size={13} />,
  storage:       <Archive size={13} />,
  logistics:     <Truck size={13} />,
  office:        <Briefcase size={13} />,
  raw_materials: <Package size={13} />,
  dispatch:      <Send size={13} />,
};

const nodeTypes = { factoryZone: FactoryZoneNode };

type ToolMode = "select" | "add" | "connect";

/* ══════════════════════════════════════════════════
   Inner canvas — needs to be inside ReactFlowProvider
   to access useReactFlow / useViewport
══════════════════════════════════════════════════ */
function FactoryCanvasInner({
  toolMode, addZoneType, onAddZoneTypeUsed, onMousePosChange,
}: {
  toolMode: ToolMode;
  addZoneType: ZoneType | null;
  onAddZoneTypeUsed: () => void;
  onMousePosChange: (x: number, y: number) => void;
}) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const { zoom } = useViewport();

  const {
    zones, nodes: storeNodes, edges: storeEdges,
    addZone, updateNodePosition, setSelectedNode,
    addFlowPath, removeFlowPath,
  } = useFactoryStore();

  /* Build React Flow nodes from store */
  const buildRfNodes = (): Node[] =>
    storeNodes.map((n) => {
      const zone = zones.find((z) => z.id === n.zoneId);
      if (!zone) return null!;
      return {
        id: n.id,
        type: "factoryZone",
        position: n.position,
        data: { zone },
        style: { width: n.width, height: n.height },
      };
    }).filter(Boolean);

  const buildRfEdges = (): Edge[] =>
    storeEdges.map((e) => ({
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
      label: e.label ?? e.pathType,
      animated: e.pathType === "conveyor" || e.pathType === "agv",
      style: { stroke: "#3B82F6", strokeWidth: 2 },
      markerEnd: { type: "arrowclosed" as const, color: "#3B82F6" },
      labelStyle: {
        fontSize: 10, fontFamily: "monospace",
        fill: "#8888A8", fontWeight: 600,
      },
      labelBgStyle: { fill: "#141420", fillOpacity: 0.85 },
    }));

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(buildRfNodes());
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(buildRfEdges());

  /* Sync store → canvas */
  useEffect(() => { setRfNodes(buildRfNodes()); }, [storeNodes, zones]);
  useEffect(() => { setRfEdges(buildRfEdges()); }, [storeEdges]);

  /* Fit view on first load */
  useEffect(() => {
    if (storeNodes.length > 0) fitView({ padding: 0.2 });
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      addFlowPath({
        sourceId: connection.source!,
        targetId: connection.target!,
        pathType: "walkway",
      });
    },
    [addFlowPath]
  );

  const onNodeDragStop = useCallback(
    (_e: unknown, node: Node) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition]
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (toolMode === "add" && addZoneType) {
        const raw = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        // Snap to 20px grid
        const pos = {
          x: Math.round(raw.x / 20) * 20 - 90,
          y: Math.round(raw.y / 20) * 20 - 60,
        };
        addZone({ name: `New ${ZONE_LABELS[addZoneType]}`, type: addZoneType }, pos);
        onAddZoneTypeUsed();
      } else {
        setSelectedNode(null);
      }
    },
    [toolMode, addZoneType, addZone, onAddZoneTypeUsed, setSelectedNode, screenToFlowPosition]
  );

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      onMousePosChange(
        Math.round(pos.x / 20),
        Math.round(pos.y / 20)
      );
    },
    [screenToFlowPosition, onMousePosChange]
  );

  const cursorStyle =
    toolMode === "add"     ? "crosshair" :
    toolMode === "connect" ? "cell" :
    "default";

  return (
    <div
      style={{ width: "100%", height: "100%", cursor: cursorStyle }}
      onMouseMove={onMouseMove}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        snapGrid={[20, 20]}
        snapToGrid
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: "#0F0F14" }}
        defaultEdgeOptions={{
          style: { stroke: "#3B82F6", strokeWidth: 2 },
          markerEnd: { type: "arrowclosed" as const, color: "#3B82F6" },
        }}
        connectionLineStyle={{ stroke: "#F56300", strokeWidth: 2, strokeDasharray: "6 3" }}
      >
        {/* Fine grid (20px) */}
        <Background
          id="minor"
          variant={BackgroundVariant.Lines}
          gap={20}
          lineWidth={0.4}
          color="#1A1A26"
          style={{ backgroundColor: "#0F0F14" }}
        />
        {/* Major grid (100px) */}
        <Background
          id="major"
          variant={BackgroundVariant.Lines}
          gap={100}
          lineWidth={0.8}
          color="#222230"
        />

        <Controls
          style={{
            backgroundColor: "#141420",
            border: "1px solid #2A2A3A",
            borderRadius: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
        />

        <MiniMap
          style={{
            backgroundColor: "#0A0A12",
            border: "1px solid #2A2A3A",
            borderRadius: 8,
          }}
          nodeColor={(node) => {
            const zone = (node.data as { zone: FactoryZone }).zone;
            return zone ? ZONE_COLORS[zone.type].border : "#3B3B4A";
          }}
          maskColor="rgba(10,10,18,0.8)"
        />

        {/* Zoom indicator */}
        <Panel position="bottom-center">
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "4px 12px",
            backgroundColor: "#141420CC",
            border: "1px solid #2A2A3A",
            borderRadius: 999,
            backdropFilter: "blur(4px)",
          }}>
            <span style={{ fontSize: 10, color: "#8888A8", fontFamily: "monospace" }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Add Zone Dialog
══════════════════════════════════════════════════ */
function AddZoneDialog({
  onClose, onSelectType,
}: {
  onClose: () => void;
  onSelectType: (type: ZoneType) => void;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 440,
          backgroundColor: "#141420",
          border: "1px solid #2A2A3A",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px",
          borderBottom: "1px solid #2A2A3A",
        }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#E8E8F2" }}>Add Zone</h2>
            <p style={{ fontSize: 11, color: "#666680", marginTop: 2 }}>
              Select type, then click on the canvas to place
            </p>
          </div>
          <button onClick={onClose} style={dialogBtnStyle}>
            <X size={15} color="#666680" />
          </button>
        </div>

        {/* Zone type grid */}
        <div style={{ padding: "16px 20px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ZONE_TYPE_LIST.map((type) => {
            const colors = ZONE_COLORS[type];
            const label  = ZONE_LABELS[type];
            const icon   = ZONE_ICON[type];
            return (
              <button
                key={type}
                onClick={() => onSelectType(type)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                  backgroundColor: colors.bg,
                  border: `1.5px solid ${colors.border}66`,
                  borderRadius: 10,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.15s, background-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = colors.border;
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.bg + "CC";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = colors.border + "66";
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.bg;
                }}
              >
                <span style={{ color: colors.text }}>{icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#E8E8F2" }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const dialogBtnStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  display: "flex", padding: 4, borderRadius: 6,
};

/* ══════════════════════════════════════════════════
   Properties Panel
══════════════════════════════════════════════════ */
function PropertiesPanel() {
  const { zones, nodes, selectedNodeId, updateZone, removeZone, setSelectedNode } = useFactoryStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedZone = selectedNode ? zones.find((z) => z.id === selectedNode.zoneId) : null;

  if (!selectedZone || !selectedNode) {
    return (
      <div style={panelStyle}>
        <div style={panelHeader}>
          <Building2 size={14} color="#666680" />
          <span style={panelTitleStyle}>Floor</span>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Stat label="Zones" value={zones.length.toString()} />
            <Stat label="Connections" value="0" />
          </div>
          <p style={{ fontSize: 11, color: "#555568", lineHeight: 1.6 }}>
            Click a zone to edit its properties. Drag handles to resize.
            Connect zones by dragging from one edge to another.
          </p>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#555568", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
              Quick Add
            </p>
            {ZONE_TYPE_LIST.slice(0, 4).map((type) => {
              const colors = ZONE_COLORS[type];
              return (
                <div key={type} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 0",
                  borderBottom: "1px solid #1E1E2C",
                }}>
                  <span style={{ color: colors.text }}>{ZONE_ICON[type]}</span>
                  <span style={{ fontSize: 11, color: "#8888A8", flex: 1 }}>{ZONE_LABELS[type]}</span>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    backgroundColor: colors.border, flexShrink: 0,
                  }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const colors = ZONE_COLORS[selectedZone.type];

  return (
    <div style={panelStyle}>
      <div style={{
        ...panelHeader,
        borderBottom: `1px solid ${colors.border}44`,
        backgroundColor: colors.bg,
      }}>
        <span style={{ color: colors.text }}>{ZONE_ICON[selectedZone.type]}</span>
        <span style={{ ...panelTitleStyle, color: colors.text }}>{ZONE_LABELS[selectedZone.type]}</span>
        <button
          onClick={() => setSelectedNode(null)}
          style={{ ...dialogBtnStyle, marginLeft: "auto" }}
        >
          <X size={13} color="#666680" />
        </button>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>Zone Name</label>
          <input
            style={inputStyle}
            value={selectedZone.name}
            onChange={(e) => updateZone(selectedZone.id, { name: e.target.value })}
          />
        </div>

        {/* Type picker */}
        <div>
          <label style={labelStyle}>Type</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {ZONE_TYPE_LIST.map((type) => {
              const c = ZONE_COLORS[type];
              const isActive = type === selectedZone.type;
              return (
                <button
                  key={type}
                  onClick={() => updateZone(selectedZone.id, { type })}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "6px 8px",
                    backgroundColor: isActive ? c.bg : "#0E0E18",
                    border: `1px solid ${isActive ? c.border : "#2A2A3A"}`,
                    borderRadius: 6, cursor: "pointer",
                  }}
                >
                  <span style={{ color: isActive ? c.text : "#555568" }}>{ZONE_ICON[type]}</span>
                  <span style={{ fontSize: 10, color: isActive ? c.text : "#555568", fontWeight: 600 }}>
                    {ZONE_LABELS[type].split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Capacity */}
        <div>
          <label style={labelStyle}>Capacity</label>
          <input
            style={inputStyle}
            type="number"
            min="0"
            placeholder="Workers / machines"
            value={selectedZone.capacity ?? ""}
            onChange={(e) => updateZone(selectedZone.id, { capacity: parseInt(e.target.value) || undefined })}
          />
        </div>

        {/* Dimensions (read-only display) */}
        <div style={{ display: "flex", gap: 8 }}>
          <Stat label="W" value={`${Math.round(selectedNode.width / 20)}u`} />
          <Stat label="H" value={`${Math.round(selectedNode.height / 20)}u`} />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea
            style={{ ...inputStyle, height: 60, resize: "vertical", lineHeight: 1.5 }}
            placeholder="Optional description..."
            value={selectedZone.description ?? ""}
            onChange={(e) => updateZone(selectedZone.id, { description: e.target.value })}
          />
        </div>

        {/* Delete */}
        <button
          onClick={() => removeZone(selectedZone.id)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px", height: 34,
            backgroundColor: "transparent",
            border: "1px solid #3A1A1A",
            borderRadius: 8, cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: "#FF3B30",
            marginTop: 4,
          }}
        >
          <Trash2 size={13} /> Remove Zone
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      flex: 1, padding: "6px 10px",
      backgroundColor: "#0E0E18",
      border: "1px solid #1E1E2C",
      borderRadius: 6,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 10, color: "#555568", fontFamily: "monospace" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E8F2", fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  width: 240, minWidth: 240,
  height: "100%",
  backgroundColor: "#0C0C14",
  borderLeft: "1px solid #1E1E2C",
  display: "flex", flexDirection: "column",
  overflow: "hidden",
  flexShrink: 0,
};

const panelHeader: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "12px 16px",
  borderBottom: "1px solid #1E1E2C",
  flexShrink: 0,
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: "#8888A8",
  textTransform: "uppercase", letterSpacing: "0.08em",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10, fontWeight: 600, color: "#555568",
  textTransform: "uppercase", letterSpacing: "0.08em",
  marginBottom: 5, fontFamily: "monospace",
};

const inputStyle: React.CSSProperties = {
  width: "100%", height: 32,
  backgroundColor: "#0E0E18",
  border: "1px solid #2A2A3A",
  borderRadius: 6,
  padding: "0 8px",
  fontSize: 12, color: "#E8E8F2",
  outline: "none",
  fontFamily: "inherit",
};

/* ══════════════════════════════════════════════════
   Toolbar (left side)
══════════════════════════════════════════════════ */
function Toolbar({
  toolMode, setToolMode, onAddZone, onClearFloor,
}: {
  toolMode: ToolMode;
  setToolMode: (t: ToolMode) => void;
  onAddZone: () => void;
  onClearFloor: () => void;
}) {
  const tools = [
    { id: "select" as ToolMode, icon: <MousePointer2 size={17} strokeWidth={1.8} />, label: "Select (V)", kbd: "V" },
    { id: "connect" as ToolMode, icon: <Spline size={17} strokeWidth={1.8} />, label: "Connect (C)", kbd: "C" },
  ];

  return (
    <div style={{
      width: 52, minWidth: 52,
      height: "100%",
      backgroundColor: "#0C0C14",
      borderRight: "1px solid #1E1E2C",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: 10,
      gap: 4,
      flexShrink: 0,
    }}>
      {tools.map((t) => (
        <ToolBtn
          key={t.id}
          active={toolMode === t.id}
          onClick={() => setToolMode(t.id)}
          title={t.label}
        >
          {t.icon}
        </ToolBtn>
      ))}

      {/* Separator */}
      <div style={{ width: 28, height: 1, backgroundColor: "#1E1E2C", margin: "4px 0" }} />

      {/* Add zone */}
      <ToolBtn onClick={onAddZone} title="Add Zone (S)" active={toolMode === "add"}>
        <Square size={17} strokeWidth={1.8} />
      </ToolBtn>

      {/* Separator */}
      <div style={{ width: 28, height: 1, backgroundColor: "#1E1E2C", margin: "4px 0", marginTop: "auto" }} />

      {/* Clear */}
      <ToolBtn onClick={onClearFloor} title="Clear Floor" style={{ marginBottom: 8 }}>
        <RotateCcw size={15} strokeWidth={1.8} />
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  children, active = false, onClick, title, style: extStyle,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36, height: 36,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: active ? "#F56300" : "transparent",
        border: `1px solid ${active ? "#F56300" : "transparent"}`,
        borderRadius: 8,
        color: active ? "#fff" : "#666680",
        cursor: "pointer",
        transition: "background-color 0.15s, color 0.15s",
        ...extStyle,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1E1E2C";
          (e.currentTarget as HTMLButtonElement).style.color = "#B8B8D0";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "#666680";
        }
      }}
    >
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════ */
export default function FactoryPage() {
  const [toolMode,      setToolMode]      = useState<ToolMode>("select");
  const [addZoneType,   setAddZoneType]   = useState<ZoneType | null>(null);
  const [showDialog,    setShowDialog]    = useState(false);
  const [mousePos,      setMousePos]      = useState({ x: 0, y: 0 });
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { zones, nodes, clearFloor } = useFactoryStore();

  /* Sync fullscreen state with browser */
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "v" || e.key === "V" || e.key === "Escape") { setToolMode("select"); setAddZoneType(null); }
      if (e.key === "s" || e.key === "S") { setShowDialog(true); }
      if (e.key === "c" || e.key === "C") setToolMode("connect");
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSelectType = (type: ZoneType) => {
    setAddZoneType(type);
    setToolMode("add");
    setShowDialog(false);
  };

  return (
    /* Bleed out to edges, overriding the 24px layout padding */
    <div
      ref={containerRef}
      style={{
        margin: isFullscreen ? 0 : "-24px",
        height: isFullscreen ? "100vh" : "calc(100vh - 52px)",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0F0F14",
        overflow: "hidden",
        userSelect: "none",
      }}
    >

      {/* ── Top header bar ── */}
      <div style={{
        height: 44,
        display: "flex", alignItems: "center",
        padding: "0 16px",
        backgroundColor: "#0C0C14",
        borderBottom: "1px solid #1E1E2C",
        flexShrink: 0,
        gap: 16,
      }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={16} color="#F56300" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#E8E8F2", letterSpacing: "-0.01em" }}>
            Factory Floor Builder
          </span>
        </div>

        <div style={{ width: 1, height: 20, backgroundColor: "#1E1E2C" }} />

        {/* Floor stats */}
        <span style={{ fontSize: 11, color: "#555568", fontFamily: "monospace" }}>
          {zones.length} zones · {nodes.length} placed
        </span>

        {/* Active tool indicator */}
        {toolMode === "add" && addZoneType && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "3px 10px",
            backgroundColor: "#F5630020",
            border: "1px solid #F5630066",
            borderRadius: 999,
            fontSize: 11, color: "#F56300", fontWeight: 600,
          }}>
            <Square size={10} />
            Placing {ZONE_LABELS[addZoneType]} — click canvas
            <button
              onClick={() => { setToolMode("select"); setAddZoneType(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#F56300", display: "flex", padding: 0, marginLeft: 2 }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <button
          onClick={() => setShowDialog(true)}
          style={headerBtnOrange}
        >
          <Plus size={13} /> Add Zone
        </button>
        <button style={headerBtnGhost}>
          <Save size={13} /> Save Layout
        </button>
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
          style={headerBtnGhost}
        >
          {isFullscreen
            ? <Minimize2 size={13} />
            : <Maximize2 size={13} />
          }
        </button>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Toolbar */}
        <Toolbar
          toolMode={toolMode}
          setToolMode={setToolMode}
          onAddZone={() => setShowDialog(true)}
          onClearFloor={clearFloor}
        />

        {/* Canvas */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ReactFlowProvider>
            <FactoryCanvasInner
              toolMode={toolMode}
              addZoneType={addZoneType}
              onAddZoneTypeUsed={() => { setToolMode("select"); setAddZoneType(null); }}
              onMousePosChange={(x, y) => setMousePos({ x, y })}
            />
          </ReactFlowProvider>
        </div>

        {/* Properties */}
        <PropertiesPanel />
      </div>

      {/* ── Status bar ── */}
      <div style={{
        height: 24,
        display: "flex", alignItems: "center",
        padding: "0 16px",
        backgroundColor: "#0A0A10",
        borderTop: "1px solid #1A1A22",
        gap: 16,
        flexShrink: 0,
      }}>
        <StatusItem label="X" value={mousePos.x.toString()} />
        <StatusItem label="Y" value={mousePos.y.toString()} />
        <div style={{ width: 1, height: 12, backgroundColor: "#1E1E2C" }} />
        <StatusItem label="GRID" value="1u = 20px" />
        <StatusItem label="SNAP" value="ON" />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: "#333348", fontFamily: "monospace" }}>
          V — select · S — add zone · C — connect · F — fullscreen · ESC — cancel
        </span>
      </div>

      {/* ── Add Zone dialog ── */}
      {showDialog && (
        <AddZoneDialog
          onClose={() => setShowDialog(false)}
          onSelectType={handleSelectType}
        />
      )}
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 9, color: "#333348", fontFamily: "monospace", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 9, color: "#666680", fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

const headerBtnOrange: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 5,
  padding: "0 12px", height: 28,
  backgroundColor: "#F56300",
  color: "#fff",
  border: "none", borderRadius: 7,
  fontSize: 12, fontWeight: 600, cursor: "pointer",
};

const headerBtnGhost: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 5,
  padding: "0 12px", height: 28,
  backgroundColor: "transparent",
  color: "#666680",
  border: "1px solid #2A2A3A", borderRadius: 7,
  fontSize: 12, fontWeight: 500, cursor: "pointer",
};
