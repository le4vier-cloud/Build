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
  MousePointer2, Square, Spline, Maximize2, Minimize2,
  Building2, X, Plus, Save, RotateCcw, Undo2,
} from "lucide-react";
import { Cpu, Wrench, CheckCheck, Archive, Truck, Briefcase, Package, Send } from "lucide-react";

/* ── Theme ───────────────────────────────────────── */
interface Theme {
  canvasBg:    string;
  panelBg:     string;
  headerBg:    string;
  statusBg:    string;
  border:      string;
  borderFaint: string;
  textPrimary: string;
  textMuted:   string;
  textDim:     string;
  inputBg:     string;
  inputBorder: string;
  gridMinor:   string;
  gridMajor:   string;
  overlayBg:   string;
  toolActive:  string;
  toolHover:   string;
  btnGhostBg:  string;
  btnGhostText:string;
}

const DARK: Theme = {
  canvasBg:    "#1A1A1A",
  panelBg:     "#141414",
  headerBg:    "#141414",
  statusBg:    "#111111",
  border:      "#2A2A2A",
  borderFaint: "#222222",
  textPrimary: "#E8E8E8",
  textMuted:   "#888888",
  textDim:     "#444444",
  inputBg:     "#1E1E1E",
  inputBorder: "#333333",
  gridMinor:   "#212121",
  gridMajor:   "#282828",
  overlayBg:   "rgba(0,0,0,0.65)",
  toolActive:  "#2A2A2A",
  toolHover:   "#242424",
  btnGhostBg:  "transparent",
  btnGhostText:"#666666",
};

const LIGHT: Theme = {
  canvasBg:    "#EBEBEB",
  panelBg:     "#F5F5F5",
  headerBg:    "#F5F5F5",
  statusBg:    "#E8E8E8",
  border:      "#D4D4D4",
  borderFaint: "#DCDCDC",
  textPrimary: "#1D1D1F",
  textMuted:   "#6E6E73",
  textDim:     "#AEAEB2",
  inputBg:     "#FFFFFF",
  inputBorder: "#C8C8C8",
  gridMinor:   "#DCDCDC",
  gridMajor:   "#C8C8C8",
  overlayBg:   "rgba(0,0,0,0.35)",
  toolActive:  "#E0E0E0",
  toolHover:   "#E4E4E4",
  btnGhostBg:  "transparent",
  btnGhostText:"#6E6E73",
};

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return dark;
}

/* ── Zone types ──────────────────────────────────── */
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
   Inner canvas
