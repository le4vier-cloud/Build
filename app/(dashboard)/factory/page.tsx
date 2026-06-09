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
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useFactoryStore } from "@/stores/useFactoryStore";
import { FactoryZoneNode  } from "@/components/factory/FactoryZoneNode";
import { FactoryWallNode  } from "@/components/factory/FactoryWallNode";
import {
  ZONE_COLORS, ZONE_LABELS, ZoneType,
  WALL_CONFIG, WallType,
  type FactoryZone, type FactoryWall,
} from "@/types/factory";
import {
  MousePointer2, Square, Spline, Maximize2, Minimize2,
  Building2, X, Plus, Save, RotateCcw, Undo2, Keyboard,
  Minus, Navigation, Cog,
} from "lucide-react";
import { Cpu, Wrench, Archive, Truck, Briefcase, Package, Send } from "lucide-react";

/* ── Theme ───────────────────────────────────────── */
interface Theme {
  canvasBg:    string; panelBg:  string; headerBg:    string;
  statusBg:    string; border:   string; borderFaint: string;
  textPrimary: string; textMuted:string; textDim:     string;
  inputBg:     string; inputBorder:string;
  gridMinor:   string; gridMajor:  string;
  overlayBg:   string; toolActive: string; toolHover:   string;
  btnGhostBg:  string; btnGhostText:string;
}
const DARK: Theme = {
  canvasBg: "#1A1A1A", panelBg: "#141414", headerBg: "#141414",
  statusBg: "#111111", border: "#2A2A2A", borderFaint: "#222222",
  textPrimary: "#E8E8E8", textMuted: "#888888", textDim: "#444444",
  inputBg: "#1E1E1E", inputBorder: "#333333",
  gridMinor: "#212121", gridMajor: "#282828",
  overlayBg: "rgba(0,0,0,0.65)", toolActive: "#2A2A2A", toolHover: "#242424",
  btnGhostBg: "transparent", btnGhostText: "#666666",
};
const LIGHT: Theme = {
  canvasBg: "#EBEBEB", panelBg: "#F5F5F5", headerBg: "#F5F5F5",
  statusBg: "#E8E8E8", border: "#D4D4D4", borderFaint: "#DCDCDC",
  textPrimary: "#1D1D1F", textMuted: "#6E6E73", textDim: "#AEAEB2",
  inputBg: "#FFFFFF", inputBorder: "#C8C8C8",
  gridMinor: "#DCDCDC", gridMajor: "#C8C8C8",
  overlayBg: "rgba(0,0,0,0.35)", toolActive: "#E0E0E0", toolHover: "#E4E4E4",
  btnGhostBg: "transparent", btnGhostText: "#6E6E73",
};

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const h = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return dark;
}

/* ── Zone catalogue ──────────────────────────────── */
const ZONE_TYPE_LIST: ZoneType[] = [
  "machining", "assembly", "station", "storage",
  "logistics", "office", "raw_materials", "dispatch",
];
const ZONE_ICON: Record<ZoneType, React.ReactNode> = {
  machining:     <Cpu size={13} />,
  assembly:      <Wrench size={13} />,
  station:       <Cog size={13} />,
  storage:       <Archive size={13} />,
  logistics:     <Truck size={13} />,
  office:        <Briefcase size={13} />,
  raw_materials: <Package size={13} />,
  dispatch:      <Send size={13} />,
};

const nodeTypes = {
  factoryZone: FactoryZoneNode,
  factoryWall: FactoryWallNode,
};

type ToolMode    = "select" | "add" | "connect" | "wall" | "walkway";
type Orientation = "horizontal" | "vertical";

/* ── Context menu helpers ────────────────────────── */
type CtxKind = "zone" | "wall" | "canvas";
interface CtxMenuState {
  screenX: number; screenY: number;
  kind: CtxKind;
  nodeId: string | null;
  flowX: number; flowY: number;
}

function CtxItem({
  label, shortcut, onClick, disabled = false, destructive = false, t,
}: {
  label: string; shortcut?: string; onClick: () => void;
  disabled?: boolean; destructive?: boolean; t: Theme;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onPointerDown={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "5px 12px", gap: 20, borderRadius: 4,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.38 : 1,
        backgroundColor: hov && !disabled
          ? destructive ? "rgba(255,59,48,0.1)" : t.toolHover
          : "transparent",
        color: destructive ? "#FF3B30" : t.textPrimary,
        fontSize: 12, userSelect: "none",
      }}
    >
      <span>{label}</span>
      {shortcut && (
        <span style={{
          fontSize: 10, fontFamily: "monospace",
          color: destructive ? "#FF3B3088" : t.textDim,
          whiteSpace: "nowrap",
        }}>
          {shortcut}
        </span>
      )}
    </div>
  );
}

function CtxSep({ t }: { t: Theme }) {
  return <div style={{ height: 1, backgroundColor: t.borderFaint, margin: "3px 0" }} />;
}

/** Zone-specific context menu row — shows a colour swatch beside the label */
function CtxZoneItem({ type, onClick, t }: { type: ZoneType; onClick: () => void; t: Theme }) {
  const [hov, setHov] = useState(false);
  const c = ZONE_COLORS[type];
  return (
    <div
      onPointerDown={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "4px 12px", borderRadius: 4, cursor: "pointer",
        backgroundColor: hov ? t.toolHover : "transparent",
        userSelect: "none",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c.border, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: t.textPrimary }}>{ZONE_LABELS[type]}</span>
    </div>
  );
}

