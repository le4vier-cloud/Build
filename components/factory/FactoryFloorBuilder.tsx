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
  SelectionMode,
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
import { usePlanOverlayStore } from "@/stores/usePlanOverlayStore";
import { ResizableDivider } from "@/components/ui/resizable-divider";
import { FactoryZoneNode  } from "@/components/factory/FactoryZoneNode";
import { FactoryWallNode  } from "@/components/factory/FactoryWallNode";
import { WallHandleNode   } from "@/components/factory/WallHandleNode";
import {
  ZONE_COLORS, ZONE_LABELS, ZoneType,
  WALL_CONFIG, WallType,
  type FactoryZone, type FactoryWall, type WorkflowAttachment,
  type FactoryZoneNode as FactoryZoneNodeData, type FactoryFlowPath,
} from "@/types/factory";
import {
  MousePointer2, Square, Spline, Maximize2, Minimize2,
  Building2, X, Plus, Save, RotateCcw, Undo2, Keyboard,
  Minus, Footprints, Cog, Lock, PenLine, ArrowLeft, GitBranch,
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
export const FACTORY_DARK: Theme = {
  canvasBg: "#1A1A1A", panelBg: "#141414", headerBg: "#141414",
  statusBg: "#111111", border: "#2A2A2A", borderFaint: "#222222",
  textPrimary: "#E8E8E8", textMuted: "#888888", textDim: "#444444",
  inputBg: "#1E1E1E", inputBorder: "#333333",
  gridMinor: "#212121", gridMajor: "#282828",
  overlayBg: "rgba(0,0,0,0.65)", toolActive: "#2A2A2A", toolHover: "#242424",
  btnGhostBg: "transparent", btnGhostText: "#666666",
};
export const FACTORY_LIGHT: Theme = {
  canvasBg: "#EBEBEB", panelBg: "#F5F5F5", headerBg: "#F5F5F5",
  statusBg: "#E8E8E8", border: "#D4D4D4", borderFaint: "#DCDCDC",
  textPrimary: "#1D1D1F", textMuted: "#6E6E73", textDim: "#AEAEB2",
  inputBg: "#FFFFFF", inputBorder: "#C8C8C8",
  gridMinor: "#DCDCDC", gridMajor: "#C8C8C8",
  overlayBg: "rgba(0,0,0,0.35)", toolActive: "#E0E0E0", toolHover: "#E4E4E4",
  btnGhostBg: "transparent", btnGhostText: "#6E6E73",
};

export interface FactorySnapshot {
  zones:           FactoryZone[];
  nodes:           FactoryZoneNodeData[];
  edges:           FactoryFlowPath[];
  walls:           FactoryWall[];
  planAttachments?: WorkflowAttachment[];
}

export function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    function compute() {
      const override = document.documentElement.getAttribute("data-theme");
      if (override === "light") return false;
      if (override === "dark") return true;
      return mq.matches;
    }

    setDark(compute());

    const onMqChange = () => setDark(compute());
    mq.addEventListener("change", onMqChange);

    const observer = new MutationObserver(() => setDark(compute()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      mq.removeEventListener("change", onMqChange);
      observer.disconnect();
    };
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
  wallHandle:  WallHandleNode,
};

type ToolMode = "select" | "add" | "connect" | "wall" | "walkway";

/* ── Wall geometry helper ────────────────────────── */
function wallGeom(w: FactoryWall) {
  const dx    = w.end.x - w.start.x;
  const dy    = w.end.y - w.start.y;
  const len   = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const angle = Math.atan2(dy, dx);
  const ca    = Math.abs(Math.cos(angle));
  const sa    = Math.abs(Math.sin(angle));
  const aabbW = Math.max(w.thickness, Math.ceil(ca * len + sa * w.thickness));
  const aabbH = Math.max(w.thickness, Math.ceil(sa * len + ca * w.thickness));
  const mid   = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
  return { len, angle, aabbW, aabbH, mid };
}

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
  onOpenAddZoneDialog, onMousePosChange,
  onToolModeChange, onAddZoneTypeChange,
  onToggleFullscreen, undo, editMode,
  t,
}: {
  toolMode:            ToolMode;
  addZoneType:         ZoneType | null;
  onAddZoneTypeUsed:   () => void;
  onOpenAddZoneDialog: () => void;
  onMousePosChange:    (x: number, y: number) => void;
  onToolModeChange:    (mode: ToolMode) => void;
  onAddZoneTypeChange: (type: ZoneType | null) => void;
  onToggleFullscreen:  () => void;
  undo:                () => void;
  editMode:            boolean;
  t:                   Theme;
}) {
  const { screenToFlowPosition, fitView, zoomIn, zoomOut } = useReactFlow();
  const { zoom } = useViewport();

  const {
    zones, nodes: storeNodes, edges: storeEdges, walls, planAttachments, selectedNodeId,
    addZone, removeZone, batchMoveNodes, batchMoveWalls, setSelectedNode, addFlowPath,
    addWall, removeWall, updateWall,
  } = useFactoryStore();

  const { plans: overlayPlans } = usePlanOverlayStore();

  type ClipEntry =
    | { kind: "zone"; zone: FactoryZone; pos: { x: number; y: number }; width: number; height: number }
    | { kind: "wall"; wall: Omit<FactoryWall, "id">; pos: { x: number; y: number } };
  const clipboardRef  = useRef<ClipEntry[]>([]);
  const pasteCountRef = useRef(0);

  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const closeCtx = useCallback(() => setCtxMenu(null), []);

  /* Which wall's hover state currently shows its green endpoint handles */
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);

  /* Faint live preview of a branch segment while dragging an endpoint handle
     sideways — cleared once the drag ends (committed or not). */
  const [dragPreview, setDragPreview] = useState<FactoryWall | null>(null);

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

  /* ── Junction classification ──────────────────────
     For every wall endpoint, count how many OTHER wall endpoints share that
     exact point. 0 → free end, 1 → L-corner, 2 → T, 3+ → X (four-way cross).
     Corners/T's round; free ends round only for walkways (a capsule cap);
     X junctions are always sharp since nothing is "outside" a 4-way meet. */
  const pointKey = (p: { x: number; y: number }) => `${Math.round(p.x)}:${Math.round(p.y)}`;
  const endpointCounts = new Map<string, number>();
  walls.forEach((w) => {
    endpointCounts.set(pointKey(w.start), (endpointCounts.get(pointKey(w.start)) ?? 0) + 1);
    endpointCounts.set(pointKey(w.end),   (endpointCounts.get(pointKey(w.end))   ?? 0) + 1);
  });
  const neighborsAt = (p: { x: number; y: number }) => (endpointCounts.get(pointKey(p)) ?? 1) - 1;
  const isRoundedEnd = (neighbors: number, isWall: boolean) => {
    if (neighbors >= 3) return false;        // X — always sharp
    if (neighbors === 0) return !isWall;      // free end — walkways cap, walls stay flat
    return true;                              // L-corner or T — rounded outside
  };

  /* ── Build ReactFlow nodes ── */
  const buildRfNodes = (): Node[] => [
    ...storeNodes.map((n) => {
      const zone     = zones.find((z) => z.id === n.zoneId);
      if (!zone) return null!;
      const attached = planAttachments.filter((a) => a.zoneNodeId === n.id);
      return {
        id: n.id, type: "factoryZone", position: n.position,
        data: { zone, attachedWorkflows: attached },
        style: { width: n.width, height: n.height },
      } as Node;
    }).filter(Boolean),
    ...walls.flatMap((w): Node[] => {
      const { len, angle, aabbW, aabbH, mid } = wallGeom(w);
      const startNeighbors = neighborsAt(w.start);
      const endNeighbors   = neighborsAt(w.end);
      const isWall         = w.wallType === "wall";
      const startRounded   = isRoundedEnd(startNeighbors, isWall);
      const endRounded     = isRoundedEnd(endNeighbors, isWall);
      const showHandles    = (hoveredWallId === w.id || selectedNodeId === w.id);
      return [
        /* Wall body node — AABB bounding box, inner div is CSS-rotated */
        {
          id: w.id, type: "factoryWall",
          position: { x: mid.x - aabbW / 2, y: mid.y - aabbH / 2 },
          data: {
            wall: w, wallLength: len, angle, startRounded, endRounded,
            onHoverChange: (h: boolean) => setHoveredWallId(h ? w.id : null),
          },
          style: { width: aabbW, height: aabbH },
          selectable: true, draggable: true,
        } as Node,
        /* Start endpoint handle */
        {
          id: `wh-s-${w.id}`, type: "wallHandle",
          position: { x: w.start.x - 6, y: w.start.y - 6 },
          data: { wallId: w.id, which: "start", visible: showHandles && startNeighbors < 3 },
          selectable: false, deletable: false,
          style: { width: 12, height: 12 },
        } as Node,
        /* End endpoint handle */
        {
          id: `wh-e-${w.id}`, type: "wallHandle",
          position: { x: w.end.x - 6, y: w.end.y - 6 },
          data: { wallId: w.id, which: "end", visible: showHandles && endNeighbors < 3 },
          selectable: false, deletable: false,
          style: { width: 12, height: 12 },
        } as Node,
      ];
    }),
  ];

  /* ── Build ReactFlow edges (flow paths + overlay plan edges) ── */
  /* Zone nodes have a source + target handle on all 4 sides — pick whichever
     pair faces the other node so edges don't have to name a handle explicitly
     (a node with multiple same-type handles requires one to be named, or
     ReactFlow can't resolve which to attach to). */
  const zoneCenter = (nodeId: string) => {
    const n = storeNodes.find((x) => x.id === nodeId);
    return n ? { x: n.position.x + n.width / 2, y: n.position.y + n.height / 2 } : null;
  };
  const pickHandles = (sourceId: string, targetId: string) => {
    const s = zoneCenter(sourceId), tp = zoneCenter(targetId);
    if (!s || !tp) return { sourceHandle: "r", targetHandle: "l" };
    const dx = tp.x - s.x, dy = tp.y - s.y;
    return Math.abs(dx) >= Math.abs(dy)
      ? (dx >= 0 ? { sourceHandle: "r", targetHandle: "l" } : { sourceHandle: "l", targetHandle: "r" })
      : (dy >= 0 ? { sourceHandle: "b", targetHandle: "t" } : { sourceHandle: "t", targetHandle: "b" });
  };

  const buildRfEdges = (): Edge[] => {
    const baseEdges: Edge[] = storeEdges.map((e) => ({
      id: e.id, source: e.sourceId, target: e.targetId,
      ...pickHandles(e.sourceId, e.targetId),
      label: e.label ?? e.pathType,
      animated: e.pathType === "conveyor" || e.pathType === "agv",
      style: { stroke: "#3B82F6", strokeWidth: 2 },
      markerEnd: { type: "arrowclosed" as const, color: "#3B82F6" },
      labelStyle: { fontSize: 10, fontFamily: "monospace", fill: "#8888A8", fontWeight: 600 },
      labelBgStyle: { fill: t.panelBg, fillOpacity: 0.85 },
    }));

    /* Overlay sequence edges — workflow A → workflow B across zones */
    const overlayEdges: Edge[] = [];
    if (planAttachments.length > 0) {
      overlayPlans.forEach((plan) => {
        plan.workflows.forEach((wf, i) => {
          if (i >= plan.workflows.length - 1) return;
          const nextWf  = plan.workflows[i + 1];
          const srcAtt  = planAttachments.find((a) => a.workflowId === wf.id    && a.planId === plan.id);
          const dstAtt  = planAttachments.find((a) => a.workflowId === nextWf.id && a.planId === plan.id);
          if (!srcAtt || !dstAtt || srcAtt.zoneNodeId === dstAtt.zoneNodeId) return;
          /* Check whether a walkway/flow-path already connects these zones */
          const hasPath = storeEdges.some(
            (e) =>
              (e.sourceId === srcAtt.zoneNodeId && e.targetId === dstAtt.zoneNodeId) ||
              (e.sourceId === dstAtt.zoneNodeId && e.targetId === srcAtt.zoneNodeId),
          );
          overlayEdges.push({
            id:     `overlay-${plan.id}-${i}`,
            source: srcAtt.zoneNodeId,
            target: dstAtt.zoneNodeId,
            ...pickHandles(srcAtt.zoneNodeId, dstAtt.zoneNodeId),
            label:  `${wf.name} → ${nextWf.name}`,
            style:  {
              stroke:          wf.color,
              strokeWidth:     2,
              strokeDasharray: hasPath ? undefined : "6 3",
            },
            markerEnd:    { type: "arrowclosed" as const, color: wf.color },
            labelStyle:   { fontSize: 9, fill: wf.color, fontWeight: 700, fontFamily: "monospace" },
            labelBgStyle: { fill: t.panelBg, fillOpacity: 0.9 },
            zIndex:       100,
          });
        });
      });
    }

    return [...baseEdges, ...overlayEdges];
  };

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(buildRfNodes());
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(buildRfEdges());

  useEffect(() => { setRfNodes(buildRfNodes()); }, [storeNodes, zones, walls, planAttachments, hoveredWallId, selectedNodeId]);
  useEffect(() => { setRfEdges(buildRfEdges()); }, [storeEdges, planAttachments, overlayPlans]);
  useEffect(() => { if (storeNodes.length > 0 || walls.length > 0) fitView({ padding: 0.2 }); }, []);

  /* ── Node change handler — guard handle nodes from deletion ── */
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((ch) => {
        if (ch.type === "remove" && !ch.id.startsWith("wh-")) {
          const sn = storeNodes.find((n) => n.id === ch.id);
          if (sn) { removeZone(sn.zoneId); return; }
          const wall = walls.find((w) => w.id === ch.id);
          if (wall) removeWall(wall.id);
        }
      });
      const filtered = changes.filter(
        (ch) => !(ch.type === "remove" && ch.id.startsWith("wh-")),
      );
      onNodesChange(filtered);
    },
    [onNodesChange, storeNodes, removeZone, walls, removeWall],
  );

  /* ── Node helpers ── */
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
      wallType: wall.wallType,
      start:    { x: Math.round((wall.start.x + 20) / 20) * 20, y: Math.round((wall.start.y + 20) / 20) * 20 },
      end:      { x: Math.round((wall.end.x   + 20) / 20) * 20, y: Math.round((wall.end.y   + 20) / 20) * 20 },
      thickness: wall.thickness,
    });
  }, [storeNodes, zones, walls, addZone, addWall]);

  const deleteNodeById = useCallback((nodeId: string) => {
    if (nodeId.startsWith("wh-")) return;
    const sn = storeNodes.find((n) => n.id === nodeId);
    if (sn) { removeZone(sn.zoneId); return; }
    const wall = walls.find((w) => w.id === nodeId);
    if (wall) removeWall(wall.id);
  }, [storeNodes, walls, removeZone, removeWall]);

  /* Rotate wall 90° around its midpoint */
  const rotateWall90 = useCallback((wallId: string) => {
    const w = walls.find((x) => x.id === wallId);
    if (!w) return;
    const cx = (w.start.x + w.end.x) / 2;
    const cy = (w.start.y + w.end.y) / 2;
    const snap = (v: number) => Math.round(v / 20) * 20;
    updateWall(wallId, {
      start: { x: snap(cx - (w.start.y - cy)), y: snap(cy + (w.start.x - cx)) },
      end:   { x: snap(cx - (w.end.y   - cy)), y: snap(cy + (w.end.x   - cx)) },
    });
  }, [walls, updateWall]);

  /* ── Clipboard ── */
  const doPaste = useCallback((off: number) => {
    clipboardRef.current.forEach((entry) => {
      if (entry.kind === "zone") {
        const px = Math.round((entry.pos.x + off) / 20) * 20;
        const py = Math.round((entry.pos.y + off) / 20) * 20;
        addZone(
          { name: entry.zone.name, type: entry.zone.type, description: entry.zone.description, capacity: entry.zone.capacity },
          { x: px, y: py },
          { width: entry.width, height: entry.height },
        );
      } else {
        addWall({
          wallType:  entry.wall.wallType,
          start:     { x: Math.round((entry.wall.start.x + off) / 20) * 20, y: Math.round((entry.wall.start.y + off) / 20) * 20 },
          end:       { x: Math.round((entry.wall.end.x   + off) / 20) * 20, y: Math.round((entry.wall.end.y   + off) / 20) * 20 },
          thickness: entry.wall.thickness,
        });
      }
    });
  }, [addZone, addWall]);

  const copySelected = useCallback(() => {
    const sel = rfNodes.filter((n) => n.selected);
    if (!sel.length) return;
    clipboardRef.current = sel.flatMap((n): ClipEntry[] => {
      if (n.type === "factoryZone") {
        const sn   = storeNodes.find((s) => s.id === n.id);
        const zone = sn ? zones.find((z) => z.id === sn.zoneId) : null;
        if (!zone || !sn) return [];
        return [{ kind: "zone", zone, pos: { x: n.position.x, y: n.position.y }, width: sn.width, height: sn.height }];
      }
      if (n.type === "factoryWall") {
        const wall = walls.find((w) => w.id === n.id);
        if (!wall) return [];
        return [{ kind: "wall", wall: { wallType: wall.wallType, start: wall.start, end: wall.end, thickness: wall.thickness }, pos: wall.start }];
      }
      return [];
    });
    pasteCountRef.current = 0;
  }, [rfNodes, storeNodes, zones, walls]);

  const duplicateSelected = useCallback(() => {
    rfNodes.filter((n) => n.selected).forEach((n) => {
      if (n.type === "factoryZone") {
        const sn   = storeNodes.find((s) => s.id === n.id);
        const zone = sn ? zones.find((z) => z.id === sn.zoneId) : null;
        if (!zone || !sn) return;
        addZone(
          { name: zone.name, type: zone.type, description: zone.description, capacity: zone.capacity },
          { x: Math.round((n.position.x + 20) / 20) * 20, y: Math.round((n.position.y + 20) / 20) * 20 },
          { width: sn.width, height: sn.height },
        );
      } else if (n.type === "factoryWall") {
        const wall = walls.find((w) => w.id === n.id);
        if (!wall) return;
        addWall({
          wallType:  wall.wallType,
          start:     { x: Math.round((wall.start.x + 20) / 20) * 20, y: Math.round((wall.start.y + 20) / 20) * 20 },
          end:       { x: Math.round((wall.end.x   + 20) / 20) * 20, y: Math.round((wall.end.y   + 20) / 20) * 20 },
          thickness: wall.thickness,
        });
      }
    });
  }, [rfNodes, storeNodes, zones, walls, addZone, addWall]);

  const deleteSelected  = useCallback(() => {
    rfNodes.filter((n) => n.selected).forEach((n) => deleteNodeById(n.id));
  }, [rfNodes, deleteNodeById]);

  const rotateSelected  = useCallback(() => {
    rfNodes
      .filter((n) => n.selected && n.type === "factoryWall")
      .forEach((n) => rotateWall90(n.id));
  }, [rfNodes, rotateWall90]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) return;

      const cmd = e.metaKey || e.ctrlKey;

      if (cmd && (e.key === "=" || e.key === "+" || e.key === "NumpadAdd")) {
        e.preventDefault(); zoomIn({ duration: 200 }); return;
      }
      if (cmd && (e.key === "-" || e.key === "_" || e.key === "NumpadSubtract")) {
        e.preventDefault(); zoomOut({ duration: 200 }); return;
      }
      if (cmd && e.key === "z") { e.preventDefault(); undo(); return; }
      if (cmd && e.shiftKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault(); fitView({ padding: 0.15, duration: 300 }); return;
      }
      if (cmd && e.key === "a") {
        e.preventDefault();
        setRfNodes((ns) => ns.map((n) => ({ ...n, selected: true })));
        return;
      }
      if (cmd && e.key === "c") { e.preventDefault(); copySelected(); return; }
      if (cmd && e.key === "v") {
        e.preventDefault();
        if (!clipboardRef.current.length || !editMode) return;
        pasteCountRef.current++;
        doPaste(pasteCountRef.current * 20);
        return;
      }
      if (cmd && e.key === "d") { e.preventDefault(); if (editMode) duplicateSelected(); return; }
      if ((e.key === "Backspace" || e.key === "Delete") && editMode) { deleteSelected(); return; }
      if (cmd && (e.key === "f" || e.key === "F")) { e.preventDefault(); if (editMode) rotateSelected(); return; }

      if (!cmd) {
        if (e.key === "v" || e.key === "V" || e.key === "Escape") {
          onToolModeChange("select"); onAddZoneTypeChange(null);
        }
        if (editMode) {
          if (e.key === "s" || e.key === "S") onOpenAddZoneDialog();
          if (e.key === "c" || e.key === "C") onToolModeChange("connect");
          if (e.key === "w" || e.key === "W") onToolModeChange("wall");
          if (e.key === "k" || e.key === "K") onToolModeChange("walkway");
        }
        if (e.key === "f" || e.key === "F") onToggleFullscreen();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [
    fitView, zoomIn, zoomOut, setRfNodes, doPaste, undo,
    copySelected, duplicateSelected, deleteSelected, rotateSelected,
    onToolModeChange, onAddZoneTypeChange, onOpenAddZoneDialog,
    onToggleFullscreen, editMode,
  ]);

  const onConnect = useCallback(
    (connection: Connection) => {
      addFlowPath({ sourceId: connection.source!, targetId: connection.target!, pathType: "walkway" });
    },
    [addFlowPath],
  );

  /* ── Shared handle-drag geometry — used live (preview) and on drop (commit) ──
     Dragging along the wall's own axis repositions that endpoint; dragging
     sideways past a one-grid-unit threshold branches a new perpendicular
     wall off the original, unmoved endpoint instead. */
  type HandleDragResult =
    | { kind: "branch"; wall: Omit<FactoryWall, "id"> }
    | { kind: "reposition"; wallId: string; isStart: boolean; newPt: { x: number; y: number } }
    | null;

  const computeHandleDragResult = useCallback((n: Node): HandleDragResult => {
    const isStart = n.id.startsWith("wh-s-");
    const wallId  = n.id.slice(5);
    const w = walls.find((x) => x.id === wallId);
    if (!w) return null;
    const snap = (v: number) => Math.round(v / 20) * 20;
    const draggedPt = { x: snap(n.position.x + 6), y: snap(n.position.y + 6) };
    const origPt  = isStart ? w.start : w.end;
    const otherPt = isStart ? w.end   : w.start;
    const isHorizontal = w.start.y === w.end.y;

    const alongDelta = isHorizontal ? draggedPt.x - origPt.x : draggedPt.y - origPt.y;
    const perpDelta  = isHorizontal ? draggedPt.y - origPt.y : draggedPt.x - origPt.x;

    if (Math.abs(perpDelta) >= 20 && Math.abs(perpDelta) > Math.abs(alongDelta)) {
      const branchEnd = isHorizontal
        ? { x: origPt.x, y: draggedPt.y }
        : { x: draggedPt.x, y: origPt.y };
      return { kind: "branch", wall: { wallType: w.wallType, start: { ...origPt }, end: branchEnd, thickness: w.thickness } };
    }
    const newPt = isHorizontal
      ? { x: draggedPt.x, y: otherPt.y }
      : { x: otherPt.x, y: draggedPt.y };
    return { kind: "reposition", wallId, isStart, newPt };
  }, [walls]);

  /* ── Live drag — faint preview of a would-be branch segment ── */
  const onNodeDrag = useCallback(
    (_e: unknown, node: Node) => {
      if (!(node.id.startsWith("wh-s-") || node.id.startsWith("wh-e-"))) return;
      const result = computeHandleDragResult(node);
      if (result?.kind === "branch") {
        setDragPreview({ id: "__wall-preview__", ...result.wall });
      } else {
        setDragPreview((prev) => (prev ? null : prev));
      }
    },
    [computeHandleDragResult],
  );

  /* ── Drag stop — handles handle nodes, wall bodies, zone nodes separately ── */
  const onNodeDragStop = useCallback(
    (_e: unknown, _node: Node, draggedNodes: Node[]) => {
      const zoneMoves:      Array<{ id: string; position: { x: number; y: number } }> = [];
      const wallBodyDeltas: Array<{ id: string; dx: number; dy: number }> = [];

      draggedNodes.forEach((n) => {
        if (n.id.startsWith("wh-s-") || n.id.startsWith("wh-e-")) {
          const result = computeHandleDragResult(n);
          if (!result) return;
          if (result.kind === "branch") addWall(result.wall);
          else updateWall(result.wallId, result.isStart ? { start: result.newPt } : { end: result.newPt });
        } else {
          const w = walls.find((x) => x.id === n.id);
          if (w) {
            /* Wall body drag → translate both endpoints */
            const { aabbW, aabbH, mid } = wallGeom(w);
            const newMidX = n.position.x + aabbW / 2;
            const newMidY = n.position.y + aabbH / 2;
            const snap    = (v: number) => Math.round(v / 20) * 20;
            const dx = snap(newMidX - mid.x);
            const dy = snap(newMidY - mid.y);
            if (dx !== 0 || dy !== 0) wallBodyDeltas.push({ id: w.id, dx, dy });
          } else {
            /* Zone node */
            zoneMoves.push({
              id:       n.id,
              position: {
                x: Math.round(n.position.x / 20) * 20,
                y: Math.round(n.position.y / 20) * 20,
              },
            });
          }
        }
      });

      if (zoneMoves.length      > 0) batchMoveNodes(zoneMoves);
      if (wallBodyDeltas.length > 0) batchMoveWalls(wallBodyDeltas);
      setDragPreview(null);
    },
    [batchMoveNodes, batchMoveWalls, walls, updateWall, addWall, computeHandleDragResult],
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => { setSelectedNode(node.id); },
    [setSelectedNode],
  );

  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: Node) => {
      e.preventDefault();
      if (node.type === "wallHandle") return; // no context menu on handles
      const raw = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const alreadySelected = rfNodes.find((n) => n.id === node.id)?.selected ?? false;
      if (!alreadySelected) {
        setSelectedNode(node.id);
        setRfNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === node.id })));
      }
      setCtxMenu({
        screenX: e.clientX, screenY: e.clientY,
        kind: node.type === "factoryWall" ? "wall" : "zone",
        nodeId: node.id,
        flowX: Math.round(raw.x / 20) * 20, flowY: Math.round(raw.y / 20) * 20,
      });
    },
    [screenToFlowPosition, setSelectedNode, setRfNodes, rfNodes],
  );

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
    [screenToFlowPosition],
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (editMode && toolMode === "add" && addZoneType) {
        const raw = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const pos = { x: Math.round(raw.x / 20) * 20 - 90, y: Math.round(raw.y / 20) * 20 - 60 };
        addZone({ name: `New ${ZONE_LABELS[addZoneType]}`, type: addZoneType }, pos);
        onAddZoneTypeUsed();
      } else if (editMode && (toolMode === "wall" || toolMode === "walkway")) {
        const raw    = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const gx     = Math.round(raw.x / 20) * 20;
        const gy     = Math.round(raw.y / 20) * 20;
        const cfg    = WALL_CONFIG[toolMode as WallType];
        const halfL  = cfg.defaultLength / 2;
        addWall({
          wallType:  toolMode as WallType,
          start:     { x: gx - halfL, y: gy },
          end:       { x: gx + halfL, y: gy },
          thickness: cfg.defaultThickness,
        });
      } else {
        setSelectedNode(null);
      }
    },
    [editMode, toolMode, addZoneType, addZone, onAddZoneTypeUsed, setSelectedNode, screenToFlowPosition, addWall],
  );

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      onMousePosChange(Math.round(pos.x / 20), Math.round(pos.y / 20));
    },
    [screenToFlowPosition, onMousePosChange],
  );

  const cursorStyle =
    toolMode === "add" || toolMode === "wall" || toolMode === "walkway" ? "crosshair" :
    toolMode === "connect" ? "cell" : "default";

  /* ── Context menu rendering ── */
  const renderCtxMenu = () => {
    if (!ctxMenu) return null;
    const close    = () => closeCtx();
    const hasCb    = clipboardRef.current.length > 0;
    const selCount = rfNodes.filter((n) => n.selected).length;
    const multi    = selCount > 1;
    const selBadge = multi
      ? <span style={{ marginLeft: "auto", fontSize: 9, fontFamily: "monospace", fontWeight: 700, color: t.textDim, background: t.canvasBg, borderRadius: 4, padding: "1px 5px" }}>{selCount} selected</span>
      : null;

    if (ctxMenu.kind === "zone") {
      const sn   = storeNodes.find((n) => n.id === ctxMenu.nodeId);
      const zone = sn ? zones.find((z) => z.id === sn.zoneId) : null;
      const colors = zone ? ZONE_COLORS[zone.type] : null;
      return (
        <>
          {zone && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px 6px", borderBottom: `1px solid ${colors!.border}33`, backgroundColor: colors!.bg }}>
              <span style={{ color: colors!.text, display: "flex" }}>{ZONE_ICON[zone.type]}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors!.text }}>{zone.name}</span>
              {selBadge}
            </div>
          )}
          <div style={{ padding: "4px 0" }}>
            <CtxItem label={multi ? `Copy ${selCount}` : "Copy"}      shortcut="⌘C" t={t} onClick={() => { copySelected(); close(); }} />
            <CtxItem label="Paste"                                     shortcut="⌘V" disabled={!hasCb || !editMode} t={t} onClick={() => { if (!hasCb || !editMode) return; pasteCountRef.current++; doPaste(pasteCountRef.current * 20); close(); }} />
            <CtxItem label={multi ? `Duplicate ${selCount}` : "Duplicate"} shortcut="⌘D" disabled={!editMode} t={t} onClick={() => { if (!editMode) return; duplicateSelected(); close(); }} />
            <CtxSep t={t} />
            <CtxItem label={multi ? `Delete ${selCount}` : "Delete"} shortcut="⌫" destructive disabled={!editMode} t={t} onClick={() => { if (!editMode) return; deleteSelected(); close(); }} />
          </div>
        </>
      );
    }

    if (ctxMenu.kind === "wall") {
      const wall    = walls.find((w) => w.id === ctxMenu.nodeId);
      const isWall  = wall?.wallType === "wall";
      const acc     = isWall ? "#686868" : "#3A78B0";
      return (
        <>
          {wall && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px 6px", borderBottom: `1px solid ${acc}33`, backgroundColor: isWall ? "rgba(104,104,104,0.08)" : "rgba(58,120,176,0.08)" }}>
              {isWall ? <Minus size={12} color={acc} /> : <Footprints size={12} color={acc} />}
              <span style={{ fontSize: 11, fontWeight: 700, color: acc }}>{WALL_CONFIG[wall.wallType].label}</span>
              {selBadge}
            </div>
          )}
          <div style={{ padding: "4px 0" }}>
            <CtxItem label={multi ? `Copy ${selCount}` : "Copy"}      shortcut="⌘C" t={t} onClick={() => { copySelected(); close(); }} />
            <CtxItem label="Paste"                                     shortcut="⌘V" disabled={!hasCb || !editMode} t={t} onClick={() => { if (!hasCb || !editMode) return; pasteCountRef.current++; doPaste(pasteCountRef.current * 20); close(); }} />
            <CtxSep t={t} />
            <CtxItem label="Rotate 90°"                                shortcut="⌘F" disabled={!editMode} t={t} onClick={() => { if (!editMode) return; rotateSelected(); close(); }} />
            <CtxItem label={multi ? `Duplicate ${selCount}` : "Duplicate"} shortcut="⌘D" disabled={!editMode} t={t} onClick={() => { if (!editMode) return; duplicateSelected(); close(); }} />
            <CtxSep t={t} />
            <CtxItem label={multi ? `Delete ${selCount}` : "Delete"} shortcut="⌫" destructive disabled={!editMode} t={t} onClick={() => { if (!editMode) return; deleteSelected(); close(); }} />
          </div>
        </>
      );
    }

    return (
      <div style={{ padding: "4px 0" }}>
        <CtxItem label="Paste" shortcut="⌘V" disabled={!hasCb || !editMode} t={t} onClick={() => {
          if (!hasCb || !editMode) return; pasteCountRef.current++; doPaste(pasteCountRef.current * 20); close();
        }} />
        <CtxItem label="Select All" shortcut="⌘A" t={t} onClick={() => {
          setRfNodes((ns) => ns.map((n) => ({ ...n, selected: true }))); close();
        }} />
        {editMode && (
          <>
            <CtxSep t={t} />
            <CtxLabel t={t}>Place Zone</CtxLabel>
            {ZONE_TYPE_LIST.map((type) => (
              <CtxZoneItem key={type} type={type} t={t} onClick={() => {
                addZone({ name: `New ${ZONE_LABELS[type]}`, type }, { x: ctxMenu.flowX - 90, y: ctxMenu.flowY - 60 });
                close();
              }} />
            ))}
            <CtxSep t={t} />
            <CtxItem label="Add Wall here" shortcut="W" t={t} onClick={() => {
              const cfg = WALL_CONFIG["wall"];
              addWall({ wallType: "wall", start: { x: ctxMenu.flowX - cfg.defaultLength / 2, y: ctxMenu.flowY }, end: { x: ctxMenu.flowX + cfg.defaultLength / 2, y: ctxMenu.flowY }, thickness: cfg.defaultThickness });
              close();
            }} />
            <CtxItem label="Add Walkway here" shortcut="K" t={t} onClick={() => {
              const cfg = WALL_CONFIG["walkway"];
              addWall({ wallType: "walkway", start: { x: ctxMenu.flowX - cfg.defaultLength / 2, y: ctxMenu.flowY }, end: { x: ctxMenu.flowX + cfg.defaultLength / 2, y: ctxMenu.flowY }, thickness: cfg.defaultThickness });
              close();
            }} />
          </>
        )}
        <CtxSep t={t} />
        <CtxItem label="Fit to Screen" shortcut="⌘⇧H" t={t} onClick={() => { fitView({ padding: 0.15, duration: 300 }); close(); }} />
        {editMode && (
          <>
            <CtxSep t={t} />
            <CtxItem label="Clear Floor" destructive t={t} onClick={() => { useFactoryStore.getState().clearFloor(); close(); }} />
          </>
        )}
      </div>
    );
  };

  const ctxStyle = (): React.CSSProperties => {
    if (!ctxMenu) return {};
    const W    = 220;
    const left = ctxMenu.screenX + W > window.innerWidth ? ctxMenu.screenX - W : ctxMenu.screenX;
    const top  = Math.min(ctxMenu.screenY, window.innerHeight - 60);
    return { position: "fixed", left, top, width: W, zIndex: 1000, maxHeight: "80vh", overflowY: "auto" };
  };

  /* Faint ghost of the branch a sideways handle-drag would create — merged
     in at render time only, never persisted into rfNodes/the store. */
  const displayNodes = dragPreview
    ? [...rfNodes, (() => {
        const { len, angle, aabbW, aabbH, mid } = wallGeom(dragPreview);
        return {
          id: "wall-preview", type: "factoryWall",
          position: { x: mid.x - aabbW / 2, y: mid.y - aabbH / 2 },
          data: { wall: dragPreview, wallLength: len, angle, startRounded: true, endRounded: true, isPreview: true },
          style: { width: aabbW, height: aabbH },
          selectable: false, draggable: false,
        } as Node;
      })()]
    : rfNodes;

  return (
    <div style={{ width: "100%", height: "100%", cursor: cursorStyle }} onMouseMove={onMouseMove}>
      <ReactFlow
        nodes={displayNodes} edges={rfEdges} nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} onNodeDrag={onNodeDrag} onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick} onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu} onPaneContextMenu={onPaneContextMenu}
        snapGrid={[20, 20]} snapToGrid fitView
        nodesDraggable={editMode} nodesConnectable={editMode}
        deleteKeyCode={[]}
        selectionMode={SelectionMode.Partial}
        autoPanOnNodeDrag autoPanOnConnect autoPanSpeed={20}
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
            if (node.type === "wallHandle")  return "#22C55E";
            if (node.type === "factoryWall") return (node.data as { wall: FactoryWall }).wall.wallType === "walkway" ? "#3A78B0" : "#484848";
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

      {ctxMenu && (
        <div
          id="fctx"
          style={{ ...ctxStyle(), backgroundColor: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 10, boxShadow: "0 16px 48px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)", overflow: "hidden" }}
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
      <div style={{ width: "min(440px, calc(100vw - 32px))", backgroundColor: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.3)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
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
   Scrub Input
══════════════════════════════════════════════════ */
function ScrubInput({
  value, min, max, step = 1, onChange, unit = "", accent, t,
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; unit?: string; accent: string; t: Theme;
}) {
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState("");
  const [dragging, setDragging] = useState(false);
  const dragRef  = useRef<{ startX: number; startV: number } | null>(null);
  const didDrag  = useRef(false);

  const snap = (v: number) => Math.max(min, Math.min(max, Math.round(v / step) * step));

  function startScrub(e: React.MouseEvent) {
    if (editing) return;
    e.preventDefault();
    didDrag.current = false;
    setDragging(true);
    dragRef.current = { startX: e.clientX, startV: value };
    function onMove(me: MouseEvent) {
      if (!dragRef.current) return;
      const delta = me.clientX - dragRef.current.startX;
      if (Math.abs(delta) > 2) didDrag.current = true;
      onChange(snap(dragRef.current.startV + delta));
    }
    function onUp() {
      setDragging(false);
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }

  function handleClick() {
    if (didDrag.current) { didDrag.current = false; return; }
    setDraft(String(value));
    setEditing(true);
  }

  function commit() {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) onChange(snap(parsed));
    setEditing(false);
  }

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const activeBorder = editing || dragging;
  return (
    <div style={{ position: "relative", height: 32, borderRadius: 6, overflow: "hidden", border: `1px solid ${activeBorder ? accent : t.inputBorder}`, backgroundColor: t.inputBg, transition: "border-color 0.12s" }}>
      {!editing && (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: accent + "22", pointerEvents: "none", transition: dragging ? "none" : "width 0.08s" }} />
      )}
      {editing ? (
        <input autoFocus type="number" value={draft} min={min} max={max} step={step}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", backgroundColor: t.inputBg, border: "none", outline: "none", padding: "0 10px", fontSize: 12, color: t.textPrimary, fontFamily: "monospace", fontWeight: 600, textAlign: "center" }}
        />
      ) : (
        <div onMouseDown={startScrub} onClick={handleClick}
          style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", cursor: "ew-resize", userSelect: "none" }}
        >
          <span style={{ fontSize: 9, color: t.textDim, fontFamily: "monospace", letterSpacing: "-1px" }}>◂◂</span>
          <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: t.textPrimary }}>{value}{unit}</span>
          <span style={{ fontSize: 9, color: t.textDim, fontFamily: "monospace", letterSpacing: "-1px" }}>▸▸</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Properties Panel
══════════════════════════════════════════════════ */
function PropertiesPanel({ t, width }: { t: Theme; width: number }) {
  const { zones, nodes, walls, selectedNodeId, updateZone, removeZone, setSelectedNode, updateWall, removeWall } = useFactoryStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedZone = selectedNode ? zones.find((z) => z.id === selectedNode.zoneId) : null;
  const selectedWall = walls.find((w) => w.id === selectedNodeId);

  const panelStyle: React.CSSProperties = {
    width, minWidth: width, height: "100%",
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

  if (selectedWall) {
    const cfg    = WALL_CONFIG[selectedWall.wallType];
    const isWall = selectedWall.wallType === "wall";
    const acc    = isWall ? "#686868" : "#3A78B0";
    const accBg  = isWall ? "rgba(104,104,104,0.08)" : "rgba(58,120,176,0.08)";
    const dx     = selectedWall.end.x - selectedWall.start.x;
    const dy     = selectedWall.end.y - selectedWall.start.y;
    const wallLen   = Math.sqrt(dx * dx + dy * dy);
    const angleDeg  = Math.round(Math.atan2(dy, dx) * (180 / Math.PI));
    return (
      <div style={panelStyle}>
        <div style={{ ...hdr, borderBottom: `1px solid ${acc}44`, backgroundColor: accBg }}>
          {isWall ? <Minus size={13} color={acc} /> : <Footprints size={13} color={acc} />}
          <span style={{ fontSize: 12, fontWeight: 700, color: acc, textTransform: "uppercase", letterSpacing: "0.08em" }}>{cfg.label}</span>
          <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, marginLeft: "auto" }}>
            <X size={13} color={acc + "88"} />
          </button>
        </div>
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <div>
            <label style={lbl}>Thickness <span style={{ fontSize: 9, color: t.textDim, fontWeight: 400, marginLeft: 5 }}>{cfg.minThickness} – {cfg.maxThickness}</span></label>
            <ScrubInput value={selectedWall.thickness} min={cfg.minThickness} max={cfg.maxThickness} step={2} onChange={(v) => updateWall(selectedWall.id, { thickness: v })} unit="u" accent={acc} t={t} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Stat label="Length" value={`${Math.round(wallLen)}px`}  t={t} />
            <Stat label="Angle"  value={`${angleDeg}°`}              t={t} />
            <Stat label="T"      value={`${selectedWall.thickness}u`} t={t} />
          </div>
          <p style={{ fontSize: 10, color: t.textDim, lineHeight: 1.6 }}>
            Drag a green handle along the wall to reposition it, or sideways to branch off a new segment — build T-shapes and cross-shapes.<br />
            Scrub or click thickness above.
          </p>
          <button onClick={() => removeWall(selectedWall.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", height: 34, backgroundColor: "transparent", border: "1px solid #FF3B3030", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#FF3B30", marginTop: 4 }}>
            Remove {cfg.label}
          </button>
        </div>
      </div>
    );
  }

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
              const c      = ZONE_COLORS[type];
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
          <Stat label="W" value={`${Math.round(selectedNode.width  / 20)}u`} t={t} />
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
      <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Plans Overlay Panel
══════════════════════════════════════════════════ */
function PlansOverlayPanel({ t, onClose, width }: { t: Theme; onClose: () => void; width: number }) {
  const { plans } = usePlanOverlayStore();
  const { planAttachments, removeAttachment } = useFactoryStore();

  return (
    <div style={{
      width, minWidth: width, height: "100%",
      backgroundColor: t.panelBg, borderLeft: `1px solid ${t.border}`,
      display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <GitBranch size={13} color="#22C55E" />
        <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>Plans Overlay</span>
        <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
          <X size={13} color={t.textMuted} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        <p style={{ fontSize: 10, color: t.textDim, marginBottom: 12, lineHeight: 1.5 }}>
          Drag workflows onto zones to attach. Sequence edges appear automatically when both ends are attached.
        </p>
        {plans.map((plan) => (
          <div key={plan.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${t.borderFaint}` }}>
              {plan.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {plan.workflows.map((wf) => {
                const isAttached = planAttachments.some(
                  (a) => a.workflowId === wf.id && a.planId === plan.id,
                );
                return (
                  <div
                    key={wf.id}
                    draggable={!isAttached}
                    onDragStart={isAttached ? undefined : (e) => {
                      e.dataTransfer.setData("application/overlay-wf", JSON.stringify({
                        planId:       plan.id,
                        workflowId:   wf.id,
                        workflowName: wf.name,
                        durationH:    wf.durationH,
                        color:        wf.color,
                      }));
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    style={{
                      display:         "flex",
                      alignItems:      "center",
                      gap:             7,
                      padding:         "6px 8px",
                      borderRadius:    6,
                      backgroundColor: wf.color + "15",
                      border:          `1px solid ${wf.color}${isAttached ? "44" : "66"}`,
                      cursor:          isAttached ? "default" : "grab",
                      opacity:         isAttached ? 0.55 : 1,
                      transition:      "opacity 0.15s",
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: wf.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: t.textPrimary, flex: 1 }}>{wf.name}</span>
                    <span style={{ fontSize: 10, color: t.textDim, fontFamily: "monospace" }}>{wf.durationH}h</span>
                    {isAttached && (
                      <button
                        onClick={() => removeAttachment(wf.id, plan.id)}
                        title="Remove attachment"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", opacity: 0.7 }}
                      >
                        <X size={10} color={t.textDim} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Toolbar
══════════════════════════════════════════════════ */
function Toolbar({
  toolMode, setToolMode,
  onAddZone, onClearFloor, onUndo, canUndo, editMode, t,
}: {
  toolMode: ToolMode; setToolMode: (m: ToolMode) => void;
  onAddZone: () => void; onClearFloor: () => void;
  onUndo: () => void; canUndo: boolean; editMode: boolean; t: Theme;
}) {
  return (
    <div style={{ width: 52, minWidth: 52, height: "100%", backgroundColor: t.panelBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10, gap: 4, flexShrink: 0 }}>
      <ToolBtn active={toolMode === "select"}  onClick={() => setToolMode("select")}               title="Select (V)"   t={t}><MousePointer2 size={17} strokeWidth={1.8} /></ToolBtn>
      <ToolBtn active={toolMode === "connect"} onClick={() => editMode && setToolMode("connect")}  title="Connect (C)"  disabled={!editMode} t={t}><Spline size={17} strokeWidth={1.8} /></ToolBtn>
      <div style={{ width: 28, height: 1, backgroundColor: t.border, margin: "4px 0" }} />
      <ToolBtn onClick={() => editMode && onAddZone()} title="Add Zone (S)" active={toolMode === "add"} disabled={!editMode} t={t}><Square size={17} strokeWidth={1.8} /></ToolBtn>
      <div style={{ width: 28, height: 1, backgroundColor: t.border, margin: "4px 0" }} />
      <ToolBtn active={toolMode === "wall"}    onClick={() => editMode && setToolMode("wall")}    title="Wall (W)"     disabled={!editMode} t={t}><Minus size={17} strokeWidth={2.5} /></ToolBtn>
      <ToolBtn active={toolMode === "walkway"} onClick={() => editMode && setToolMode("walkway")} title="Walkway (K)"  disabled={!editMode} t={t}><Footprints size={15} strokeWidth={1.8} /></ToolBtn>
      <div style={{ width: 28, height: 1, backgroundColor: t.border, margin: "4px 0" }} />
      <ToolBtn onClick={onUndo} title="Undo (⌘Z)" disabled={!canUndo} t={t}><Undo2 size={15} strokeWidth={1.8} /></ToolBtn>
      <div style={{ width: 28, height: 1, backgroundColor: t.border, margin: "4px 0", marginTop: "auto" }} />
      <ToolBtn onClick={editMode ? onClearFloor : undefined} title="Clear Floor" disabled={!editMode} style={{ marginBottom: 8 }} t={t}><RotateCcw size={15} strokeWidth={1.8} /></ToolBtn>
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
      { desc: "Select",       keys: ["V"] },   { desc: "Add Zone",    keys: ["S"] },
      { desc: "Connect",      keys: ["C"] },   { desc: "Wall",        keys: ["W"] },
      { desc: "Walkway",      keys: ["K"] },   { desc: "Cancel",      keys: ["Esc"] },
    ]},
    { title: "Edit", rows: [
      { desc: "Undo",         keys: ["⌘", "Z"] }, { desc: "Copy",      keys: ["⌘", "C"] },
      { desc: "Paste",        keys: ["⌘", "V"] }, { desc: "Duplicate", keys: ["⌘", "D"] },
      { desc: "Select All",   keys: ["⌘", "A"] }, { desc: "Delete",    keys: ["⌫"] },
      { desc: "Rotate 90°",   keys: ["⌘", "F"] },
    ]},
    { title: "View", rows: [
      { desc: "Fullscreen",   keys: ["F"] },
      { desc: "Zoom In",      keys: ["⌘", "+"] }, { desc: "Zoom Out",  keys: ["⌘", "−"] },
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
   Main exported component
══════════════════════════════════════════════════ */
export function FactoryFloorBuilder({
  embedded = false,
  onSave,
  layoutName,
  onBack,
}: {
  embedded?: boolean;
  onSave?: (snap: FactorySnapshot) => void;
  layoutName?: string;
  onBack?: () => void;
}) {
  const isDark = useDarkMode();
  const t = isDark ? FACTORY_DARK : FACTORY_LIGHT;

  const [toolMode,      setToolMode]      = useState<ToolMode>("select");
  const [addZoneType,   setAddZoneType]   = useState<ZoneType | null>(null);
  const [showDialog,    setShowDialog]    = useState(false);
  const [mousePos,      setMousePos]      = useState({ x: 0, y: 0 });
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [editMode,      setEditMode]      = useState(true);
  const [showPlans,     setShowPlans]     = useState(false);
  const [panelWidth,    setPanelWidth]    = useState(240);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editMode) { setToolMode("select"); setAddZoneType(null); }
  }, [editMode]);

  const { zones, nodes, walls, clearFloor, undo, canUndo } = useFactoryStore();

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) containerRef.current?.requestFullscreen()?.catch(() => {});
      else document.exitFullscreen()?.catch(() => {});
    } catch { /* Fullscreen API unavailable/blocked in this context */ }
  };

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
    borderWidth: 1, borderStyle: "solid", borderColor: t.border,
    borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer",
  };

  const isWallMode = toolMode === "wall" || toolMode === "walkway";

  const outerStyle: React.CSSProperties = embedded
    ? { width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: t.canvasBg, overflow: "hidden", userSelect: "none" }
    : { margin: isFullscreen ? 0 : "-24px", height: isFullscreen ? "100vh" : "calc(100vh - 52px)", display: "flex", flexDirection: "column", backgroundColor: t.canvasBg, overflow: "hidden", userSelect: "none" };

  return (
    <div ref={containerRef} style={outerStyle}>

      {/* ── Header ── */}
      <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 16px", backgroundColor: t.headerBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0, gap: 10 }}>
        {onBack && (
          <>
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: 13, padding: "0 4px", flexShrink: 0 }}>
              <ArrowLeft size={14} /> Layouts
            </button>
            <span style={{ color: t.border }}>›</span>
          </>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={16} color="#F56300" />
          <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, letterSpacing: "-0.01em" }}>
            {layoutName ?? "Factory Floor Builder"}
          </span>
        </div>
        <div style={{ width: 1, height: 20, backgroundColor: t.border }} />
        <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "monospace" }}>
          {zones.length} zones · {nodes.length} placed · {walls.length} segments
        </span>

        {toolMode === "add" && addZoneType && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", backgroundColor: "#F5630015", border: "1px solid #F5630066", borderRadius: 999, fontSize: 11, color: "#F56300", fontWeight: 600 }}>
            <Square size={10} />
            Placing {ZONE_LABELS[addZoneType]} — click canvas
            <button onClick={() => { setToolMode("select"); setAddZoneType(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#F56300", display: "flex", padding: 0, marginLeft: 2 }}><X size={12} /></button>
          </div>
        )}

        {isWallMode && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", backgroundColor: toolMode === "wall" ? "rgba(104,104,104,0.1)" : "rgba(58,120,176,0.1)", border: `1px solid ${toolMode === "wall" ? "rgba(104,104,104,0.4)" : "rgba(58,120,176,0.4)"}`, borderRadius: 999, fontSize: 11, color: toolMode === "wall" ? "#888" : "#4A90C8", fontWeight: 600 }}>
            {toolMode === "wall" ? <Minus size={10} /> : <Footprints size={10} />}
            Placing {toolMode === "wall" ? "Wall" : "Walkway"} — click canvas
            <button onClick={() => setToolMode("select")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", padding: 0, marginLeft: 2 }}><X size={12} /></button>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {editMode && <button onClick={() => setShowDialog(true)} style={hBtnOrange}><Plus size={13} /> Add Zone</button>}

        {/* Plans overlay toggle */}
        <button
          onClick={() => setShowPlans((s) => !s)}
          title="Plans Overlay"
          style={{ ...hBtnGhost, backgroundColor: showPlans ? "rgba(34,197,94,0.12)" : t.btnGhostBg, borderColor: showPlans ? "#22C55E66" : t.border, color: showPlans ? "#22C55E" : t.textMuted }}
        >
          <GitBranch size={13} /> Plans
        </button>

        {/* Edit / View lock */}
        <button
          onClick={() => setEditMode(m => !m)}
          title={editMode ? "Lock (view mode)" : "Unlock (edit mode)"}
          style={{ ...hBtnGhost, backgroundColor: editMode ? "rgba(245,99,0,0.12)" : t.btnGhostBg, borderColor: editMode ? "#F5630066" : t.border, color: editMode ? "#F56300" : t.textMuted }}
        >
          {editMode ? <PenLine size={13} /> : <Lock size={13} />}
          {editMode ? "Editing" : "View"}
        </button>

        {onSave && (
          <button
            onClick={() => {
              const s = useFactoryStore.getState();
              onSave({ zones: s.zones, nodes: s.nodes, edges: s.edges, walls: s.walls, planAttachments: s.planAttachments });
            }}
            style={hBtnGhost}
          >
            <Save size={13} /> Save Layout
          </button>
        )}

        <button onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"} style={hBtnGhost}>
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>

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
          onAddZone={() => setShowDialog(true)}
          onClearFloor={clearFloor} onUndo={undo} canUndo={canUndo} editMode={editMode} t={t}
        />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ReactFlowProvider>
            <FactoryCanvasInner
              toolMode={toolMode} addZoneType={addZoneType}
              onAddZoneTypeUsed={() => { setToolMode("select"); setAddZoneType(null); }}
              onOpenAddZoneDialog={() => setShowDialog(true)}
              onMousePosChange={(x, y) => setMousePos({ x, y })}
              onToolModeChange={setToolMode}
              onAddZoneTypeChange={setAddZoneType}
              onToggleFullscreen={toggleFullscreen}
              undo={undo}
              editMode={editMode}
              t={t}
            />
          </ReactFlowProvider>
        </div>
        <ResizableDivider onDrag={dx => setPanelWidth(w => Math.max(180, Math.min(420, w - dx)))} />
        {showPlans
          ? <PlansOverlayPanel t={t} onClose={() => setShowPlans(false)} width={panelWidth} />
          : <PropertiesPanel t={t} width={panelWidth} />
        }
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
          V — select · S — zone · W — wall · K — walkway · C — connect · F — fullscreen · ⌘Z — undo · right-click for actions
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