══════════════════════════════════════════════════ */
function FactoryCanvasInner({
  toolMode, addZoneType, onAddZoneTypeUsed, onMousePosChange, t,
}: {
  toolMode: ToolMode;
  addZoneType: ZoneType | null;
  onAddZoneTypeUsed: () => void;
  onMousePosChange: (x: number, y: number) => void;
  t: Theme;
}) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const { zoom } = useViewport();

  const {
    zones, nodes: storeNodes, edges: storeEdges,
    addZone, updateNodePosition, setSelectedNode,
    addFlowPath,
  } = useFactoryStore();

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
      labelStyle: { fontSize: 10, fontFamily: "monospace", fill: "#8888A8", fontWeight: 600 },
      labelBgStyle: { fill: t.panelBg, fillOpacity: 0.85 },
    }));

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(buildRfNodes());
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(buildRfEdges());

  useEffect(() => { setRfNodes(buildRfNodes()); }, [storeNodes, zones]);
  useEffect(() => { setRfEdges(buildRfEdges()); }, [storeEdges]);
  useEffect(() => { if (storeNodes.length > 0) fitView({ padding: 0.2 }); }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      addFlowPath({ sourceId: connection.source!, targetId: connection.target!, pathType: "walkway" });
    },
    [addFlowPath]
  );

  const onNodeDragStop = useCallback(
    (_e: unknown, node: Node) => { updateNodePosition(node.id, node.position); },
    [updateNodePosition]
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => { setSelectedNode(node.id); },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (toolMode === "add" && addZoneType) {
        const raw = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const pos = { x: Math.round(raw.x / 20) * 20 - 90, y: Math.round(raw.y / 20) * 20 - 60 };
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
      onMousePosChange(Math.round(pos.x / 20), Math.round(pos.y / 20));
    },
    [screenToFlowPosition, onMousePosChange]
  );

  const cursorStyle =
    toolMode === "add"     ? "crosshair" :
    toolMode === "connect" ? "cell" : "default";

  return (
    <div style={{ width: "100%", height: "100%", cursor: cursorStyle }} onMouseMove={onMouseMove}>
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
        minZoom={0}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: t.canvasBg }}
        defaultEdgeOptions={{
          style: { stroke: "#3B82F6", strokeWidth: 2 },
          markerEnd: { type: "arrowclosed" as const, color: "#3B82F6" },
        }}
        connectionLineStyle={{ stroke: "#F56300", strokeWidth: 2, strokeDasharray: "6 3" }}
      >
        <Background
          id="minor"
          variant={BackgroundVariant.Lines}
          gap={20}
          lineWidth={0.4}
          color={t.gridMinor}
          style={{ backgroundColor: t.canvasBg }}
        />
        <Background
          id="major"
          variant={BackgroundVariant.Lines}
          gap={100}
          lineWidth={0.8}
          color={t.gridMajor}
        />

        <Controls
          style={{
            backgroundColor: t.panelBg,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        />

        <MiniMap
          style={{
            backgroundColor: t.statusBg,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
          }}
          nodeColor={(node) => {
            const zone = (node.data as { zone: FactoryZone }).zone;
            return zone ? ZONE_COLORS[zone.type].border : t.border;
          }}
          maskColor={t.overlayBg.replace("rgba(0,0,0,", "rgba(0,0,0,").replace("0.65)", "0.5)").replace("0.4)", "0.3)")}
        />

        <Panel position="bottom-center">
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "4px 12px",
            backgroundColor: t.panelBg + "CC",
            border: `1px solid ${t.border}`,
            borderRadius: 999,
            backdropFilter: "blur(4px)",
          }}>
            <span style={{ fontSize: 10, color: t.textMuted, fontFamily: "monospace" }}>
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
  onClose, onSelectType, t,
}: {
  onClose: () => void;
  onSelectType: (type: ZoneType) => void;
  t: Theme;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: t.overlayBg,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 440,
          backgroundColor: t.panelBg,
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px",
          borderBottom: `1px solid ${t.border}`,
        }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>Add Zone</h2>
            <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
              Select type, then click on the canvas to place
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, borderRadius: 6 }}>
            <X size={15} color={t.textMuted} />
          </button>
        </div>

        <div style={{ padding: "16px 20px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ZONE_TYPE_LIST.map((type) => {
            const colors = ZONE_COLORS[type];
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
                <span style={{ color: colors.text }}>{ZONE_ICON[type]}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary }}>{ZONE_LABELS[type]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Properties Panel
══════════════════════════════════════════════════ */
function PropertiesPanel({ t }: { t: Theme }) {
  const { zones, nodes, selectedNodeId, updateZone, removeZone, setSelectedNode } = useFactoryStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedZone = selectedNode ? zones.find((z) => z.id === selectedNode.zoneId) : null;

  const panelStyle: React.CSSProperties = {
    width: 240, minWidth: 240,
    height: "100%",
    backgroundColor: t.panelBg,
    borderLeft: `1px solid ${t.border}`,
    display: "flex", flexDirection: "column",
    overflow: "hidden",
    flexShrink: 0,
  };

  const panelHeader: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8,
    padding: "12px 16px",
    borderBottom: `1px solid ${t.border}`,
    flexShrink: 0,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 10, fontWeight: 600, color: t.textDim,
    textTransform: "uppercase", letterSpacing: "0.08em",
    marginBottom: 5, fontFamily: "monospace",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 32,
    backgroundColor: t.inputBg,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: 6,
    padding: "0 8px",
    fontSize: 12, color: t.textPrimary,
    outline: "none",
    fontFamily: "inherit",
  };

  if (!selectedZone || !selectedNode) {
    return (
      <div style={panelStyle}>
        <div style={panelHeader}>
          <Building2 size={14} color={t.textMuted} />
          <span style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Floor
          </span>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Stat label="Zones" value={zones.length.toString()} t={t} />
            <Stat label="Connections" value="0" t={t} />
          </div>
          <p style={{ fontSize: 11, color: t.textDim, lineHeight: 1.6 }}>
            Click a zone to edit its properties. Drag handles to resize.
            Connect zones by dragging from one edge to another.
          </p>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: t.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
              Quick Reference
            </p>
            {ZONE_TYPE_LIST.slice(0, 4).map((type) => {
              const colors = ZONE_COLORS[type];
              return (
                <div key={type} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 0",
                  borderBottom: `1px solid ${t.borderFaint}`,
                }}>
                  <span style={{ color: colors.text }}>{ZONE_ICON[type]}</span>
                  <span style={{ fontSize: 11, color: t.textMuted, flex: 1 }}>{ZONE_LABELS[type]}</span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: colors.border, flexShrink: 0 }} />
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
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {ZONE_LABELS[selectedZone.type]}
        </span>
        <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, borderRadius: 6, marginLeft: "auto" }}>
          <X size={13} color={colors.text + "88"} />
        </button>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        <div>
          <label style={labelStyle}>Zone Name</label>
          <input
            style={inputStyle}
            value={selectedZone.name}
            onChange={(e) => updateZone(selectedZone.id, { name: e.target.value })}
          />
        </div>

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
                    backgroundColor: isActive ? c.bg : t.inputBg,
                    border: `1px solid ${isActive ? c.border : t.inputBorder}`,
                    borderRadius: 6, cursor: "pointer",
                  }}
                >
                  <span style={{ color: isActive ? c.text : t.textDim }}>{ZONE_ICON[type]}</span>
                  <span style={{ fontSize: 10, color: isActive ? c.text : t.textMuted, fontWeight: 600 }}>
                    {ZONE_LABELS[type].split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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

        <div style={{ display: "flex", gap: 8 }}>
          <Stat label="W" value={`${Math.round(selectedNode.width / 20)}u`} t={t} />
          <Stat label="H" value={`${Math.round(selectedNode.height / 20)}u`} t={t} />
        </div>

        <div>
          <label style={labelStyle}>Notes</label>
          <textarea
            style={{ ...inputStyle, height: 60, resize: "vertical", lineHeight: 1.5 }}
            placeholder="Optional description..."
            value={selectedZone.description ?? ""}
            onChange={(e) => updateZone(selectedZone.id, { description: e.target.value })}
          />
        </div>

        <button
          onClick={() => removeZone(selectedZone.id)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px", height: 34,
            backgroundColor: "transparent",
            border: "1px solid #FF3B3030",
            borderRadius: 8, cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: "#FF3B30",
            marginTop: 4,
          }}
        >
          Remove Zone
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, t }: { label: string; value: string; t: Theme }) {
  return (
    <div style={{
      flex: 1, padding: "6px 10px",
      backgroundColor: t.inputBg,
      border: `1px solid ${t.borderFaint}`,
      borderRadius: 6,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 10, color: t.textDim, fontFamily: "monospace" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Toolbar
══════════════════════════════════════════════════ */
function Toolbar({
  toolMode, setToolMode, onAddZone, onClearFloor, onUndo, canUndo, t,
}: {
  toolMode: ToolMode;
  setToolMode: (m: ToolMode) => void;
  onAddZone: () => void;
  onClearFloor: () => void;
  onUndo: () => void;
  canUndo: boolean;
  t: Theme;
}) {
  const tools = [
    { id: "select" as ToolMode, icon: <MousePointer2 size={17} strokeWidth={1.8} />, label: "Select (V)" },
    { id: "connect" as ToolMode, icon: <Spline size={17} strokeWidth={1.8} />, label: "Connect (C)" },
  ];

  return (
    <div style={{
      width: 52, minWidth: 52,
      height: "100%",
      backgroundColor: t.panelBg,
      borderRight: `1px solid ${t.border}`,
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 10,
      gap: 4,
      flexShrink: 0,
    }}>
      {tools.map((tool) => (
        <ToolBtn key={tool.id} active={toolMode === tool.id} onClick={() => setToolMode(tool.id)} title={tool.label} t={t}>
          {tool.icon}
        </ToolBtn>
      ))}

      <div style={{ width: 28, height: 1, backgroundColor: t.border, margin: "4px 0" }} />

      <ToolBtn onClick={onAddZone} title="Add Zone (S)" active={toolMode === "add"} t={t}>
        <Square size={17} strokeWidth={1.8} />
      </ToolBtn>

      <div style={{ width: 28, height: 1, backgroundColor: t.border, margin: "4px 0" }} />

      <ToolBtn
        onClick={onUndo}
        title="Undo (⌘Z)"
        disabled={!canUndo}
        t={t}
      >
        <Undo2 size={15} strokeWidth={1.8} />
      </ToolBtn>

      <div style={{ width: 28, height: 1, backgroundColor: t.border, margin: "4px 0", marginTop: "auto" }} />

      <ToolBtn onClick={onClearFloor} title="Clear Floor" style={{ marginBottom: 8 }} t={t}>
        <RotateCcw size={15} strokeWidth={1.8} />
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  children, active = false, disabled = false, onClick, title, style: extStyle, t,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  style?: React.CSSProperties;
  t: Theme;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      style={{
        width: 36, height: 36,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: active ? "#F56300" : "transparent",
        border: `1px solid ${active ? "#F56300" : "transparent"}`,
        borderRadius: 8,
        color: disabled ? t.textDim : active ? "#fff" : t.textMuted,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background-color 0.15s, color 0.15s, opacity 0.15s",
        ...extStyle,
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = t.toolHover;
          (e.currentTarget as HTMLButtonElement).style.color = t.textPrimary;
        }
      }}
      onMouseLeave={(e) => {
        if (!active && !disabled) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = t.textMuted;
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
  const isDark = useDarkMode();
  const t = isDark ? DARK : LIGHT;

  const [toolMode,     setToolMode]     = useState<ToolMode>("select");
  const [addZoneType,  setAddZoneType]  = useState<ZoneType | null>(null);
  const [showDialog,   setShowDialog]   = useState(false);
  const [mousePos,     setMousePos]     = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { zones, nodes, clearFloor, undo, canUndo } = useFactoryStore();

  /* Fullscreen sync */
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); return; }
      if (e.key === "v" || e.key === "V" || e.key === "Escape") { setToolMode("select"); setAddZoneType(null); }
      if (e.key === "s" || e.key === "S") setShowDialog(true);
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
    backgroundColor: t.btnGhostBg,
    color: t.textMuted,
    border: `1px solid ${t.border}`, borderRadius: 7,
    fontSize: 12, fontWeight: 500, cursor: "pointer",
  };

  return (
    <div
      ref={containerRef}
      style={{
        margin: isFullscreen ? 0 : "-24px",
        height: isFullscreen ? "100vh" : "calc(100vh - 52px)",
        display: "flex",
        flexDirection: "column",
        backgroundColor: t.canvasBg,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ── Header ── */}
      <div style={{
        height: 44,
        display: "flex", alignItems: "center",
        padding: "0 16px",
        backgroundColor: t.headerBg,
        borderBottom: `1px solid ${t.border}`,
        flexShrink: 0,
        gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={16} color="#F56300" />
          <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, letterSpacing: "-0.01em" }}>
            Factory Floor Builder
          </span>
        </div>

        <div style={{ width: 1, height: 20, backgroundColor: t.border }} />

        <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "monospace" }}>
          {zones.length} zones · {nodes.length} placed
        </span>

        {toolMode === "add" && addZoneType && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "3px 10px",
            backgroundColor: "#F5630015",
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

        <button onClick={() => setShowDialog(true)} style={headerBtnOrange}>
          <Plus size={13} /> Add Zone
        </button>
        <button style={headerBtnGhost}>
          <Save size={13} /> Save Layout
        </button>
        <button onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"} style={headerBtnGhost}>
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Toolbar
          toolMode={toolMode}
          setToolMode={setToolMode}
          onAddZone={() => setShowDialog(true)}
          onClearFloor={clearFloor}
          onUndo={undo}
          canUndo={canUndo}
          t={t}
        />

        <div style={{ flex: 1, overflow: "hidden" }}>
          <ReactFlowProvider>
            <FactoryCanvasInner
              toolMode={toolMode}
              addZoneType={addZoneType}
              onAddZoneTypeUsed={() => { setToolMode("select"); setAddZoneType(null); }}
              onMousePosChange={(x, y) => setMousePos({ x, y })}
              t={t}
            />
          </ReactFlowProvider>
        </div>

        <PropertiesPanel t={t} />
      </div>

      {/* ── Status bar ── */}
      <div style={{
        height: 24,
        display: "flex", alignItems: "center",
        padding: "0 16px",
        backgroundColor: t.statusBg,
        borderTop: `1px solid ${t.borderFaint}`,
        gap: 16,
        flexShrink: 0,
      }}>
        <StatusItem label="X" value={mousePos.x.toString()} t={t} />
        <StatusItem label="Y" value={mousePos.y.toString()} t={t} />
        <div style={{ width: 1, height: 12, backgroundColor: t.border }} />
        <StatusItem label="GRID" value="1u = 20px" t={t} />
        <StatusItem label="SNAP" value="ON" t={t} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: t.textDim, fontFamily: "monospace" }}>
          V — select · S — add zone · C — connect · F — fullscreen · ESC — cancel
        </span>
      </div>

      {showDialog && (
        <AddZoneDialog onClose={() => setShowDialog(false)} onSelectType={handleSelectType} t={t} />
      )}
    </div>
  );
}

function StatusItem({ label, value, t }: { label: string; value: string; t: Theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 9, color: t.textDim, fontFamily: "monospace", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 9, color: t.textMuted, fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}