function CtxLabel({ children, t }: { children: React.ReactNode; t: Theme }) {
  return (
    <div style={{
      padding: "5px 12px 2px",
      fontSize: 9, fontWeight: 800, color: t.textDim,
      textTransform: "uppercase", letterSpacing: "0.12em",
      fontFamily: "monospace",
    }}>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Inner canvas
══════════════════════════════════════════════════ */
function FactoryCanvasInner({
  toolMode, addZoneType, onAddZoneTypeUsed,
  wallOrientation, onOpenAddZoneDialog, onMousePosChange, t,
}: {
  toolMode:            ToolMode;
  addZoneType:         ZoneType | null;
  onAddZoneTypeUsed:   () => void;
  wallOrientation:     Orientation;
  onOpenAddZoneDialog: () => void;
  onMousePosChange:    (x: number, y: number) => void;
  t:                   Theme;
}) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const { zoom } = useViewport();

  const {
    zones, nodes: storeNodes, edges: storeEdges, walls,
    addZone, removeZone, updateNodePosition, setSelectedNode, addFlowPath,
    addWall, removeWall, updateWall,
  } = useFactoryStore();

  /* ── Clipboard ─────────────────────────────────── */
  type ClipEntry = {
    zone:   FactoryZone;
    pos:    { x: number; y: number };
    width:  number;
    height: number;
  };
  const clipboardRef  = useRef<ClipEntry[]>([]);
  const pasteCountRef = useRef(0);

  /* ── Context menu ──────────────────────────────── */
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const closeCtx = useCallback(() => setCtxMenu(null), []);

  useEffect(() => {
    if (!ctxMenu) return;
    const onDown = (e: PointerEvent) => {
      const el = document.getElementById("fctx");
      if (el && e.target instanceof Element && el.contains(e.target)) return;
      setCtxMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCtxMenu(null); };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); };
  }, [ctxMenu]);

  /* ── RF node list ───────────────────────────────── */
  const buildRfNodes = (): Node[] => [
    ...storeNodes.map((n) => {
      const zone = zones.find((z) => z.id === n.zoneId);
      if (!zone) return null!;
      return { id: n.id, type: "factoryZone", position: n.position, data: { zone }, style: { width: n.width, height: n.height } } as Node;
    }).filter(Boolean),
    ...walls.map((w) => ({
      id: w.id, type: "factoryWall", position: w.position, data: { wall: w },
      style: {
        width:  w.orientation === "horizontal" ? w.length    : w.thickness,
        height: w.orientation === "horizontal" ? w.thickness : w.length,
      },
    } as Node)),
  ];

  const buildRfEdges = (): Edge[] =>
    storeEdges.map((e) => ({
      id: e.id, source: e.sourceId, target: e.targetId,
      label: e.label ?? e.pathType,
      animated: e.pathType === "conveyor" || e.pathType === "agv",
      style: { stroke: "#3B82F6", strokeWidth: 2 },
      markerEnd: { type: "arrowclosed" as const, color: "#3B82F6" },
      labelStyle: { fontSize: 10, fontFamily: "monospace", fill: "#8888A8", fontWeight: 600 },
      labelBgStyle: { fill: t.panelBg, fillOpacity: 0.85 },
    }));

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(buildRfNodes());
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(buildRfEdges());

  useEffect(() => { setRfNodes(buildRfNodes()); }, [storeNodes, zones, walls]);
  useEffect(() => { setRfEdges(buildRfEdges()); }, [storeEdges]);
  useEffect(() => { if (storeNodes.length > 0 || walls.length > 0) fitView({ padding: 0.2 }); }, []);

  /* Sync RF delete-key removals to store */
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((ch) => {
        if (ch.type === "remove") {
          const sn = storeNodes.find((n) => n.id === ch.id);
          if (sn) { removeZone(sn.zoneId); return; }
          const wall = walls.find((w) => w.id === ch.id);
          if (wall) removeWall(wall.id);
        }
      });
      onNodesChange(changes);
    },
    [onNodesChange, storeNodes, removeZone, walls, removeWall]
  );

  /* ── Context menu helpers ─────────────────────── */
  const duplicateNodeById = useCallback((nodeId: string) => {
    const sn = storeNodes.find((n) => n.id === nodeId);
    if (sn) {
      const zone = zones.find((z) => z.id === sn.zoneId);
      if (zone) addZone(
        { name: zone.name, type: zone.type, description: zone.description, capacity: zone.capacity },
        { x: Math.round((sn.position.x + 20) / 20) * 20, y: Math.round((sn.position.y + 20) / 20) * 20 },
        { width: sn.width, height: sn.height },
      );
      return;
    }
    const wall = walls.find((w) => w.id === nodeId);
    if (wall) addWall({
      wallType: wall.wallType, orientation: wall.orientation,
      position: { x: Math.round((wall.position.x + 20) / 20) * 20, y: Math.round((wall.position.y + 20) / 20) * 20 },
      length: wall.length, thickness: wall.thickness,
    });
  }, [storeNodes, zones, walls, addZone, addWall]);

  const deleteNodeById = useCallback((nodeId: string) => {
    const sn = storeNodes.find((n) => n.id === nodeId);
    if (sn) { removeZone(sn.zoneId); return; }
    const wall = walls.find((w) => w.id === nodeId);
    if (wall) removeWall(wall.id);
  }, [storeNodes, zones, walls, removeZone, removeWall]);

  const flipWallOrientation = useCallback((wallId: string) => {
    const w = walls.find((x) => x.id === wallId);
    if (!w) return;
    const isH = w.orientation === "horizontal";
    const newOri: Orientation = isH ? "vertical" : "horizontal";
    /* Keep visual centre fixed when rotating */
    const cx = w.position.x + (isH ? w.length    : w.thickness) / 2;
    const cy = w.position.y + (isH ? w.thickness : w.length)    / 2;
    const nw = isH ? w.thickness : w.length;
    const nh = isH ? w.length    : w.thickness;
    updateWall(wallId, {
      orientation: newOri,
      position: { x: Math.round((cx - nw / 2) / 20) * 20, y: Math.round((cy - nh / 2) / 20) * 20 },
    });
  }, [walls, updateWall]);

  const doPaste = useCallback((off: number) => {
    clipboardRef.current.forEach(({ zone, pos, width, height }) => {
      addZone(
        { name: zone.name, type: zone.type, description: zone.description, capacity: zone.capacity },
        { x: Math.round((pos.x + off) / 20) * 20, y: Math.round((pos.y + off) / 20) * 20 },
        { width, height },
      );
    });
  }, [addZone]);

  /* ── Keyboard shortcuts ─────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const cmd = e.metaKey || e.ctrlKey;

      if (cmd && e.key === "a") {
        e.preventDefault();
        setRfNodes((ns) => ns.map((n) => ({ ...n, selected: true })));
        return;
      }
      if (cmd && e.key === "c") {
        e.preventDefault();
        const sel = rfNodes.filter((n) => n.selected && n.type === "factoryZone");
        if (!sel.length) return;
        clipboardRef.current = sel.flatMap((n) => {
          const sn   = storeNodes.find((s) => s.id === n.id);
          const zone = sn ? zones.find((z) => z.id === sn.zoneId) : null;
          if (!zone || !sn) return [];
          return [{ zone, pos: { x: n.position.x, y: n.position.y }, width: sn.width, height: sn.height }];
        });
        pasteCountRef.current = 0;
        return;
      }
      if (cmd && e.key === "v") {
        e.preventDefault();
        if (!clipboardRef.current.length) return;
        pasteCountRef.current++;
        doPaste(pasteCountRef.current * 20);
        return;
      }
      if (cmd && e.key === "d") {
        e.preventDefault();
        rfNodes.filter((n) => n.selected && n.type === "factoryZone").forEach((n) => {
          const sn   = storeNodes.find((s) => s.id === n.id);
          const zone = sn ? zones.find((z) => z.id === sn.zoneId) : null;
          if (!zone || !sn) return;
          addZone(
            { name: zone.name, type: zone.type, description: zone.description, capacity: zone.capacity },
            { x: Math.round((n.position.x + 20) / 20) * 20, y: Math.round((n.position.y + 20) / 20) * 20 },
            { width: sn.width, height: sn.height },
          );
        });
        return;
      }
      if (cmd && e.shiftKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        fitView({ padding: 0.15, duration: 300 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rfNodes, storeNodes, zones, addZone, fitView, setRfNodes, doPaste]);

  /* ── RF event handlers ─────────────────────────── */
  const onConnect = useCallback(
    (connection: Connection) => {
      addFlowPath({ sourceId: connection.source!, targetId: connection.target!, pathType: "walkway" });
    },
    [addFlowPath]
  );

  const onNodeDragStop = useCallback(
    (_e: unknown, node: Node) => {
      if (node.type === "factoryZone") updateNodePosition(node.id, node.position);
      else if (node.type === "factoryWall") updateWall(node.id, { position: node.position });
    },
    [updateNodePosition, updateWall]
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => { setSelectedNode(node.id); },
    [setSelectedNode]
  );

  /* Right-click on node */
  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: Node) => {
      e.preventDefault();
      const raw = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setSelectedNode(node.id);
      setCtxMenu({
        screenX: e.clientX, screenY: e.clientY,
        kind: node.type === "factoryWall" ? "wall" : "zone",
        nodeId: node.id,
        flowX: Math.round(raw.x / 20) * 20, flowY: Math.round(raw.y / 20) * 20,
      });
    },
    [screenToFlowPosition, setSelectedNode]
  );

  /* Right-click on canvas */
  const onPaneContextMenu = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      e.preventDefault();
      const raw = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setCtxMenu({
        screenX: e.clientX, screenY: e.clientY,
        kind: "canvas", nodeId: null,
        flowX: Math.round(raw.x / 20) * 20, flowY: Math.round(raw.y / 20) * 20,
      });
    },
    [screenToFlowPosition]
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (toolMode === "add" && addZoneType) {
        const raw = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const pos = { x: Math.round(raw.x / 20) * 20 - 90, y: Math.round(raw.y / 20) * 20 - 60 };
        addZone({ name: `New ${ZONE_LABELS[addZoneType]}`, type: addZoneType }, pos);
        onAddZoneTypeUsed();
      } else if (toolMode === "wall" || toolMode === "walkway") {
        const raw = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const gx  = Math.round(raw.x / 20) * 20;
        const gy  = Math.round(raw.y / 20) * 20;
        const cfg = WALL_CONFIG[toolMode as WallType];
        const isH = wallOrientation === "horizontal";
        addWall({
          wallType: toolMode as WallType, orientation: wallOrientation,
          position: {
            x: isH ? gx - cfg.defaultLength / 2 : gx - cfg.defaultThickness / 2,
            y: isH ? gy - cfg.defaultThickness / 2 : gy - cfg.defaultLength / 2,
          },
          length: cfg.defaultLength, thickness: cfg.defaultThickness,
        });
      } else {
        setSelectedNode(null);
      }
    },
    [toolMode, addZoneType, addZone, onAddZoneTypeUsed, setSelectedNode,
     screenToFlowPosition, wallOrientation, addWall]
  );

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      onMousePosChange(Math.round(pos.x / 20), Math.round(pos.y / 20));
    },
    [screenToFlowPosition, onMousePosChange]
  );

  const cursorStyle =
    toolMode === "add" || toolMode === "wall" || toolMode === "walkway" ? "crosshair" :
    toolMode === "connect" ? "cell" : "default";

  /* ── Context menu content ─────────────────────── */
  const renderCtxMenu = () => {
    if (!ctxMenu) return null;

    const close  = () => closeCtx();
    const hasCb  = clipboardRef.current.length > 0;

    /* Zone right-click */
    if (ctxMenu.kind === "zone") {
      const sn   = storeNodes.find((n) => n.id === ctxMenu.nodeId);
      const zone = sn ? zones.find((z) => z.id === sn.zoneId) : null;
      const colors = zone ? ZONE_COLORS[zone.type] : null;
      return (
        <>
          {/* Header */}
          {zone && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 12px 6px",
              borderBottom: `1px solid ${colors!.border}33`,
              backgroundColor: colors!.bg,
            }}>
              <span style={{ color: colors!.text, display: "flex" }}>{ZONE_ICON[zone.type]}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors!.text }}>
                {zone.name}
              </span>
            </div>
          )}
          <div style={{ padding: "4px 0" }}>
            <CtxItem label="Copy"      shortcut="⌘C" t={t} onClick={() => {
              if (!sn || !zone) return;
              clipboardRef.current = [{ zone, pos: sn.position, width: sn.width, height: sn.height }];
              pasteCountRef.current = 0; close();
            }} />
            <CtxItem label="Duplicate" shortcut="⌘D" t={t} onClick={() => {
              if (ctxMenu.nodeId) duplicateNodeById(ctxMenu.nodeId); close();
            }} />
            <CtxSep t={t} />
            <CtxItem label="Delete" shortcut="⌫" destructive t={t} onClick={() => {
              if (ctxMenu.nodeId) deleteNodeById(ctxMenu.nodeId); close();
            }} />
          </div>
        </>
      );
    }

    /* Wall right-click */
    if (ctxMenu.kind === "wall") {
      const wall = walls.find((w) => w.id === ctxMenu.nodeId);
      const isWall = wall?.wallType === "wall";
      const accentColor = isWall ? "#686868" : "#3A78B0";
      return (
        <>
          {wall && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 12px 6px",
              borderBottom: `1px solid ${accentColor}33`,
              backgroundColor: isWall ? "rgba(104,104,104,0.08)" : "rgba(58,120,176,0.08)",
            }}>
              {isWall
                ? <Minus size={12} color={accentColor} />
                : <Navigation size={12} color={accentColor} />
              }
              <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>
                {WALL_CONFIG[wall.wallType].label}
              </span>
              <span style={{ fontSize: 10, color: accentColor + "88", fontFamily: "monospace", marginLeft: 2 }}>
                {wall.orientation === "horizontal" ? "↔" : "↕"}
              </span>
            </div>
          )}
          <div style={{ padding: "4px 0" }}>
            <CtxItem label="Flip Orientation" shortcut="O" t={t} onClick={() => {
              if (ctxMenu.nodeId) flipWallOrientation(ctxMenu.nodeId); close();
            }} />
            <CtxItem label="Duplicate" shortcut="⌘D" t={t} onClick={() => {
              if (ctxMenu.nodeId) duplicateNodeById(ctxMenu.nodeId); close();
            }} />
            <CtxSep t={t} />
            <CtxItem label="Delete" shortcut="⌫" destructive t={t} onClick={() => {
              if (ctxMenu.nodeId) deleteNodeById(ctxMenu.nodeId); close();
            }} />
          </div>
        </>
      );
    }

    /* Canvas right-click */
    return (
      <div style={{ padding: "4px 0" }}>
        <CtxItem label="Paste" shortcut="⌘V" disabled={!hasCb} t={t} onClick={() => {
          if (!hasCb) return;
          pasteCountRef.current++;
          doPaste(pasteCountRef.current * 20);
          close();
        }} />
        <CtxItem label="Select All" shortcut="⌘A" t={t} onClick={() => {
          setRfNodes((ns) => ns.map((n) => ({ ...n, selected: true }))); close();
        }} />
        <CtxSep t={t} />
        <CtxLabel t={t}>Place Zone</CtxLabel>
        {ZONE_TYPE_LIST.map((type) => (
          <CtxZoneItem key={type} type={type} t={t} onClick={() => {
            addZone(
              { name: `New ${ZONE_LABELS[type]}`, type },
              { x: ctxMenu.flowX - 90, y: ctxMenu.flowY - 60 },
            );
            close();
          }} />
        ))}
        <CtxSep t={t} />
        <CtxItem label="Add Wall here"    shortcut="W" t={t} onClick={() => {
          const cfg = WALL_CONFIG["wall"];
          addWall({ wallType: "wall", orientation: "horizontal", position: { x: ctxMenu.flowX - cfg.defaultLength / 2, y: ctxMenu.flowY - cfg.defaultThickness / 2 }, length: cfg.defaultLength, thickness: cfg.defaultThickness });
          close();
        }} />
        <CtxItem label="Add Walkway here" shortcut="K" t={t} onClick={() => {
          const cfg = WALL_CONFIG["walkway"];
          addWall({ wallType: "walkway", orientation: "horizontal", position: { x: ctxMenu.flowX - cfg.defaultLength / 2, y: ctxMenu.flowY - cfg.defaultThickness / 2 }, length: cfg.defaultLength, thickness: cfg.defaultThickness });
          close();
        }} />
        <CtxSep t={t} />
        <CtxItem label="Fit to Screen" shortcut="⌘⇧H" t={t} onClick={() => {
          fitView({ padding: 0.15, duration: 300 }); close();
        }} />
        <CtxSep t={t} />
        <CtxItem label="Clear Floor" destructive t={t} onClick={() => {
          useFactoryStore.getState().clearFloor(); close();
        }} />
      </div>
    );
  };

  /* ── Position context menu smartly ─────────────── */
  const ctxStyle = (): React.CSSProperties => {
    if (!ctxMenu) return {};
    const W = 220;
    const left = ctxMenu.screenX + W > window.innerWidth  ? ctxMenu.screenX - W : ctxMenu.screenX;
    const top  = Math.min(ctxMenu.screenY, window.innerHeight - 60);
    return { position: "fixed", left, top, width: W, zIndex: 1000, maxHeight: "80vh", overflowY: "auto" };
  };

  return (
    <div style={{ width: "100%", height: "100%", cursor: cursorStyle }} onMouseMove={onMouseMove}>
      <ReactFlow
        nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick} onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu} onPaneContextMenu={onPaneContextMenu}
        snapGrid={[20, 20]} snapToGrid fitView
        minZoom={0} maxZoom={4}
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
        <Controls style={{ backgroundColor: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} />
        <MiniMap
          style={{ backgroundColor: t.statusBg, border: `1px solid ${t.border}`, borderRadius: 8 }}
          nodeColor={(node) => {
            if (node.type === "factoryWall") {
              return (node.data as { wall: FactoryWall }).wall.wallType === "walkway" ? "#3A78B0" : "#484848";
            }
            const zone = (node.data as { zone: FactoryZone }).zone;
            return zone ? ZONE_COLORS[zone.type].border : t.border;
          }}
          maskColor={t.overlayBg.replace("0.65)", "0.5)").replace("0.35)", "0.3)")}
        />
        <Panel position="bottom-center">
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 12px", backgroundColor: t.panelBg + "CC", border: `1px solid ${t.border}`, borderRadius: 999, backdropFilter: "blur(4px)" }}>
            <span style={{ fontSize: 10, color: t.textMuted, fontFamily: "monospace" }}>{Math.round(zoom * 100)}%</span>
          </div>
        </Panel>
      </ReactFlow>

      {/* ── Context menu ── */}
      {ctxMenu && (
        <div
          id="fctx"
          style={{
            ...ctxStyle(),
            backgroundColor: t.panelBg,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            boxShadow: "0 16px 48px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {renderCtxMenu()}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Add Zone Dialog
══════════════════════════════════════════════════ */
function AddZoneDialog({ onClose, onSelectType, t }: { onClose: () => void; onSelectType: (type: ZoneType) => void; t: Theme }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: t.overlayBg, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ width: 440, backgroundColor: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.3)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${t.border}` }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>Add Zone</h2>
            <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>Select type, then click on the canvas to place</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
            <X size={15} color={t.textMuted} />
          </button>
        </div>
        <div style={{ padding: "16px 20px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ZONE_TYPE_LIST.map((type) => {
            const c = ZONE_COLORS[type];
            return (
              <button key={type} onClick={() => onSelectType(type)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", backgroundColor: c.bg, border: `1.5px solid ${c.border}66`, borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "border-color 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = c.border; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = c.border + "66"; }}
              >
                <span style={{ color: c.text }}>{ZONE_ICON[type]}</span>
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
  const {
    zones, nodes, walls, selectedNodeId,
    updateZone, removeZone, setSelectedNode,
    updateWall, removeWall,
  } = useFactoryStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedZone = selectedNode ? zones.find((z) => z.id === selectedNode.zoneId) : null;
  const selectedWall = walls.find((w) => w.id === selectedNodeId);

  const panelStyle: React.CSSProperties = {
    width: 240, minWidth: 240, height: "100%",
    backgroundColor: t.panelBg, borderLeft: `1px solid ${t.border}`,
    display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0,
  };
  const hdr: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8,
    padding: "12px 16px", borderBottom: `1px solid ${t.border}`, flexShrink: 0,
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 600, color: t.textDim,
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, fontFamily: "monospace",
  };
  const inp: React.CSSProperties = {
    width: "100%", height: 32, backgroundColor: t.inputBg,
    border: `1px solid ${t.inputBorder}`, borderRadius: 6,
    padding: "0 8px", fontSize: 12, color: t.textPrimary, outline: "none", fontFamily: "inherit",
  };

  /* Wall panel */
  if (selectedWall) {
    const cfg = WALL_CONFIG[selectedWall.wallType];
    const isWall = selectedWall.wallType === "wall";
    const acc = isWall ? "#686868" : "#3A78B0";
    const accBg = isWall ? "rgba(104,104,104,0.08)" : "rgba(58,120,176,0.08)";
    return (
      <div style={panelStyle}>
        <div style={{ ...hdr, borderBottom: `1px solid ${acc}44`, backgroundColor: accBg }}>
          {isWall ? <Minus size={13} color={acc} /> : <Navigation size={13} color={acc} />}
          <span style={{ fontSize: 12, fontWeight: 700, color: acc, textTransform: "uppercase", letterSpacing: "0.08em" }}>{cfg.label}</span>
          <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, marginLeft: "auto" }}>
            <X size={13} color={acc + "88"} />
          </button>
        </div>
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <div>
            <label style={lbl}>Orientation</label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["horizontal", "vertical"] as const).map((o) => (
                <button key={o} onClick={() => updateWall(selectedWall.id, { orientation: o })}
                  style={{ flex: 1, height: 30, backgroundColor: selectedWall.orientation === o ? acc : t.inputBg, border: `1px solid ${selectedWall.orientation === o ? acc : t.inputBorder}`, borderRadius: 6, color: selectedWall.orientation === o ? "#fff" : t.textMuted, fontSize: 11, fontWeight: 700, fontFamily: "monospace", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {o === "horizontal" ? "↔ H" : "↕ V"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Thickness — {selectedWall.thickness}u <span style={{ fontSize: 9, color: t.textDim }}>({cfg.minThickness}–{cfg.maxThickness})</span></label>
            <input type="range" min={cfg.minThickness} max={cfg.maxThickness} step={2} value={selectedWall.thickness} onChange={(e) => updateWall(selectedWall.id, { thickness: parseInt(e.target.value) })} style={{ width: "100%", accentColor: acc }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
              <span style={{ fontSize: 9, color: t.textDim, fontFamily: "monospace" }}>{cfg.minThickness}u</span>
              <span style={{ fontSize: 9, color: t.textDim, fontFamily: "monospace" }}>{cfg.maxThickness}u</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Stat label="L" value={`${Math.round(selectedWall.length / 20)}u`}    t={t} />
            <Stat label="T" value={`${Math.round(selectedWall.thickness / 20)}u`} t={t} />
          </div>
          <p style={{ fontSize: 10, color: t.textDim, lineHeight: 1.6 }}>Drag handles to change length. Use slider for thickness.</p>
          <button onClick={() => removeWall(selectedWall.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", height: 34, backgroundColor: "transparent", border: "1px solid #FF3B3030", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#FF3B30", marginTop: 4 }}>
            Remove {cfg.label}
          </button>
        </div>
      </div>
    );
  }

  /* Empty / zone panel */
  if (!selectedZone || !selectedNode) {
    return (
      <div style={panelStyle}>
        <div style={hdr}>
          <Building2 size={14} color={t.textMuted} />
          <span style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Floor</span>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Stat label="Zones" value={zones.length.toString()} t={t} />
            <Stat label="Walls"  value={walls.length.toString()} t={t} />
          </div>
          <p style={{ fontSize: 11, color: t.textDim, lineHeight: 1.6 }}>Click a zone or wall/walkway to edit properties. Right-click for actions.</p>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: t.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Quick Reference</p>
            {ZONE_TYPE_LIST.slice(0, 4).map((type) => {
              const c = ZONE_COLORS[type];
              return (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
                  <span style={{ color: c.text }}>{ZONE_ICON[type]}</span>
                  <span style={{ fontSize: 11, color: t.textMuted, flex: 1 }}>{ZONE_LABELS[type]}</span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: c.border, flexShrink: 0 }} />
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
      <div style={{ ...hdr, borderBottom: `1px solid ${colors.border}44`, backgroundColor: colors.bg }}>
        <span style={{ color: colors.text }}>{ZONE_ICON[selectedZone.type]}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>{ZONE_LABELS[selectedZone.type]}</span>
        <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, marginLeft: "auto" }}>
          <X size={13} color={colors.text + "88"} />
        </button>
      </div>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        <div>
          <label style={lbl}>Zone Name</label>
          <input style={inp} value={selectedZone.name} onChange={(e) => updateZone(selectedZone.id, { name: e.target.value })} />
        </div>
        <div>
          <label style={lbl}>Type</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {ZONE_TYPE_LIST.map((type) => {
              const c = ZONE_COLORS[type];
              const active = type === selectedZone.type;
              return (
                <button key={type} onClick={() => updateZone(selectedZone.id, { type })}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 8px", backgroundColor: active ? c.bg : t.inputBg, border: `1px solid ${active ? c.border : t.inputBorder}`, borderRadius: 6, cursor: "pointer" }}>
                  <span style={{ color: active ? c.text : t.textDim }}>{ZONE_ICON[type]}</span>
                  <span style={{ fontSize: 10, color: active ? c.text : t.textMuted, fontWeight: 600 }}>{ZONE_LABELS[type].split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label style={lbl}>Capacity</label>
          <input style={inp} type="number" min="0" placeholder="Workers / machines" value={selectedZone.capacity ?? ""} onChange={(e) => updateZone(selectedZone.id, { capacity: parseInt(e.target.value) || undefined })} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Stat label="W" value={`${Math.round(selectedNode.width / 20)}u`}  t={t} />
          <Stat label="H" value={`${Math.round(selectedNode.height / 20)}u`} t={t} />
        </div>
        <div>
          <label style={lbl}>Notes</label>
          <textarea style={{ ...inp, height: 60, resize: "vertical", lineHeight: 1.5 }} placeholder="Optional description..." value={selectedZone.description ?? ""} onChange={(e) => updateZone(selectedZone.id, { description: e.target.value })} />
        </div>
        <button onClick={() => removeZone(selectedZone.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", height: 34, backgroundColor: "transparent", border: "1px solid #FF3B3030", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#FF3B30", marginTop: 4 }}>
          Remove Zone
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, t }: { label: string; value: string; t: Theme }) {
  return (
    <div style={{ flex: 1, padding: "6px 10px", backgroundColor: t.inputBg, border: `1px solid ${t.borderFaint}`, borderRadius: 6, textAlign: "center" }}>
      <div style={{ fontSize: 10, color: t.textDim, fontFamily: "monospace" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Toolbar
══════════════════════════════════════════════════ */
function Toolbar({
  toolMode, setToolMode, wallOrientation, onToggleOrientation,
  onAddZone, onClearFloor, onUndo, canUndo, t,
}: {
  toolMode: ToolMode; setToolMode: (m: ToolMode) => void;
  wallOrientation: Orientation; onToggleOrientation: (o: Orientation) => void;
  onAddZone: () => void; onClearFloor: () => void;
  onUndo: () => void; canUndo: boolean; t: Theme;
}) {
  const isWallMode = toolMode === "wall" || toolMode === "walkway";
  return (
    <div style={{ width: 52, minWidth: 52, height: "100%", backgroundColor: t.panelBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10, gap: 4, flexShrink: 0 }}>
      <ToolBtn active={toolMode === "select"}  onClick={() => setToolMode("select")}  title="Select (V)" t={t}><MousePointer2 size={17} strokeWidth={1.8} /></ToolBtn>
      <ToolBtn active={toolMode === "connect"} onClick={() => setToolMode("connect")} title="Connect (C)" t={t}><Spline size={17} strokeWidth={1.8} /></ToolBtn>
      <div style={{ width: 28, height: 1, backgroundColor: t.border, margin: "4px 0" }} />
      <ToolBtn onClick={onAddZone} title="Add Zone (S)" active={toolMode === "add"} t={t}><Square size={17} strokeWidth={1.8} /></ToolBtn>
      <div style={{ width: 28, height: 1, backgroundColor: t.border, margin: "4px 0" }} />
      <ToolBtn active={toolMode === "wall"}    onClick={() => setToolMode("wall")}    title="Wall (W)"    t={t}><Minus size={17} strokeWidth={2.5} /></ToolBtn>
      <ToolBtn active={toolMode === "walkway"} onClick={() => setToolMode("walkway")} title="Walkway (K)" t={t}><Navigation size={15} strokeWidth={1.8} /></ToolBtn>
      {isWallMode && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
          {(["horizontal", "vertical"] as const).map((o) => (
            <button key={o} onClick={() => onToggleOrientation(o)}
              title={o === "horizontal" ? "Horizontal" : "Vertical"}
              style={{ width: 28, height: 18, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: wallOrientation === o ? "#F56300" : "transparent", border: `1px solid ${wallOrientation === o ? "#F56300" : t.border}`, borderRadius: 4, color: wallOrientation === o ? "#fff" : t.textDim, fontSize: 8, fontWeight: 800, fontFamily: "monospace", cursor: "pointer" }}>
              {o === "horizontal" ? "H" : "V"}
            </button>
          ))}
        </div>
      )}
      <div style={{ width: 28, height: 1, backgroundColor: t.border, margin: "4px 0" }} />
      <ToolBtn onClick={onUndo} title="Undo (⌘Z)" disabled={!canUndo} t={t}><Undo2 size={15} strokeWidth={1.8} /></ToolBtn>
      <div style={{ width: 28, height: 1, backgroundColor: t.border, margin: "4px 0", marginTop: "auto" }} />
      <ToolBtn onClick={onClearFloor} title="Clear Floor" style={{ marginBottom: 8 }} t={t}><RotateCcw size={15} strokeWidth={1.8} /></ToolBtn>
    </div>
  );
}

function ToolBtn({ children, active = false, disabled = false, onClick, title, style: extStyle, t }: {
  children: React.ReactNode; active?: boolean; disabled?: boolean;
  onClick?: () => void; title?: string; style?: React.CSSProperties; t: Theme;
}) {
  return (
    <button onClick={disabled ? undefined : onClick} title={title}
      style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: active ? "#F56300" : "transparent", border: `1px solid ${active ? "#F56300" : "transparent"}`, borderRadius: 8, color: disabled ? t.textDim : active ? "#fff" : t.textMuted, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, transition: "background-color 0.15s, color 0.15s", ...extStyle }}
      onMouseEnter={(e) => { if (!active && !disabled) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = t.toolHover; (e.currentTarget as HTMLButtonElement).style.color = t.textPrimary; } }}
      onMouseLeave={(e) => { if (!active && !disabled) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = t.textMuted; } }}
    >{children}</button>
  );
}

/* ══════════════════════════════════════════════════
   Shortcuts Dropdown
══════════════════════════════════════════════════ */
function ShortcutsDropdown({ t }: { t: Theme }) {
  type Row = { desc: string; keys: string[] };
  const groups: { title: string; rows: Row[] }[] = [
    { title: "Tools", rows: [
      { desc: "Select",        keys: ["V"] },   { desc: "Add Zone",      keys: ["S"] },
      { desc: "Connect",       keys: ["C"] },   { desc: "Wall",          keys: ["W"] },
      { desc: "Walkway",       keys: ["K"] },   { desc: "Toggle H/V",   keys: ["O"] },
      { desc: "Cancel",        keys: ["Esc"] },
    ]},
    { title: "Edit", rows: [
      { desc: "Undo",          keys: ["⌘", "Z"] }, { desc: "Copy",      keys: ["⌘", "C"] },
      { desc: "Paste",         keys: ["⌘", "V"] }, { desc: "Duplicate", keys: ["⌘", "D"] },
      { desc: "Select All",    keys: ["⌘", "A"] }, { desc: "Delete",    keys: ["⌫"] },
    ]},
    { title: "View", rows: [
      { desc: "Fullscreen",    keys: ["F"] },
      { desc: "Zoom In",       keys: ["⌘", "+"] }, { desc: "Zoom Out",  keys: ["⌘", "−"] },
      { desc: "Fit to Screen", keys: ["⌘", "⇧", "H"] },
    ]},
  ];
  const kbd: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    minWidth: 22, height: 20, padding: "0 5px",
    backgroundColor: t.canvasBg, border: `1px solid ${t.border}`, borderBottom: `2px solid ${t.border}`,
    borderRadius: 4, fontSize: 11, fontFamily: "monospace", fontWeight: 700,
    color: t.textPrimary, lineHeight: 1, userSelect: "none",
  };
  return (
    <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 272, zIndex: 500, backgroundColor: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 12, boxShadow: "0 16px 48px rgba(0,0,0,0.22)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px 9px", borderBottom: `1px solid ${t.borderFaint}` }}>
        <Keyboard size={12} color={t.textMuted} />
        <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.09em" }}>Keyboard Shortcuts</span>
      </div>
      <div style={{ padding: "8px 0 10px" }}>
        {groups.map((g, gi) => (
          <div key={g.title}>
            {gi > 0 && <div style={{ height: 1, backgroundColor: t.borderFaint, margin: "6px 14px" }} />}
            <div style={{ padding: "4px 14px 3px", fontSize: 9, fontWeight: 800, color: t.textDim, textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "monospace" }}>{g.title}</div>
            {g.rows.map((row) => (
              <div key={row.desc} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 14px" }}>
                <span style={{ fontSize: 12, color: t.textMuted }}>{row.desc}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  {row.keys.map((k, ki) => (
                    <span key={ki} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      {ki > 0 && <span style={{ fontSize: 9, color: t.textDim, lineHeight: 1 }}>+</span>}
                      <kbd style={kbd}>{k}</kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════ */
export default function FactoryPage() {
  const isDark = useDarkMode();
  const t = isDark ? DARK : LIGHT;

  const [toolMode,        setToolMode]        = useState<ToolMode>("select");
  const [addZoneType,     setAddZoneType]     = useState<ZoneType | null>(null);
  const [wallOrientation, setWallOrientation] = useState<Orientation>("horizontal");
  const [showDialog,      setShowDialog]      = useState(false);
  const [mousePos,        setMousePos]        = useState({ x: 0, y: 0 });
  const [isFullscreen,    setIsFullscreen]    = useState(false);
  const [showShortcuts,   setShowShortcuts]   = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { zones, nodes, walls, clearFloor, undo, canUndo } = useFactoryStore();

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); return; }
      if (e.key === "v" || e.key === "V" || e.key === "Escape") { setToolMode("select"); setAddZoneType(null); }
      if (e.key === "s" || e.key === "S") setShowDialog(true);
      if (e.key === "c" || e.key === "C") setToolMode("connect");
      if (e.key === "w" || e.key === "W") setToolMode("wall");
      if (e.key === "k" || e.key === "K") setToolMode("walkway");
      if (e.key === "o" || e.key === "O") setWallOrientation((o) => o === "horizontal" ? "vertical" : "horizontal");
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSelectType = (type: ZoneType) => {
    setAddZoneType(type); setToolMode("add"); setShowDialog(false);
  };

  const hBtnOrange: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 5, padding: "0 12px", height: 28,
    backgroundColor: "#F56300", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
  };
  const hBtnGhost: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 5, padding: "0 12px", height: 28,
    backgroundColor: t.btnGhostBg, color: t.textMuted,
    border: `1px solid ${t.border}`, borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer",
  };

  const isWallMode = toolMode === "wall" || toolMode === "walkway";

  return (
    <div ref={containerRef} style={{ margin: isFullscreen ? 0 : "-24px", height: isFullscreen ? "100vh" : "calc(100vh - 52px)", display: "flex", flexDirection: "column", backgroundColor: t.canvasBg, overflow: "hidden", userSelect: "none" }}>

      {/* ── Header ── */}
      <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 16px", backgroundColor: t.headerBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={16} color="#F56300" />
          <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, letterSpacing: "-0.01em" }}>Factory Floor Builder</span>
        </div>
        <div style={{ width: 1, height: 20, backgroundColor: t.border }} />
        <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "monospace" }}>
          {zones.length} zones · {nodes.length} placed · {walls.length} segments
        </span>

        {/* Zone placement banner */}
        {toolMode === "add" && addZoneType && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", backgroundColor: "#F5630015", border: "1px solid #F5630066", borderRadius: 999, fontSize: 11, color: "#F56300", fontWeight: 600 }}>
            <Square size={10} />
            Placing {ZONE_LABELS[addZoneType]} — click canvas
            <button onClick={() => { setToolMode("select"); setAddZoneType(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#F56300", display: "flex", padding: 0, marginLeft: 2 }}><X size={12} /></button>
          </div>
        )}

        {/* Wall/walkway placement banner */}
        {isWallMode && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", backgroundColor: toolMode === "wall" ? "rgba(104,104,104,0.1)" : "rgba(58,120,176,0.1)", border: `1px solid ${toolMode === "wall" ? "rgba(104,104,104,0.4)" : "rgba(58,120,176,0.4)"}`, borderRadius: 999, fontSize: 11, color: toolMode === "wall" ? "#888" : "#4A90C8", fontWeight: 600 }}>
            {toolMode === "wall" ? <Minus size={10} /> : <Navigation size={10} />}
            Placing {toolMode === "wall" ? "Wall" : "Walkway"} —
            <button onClick={() => setWallOrientation((o) => o === "horizontal" ? "vertical" : "horizontal")} style={{ background: "none", border: "none", cursor: "pointer", color: toolMode === "wall" ? "#888" : "#4A90C8", fontSize: 10, fontFamily: "monospace", fontWeight: 800, padding: "0 2px" }}>
              {wallOrientation === "horizontal" ? "↔ H" : "↕ V"}
            </button>
            · click canvas
            <button onClick={() => setToolMode("select")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", padding: 0, marginLeft: 2 }}><X size={12} /></button>
          </div>
        )}

        <div style={{ flex: 1 }} />
        <button onClick={() => setShowDialog(true)} style={hBtnOrange}><Plus size={13} /> Add Zone</button>
        <button style={hBtnGhost}><Save size={13} /> Save Layout</button>
        <button onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"} style={hBtnGhost}>{isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button>

        {showShortcuts && <div style={{ position: "fixed", inset: 0, zIndex: 499 }} onClick={() => setShowShortcuts(false)} />}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowShortcuts((s) => !s)} title="Keyboard Shortcuts" style={{ ...hBtnGhost, backgroundColor: showShortcuts ? t.toolHover : "transparent", color: showShortcuts ? t.textPrimary : t.textMuted }}>
            <Keyboard size={13} />
          </button>
          {showShortcuts && <ShortcutsDropdown t={t} />}
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Toolbar
          toolMode={toolMode} setToolMode={setToolMode}
          wallOrientation={wallOrientation} onToggleOrientation={setWallOrientation}
          onAddZone={() => setShowDialog(true)}
          onClearFloor={clearFloor} onUndo={undo} canUndo={canUndo} t={t}
        />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ReactFlowProvider>
            <FactoryCanvasInner
              toolMode={toolMode} addZoneType={addZoneType}
              onAddZoneTypeUsed={() => { setToolMode("select"); setAddZoneType(null); }}
              wallOrientation={wallOrientation}
              onOpenAddZoneDialog={() => setShowDialog(true)}
              onMousePosChange={(x, y) => setMousePos({ x, y })}
              t={t}
            />
          </ReactFlowProvider>
        </div>
        <PropertiesPanel t={t} />
      </div>

      {/* ── Status bar ── */}
      <div style={{ height: 24, display: "flex", alignItems: "center", padding: "0 16px", backgroundColor: t.statusBg, borderTop: `1px solid ${t.borderFaint}`, gap: 16, flexShrink: 0 }}>
        <StatusItem label="X" value={mousePos.x.toString()} t={t} />
        <StatusItem label="Y" value={mousePos.y.toString()} t={t} />
        <div style={{ width: 1, height: 12, backgroundColor: t.border }} />
        <StatusItem label="GRID" value="1u = 20px" t={t} />
        <StatusItem label="SNAP"  value="ON"       t={t} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: t.textDim, fontFamily: "monospace" }}>
          V — select · S — zone · W — wall · K — walkway · O — H/V · C — connect · F — fullscreen · ⌘Z — undo · right-click for actions
        </span>
      </div>

      {showDialog && <AddZoneDialog onClose={() => setShowDialog(false)} onSelectType={handleSelectType} t={t} />}
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
