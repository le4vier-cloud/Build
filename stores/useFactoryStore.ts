import { create } from "zustand";
import {
  FactoryZone, FactoryZoneNode, FactoryFlowPath,
  FactoryWall,
} from "@/types/factory";

const MAX_HISTORY = 50;

interface HistorySnapshot {
  zones:  FactoryZone[];
  nodes:  FactoryZoneNode[];
  edges:  FactoryFlowPath[];
  walls:  FactoryWall[];
}

interface FactoryStore {
  zones:    FactoryZone[];
  nodes:    FactoryZoneNode[];
  edges:    FactoryFlowPath[];
  walls:    FactoryWall[];
  selectedNodeId: string | null;

  /* ── History ── */
  canUndo: boolean;
  undo:    () => void;

  /* ── Zone actions ── */
  addZone:             (zone: Omit<FactoryZone, "id">, position: { x: number; y: number }, size?: { width: number; height: number }) => string;
  updateZone:          (id: string, updates: Partial<Omit<FactoryZone, "id">>) => void;
  removeZone:          (zoneId: string) => void;
  updateNodePosition:  (nodeId: string, pos: { x: number; y: number }) => void;
  /** Move any mix of zone-nodes and walls in one history step */
  batchMoveNodes:      (moves: Array<{ id: string; position: { x: number; y: number } }>) => void;
  updateNodeDimensions:(nodeId: string, dims: { width: number; height: number }) => void;
  resizeNode:          (nodeId: string, pos: { x: number; y: number }, dims: { width: number; height: number }) => void;
  setSelectedNode:     (nodeId: string | null) => void;

  /* ── Wall / Walkway actions ── */
  addWall:    (wall: Omit<FactoryWall, "id">) => void;
  updateWall: (id: string, updates: Partial<Omit<FactoryWall, "id">>) => void;
  removeWall: (id: string) => void;
  resizeWall: (id: string, pos: { x: number; y: number }, dims: { width: number; height: number }) => void;

  /* ── Flow path actions ── */
  addFlowPath:  (path: Omit<FactoryFlowPath, "id">) => void;
  removeFlowPath:(pathId: string) => void;

  clearFloor: () => void;

  /* Internal */
  _history: HistorySnapshot[];
}

export const useFactoryStore = create<FactoryStore>((set, get) => {

  /* ── Save a snapshot of current mutable data ── */
  const pushHistory = () => {
    const { zones, nodes, edges, walls } = get();
    const snap: HistorySnapshot = { zones, nodes, edges, walls };
    set((s) => ({
      _history: [...s._history.slice(-(MAX_HISTORY - 1)), snap],
      canUndo: true,
    }));
  };

  return {
    zones: [],
    nodes: [],
    edges: [],
    walls: [],
    selectedNodeId: null,
    _history: [],
    canUndo: false,

    /* ── Undo ─────────────────────────────────────── */
    undo: () => {
      set((s) => {
        if (s._history.length === 0) return s;
        const prev = s._history[s._history.length - 1];
        return {
          zones:          prev.zones,
          nodes:          prev.nodes,
          edges:          prev.edges,
          walls:          prev.walls,
          selectedNodeId: null,
          _history:       s._history.slice(0, -1),
          canUndo:        s._history.length > 1,
        };
      });
    },

    /* ── Zone mutations ───────────────────────────── */
    addZone: (zone, position, size) => {
      pushHistory();
      const zoneId = `zone-${Date.now()}`;
      const nodeId = `fn-${Date.now()}`;
      set((s) => ({
        zones: [...s.zones, { ...zone, id: zoneId }],
        nodes: [...s.nodes, {
          id: nodeId, zoneId, position,
          width:  size?.width  ?? 180,
          height: size?.height ?? 120,
        }],
        selectedNodeId: nodeId,
      }));
      return nodeId;
    },

    updateZone: (id, updates) => {
      pushHistory();
      set((s) => ({
        zones: s.zones.map((z) => z.id === id ? { ...z, ...updates } : z),
      }));
    },

    removeZone: (zoneId) => {
      pushHistory();
      set((s) => ({
        zones: s.zones.filter((z) => z.id !== zoneId),
        nodes: s.nodes.filter((n) => n.zoneId !== zoneId),
        edges: s.edges.filter((e) => {
          const removedIds = s.nodes.filter((n) => n.zoneId === zoneId).map((n) => n.id);
          return !removedIds.includes(e.sourceId) && !removedIds.includes(e.targetId);
        }),
        selectedNodeId: null,
      }));
    },

    updateNodePosition: (nodeId, pos) => {
      pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) => n.id === nodeId ? { ...n, position: pos } : n),
      }));
    },

    /* One history entry for the entire multi-node drag — zones and walls
       are updated together so their relative layout is preserved on undo. */
    batchMoveNodes: (moves) => {
      pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) => {
          const m = moves.find((mv) => mv.id === n.id);
          return m ? { ...n, position: m.position } : n;
        }),
        walls: s.walls.map((w) => {
          const m = moves.find((mv) => mv.id === w.id);
          return m ? { ...w, position: m.position } : w;
        }),
      }));
    },

    updateNodeDimensions: (nodeId, dims) => {
      pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) => n.id === nodeId ? { ...n, ...dims } : n),
      }));
    },

    /* Atomic resize: updates position + dimensions in one set() call so the
       canvas doesn't flicker when pulling a left or top handle. */
    resizeNode: (nodeId, pos, dims) => {
      pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === nodeId ? { ...n, position: pos, ...dims } : n
        ),
      }));
    },

    setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

    /* ── Wall / Walkway mutations ─────────────────── */
    addWall: (wall) => {
      pushHistory();
      const id = `wall-${Date.now()}`;
      set((s) => ({
        walls: [...s.walls, { ...wall, id }],
        selectedNodeId: id,
      }));
    },

    updateWall: (id, updates) => {
      pushHistory();
      set((s) => ({
        walls: s.walls.map((w) => w.id === id ? { ...w, ...updates } : w),
      }));
    },

    removeWall: (id) => {
      pushHistory();
      set((s) => ({
        walls: s.walls.filter((w) => w.id !== id),
        selectedNodeId: null,
      }));
    },

    /* Atomic wall resize — recalculates length + thickness from new width/height
       based on orientation so the semantics stay consistent. */
    resizeWall: (id, pos, dims) => {
      pushHistory();
      set((s) => ({
        walls: s.walls.map((w) => {
          if (w.id !== id) return w;
          const isH = w.orientation === "horizontal";
          return {
            ...w,
            position:  pos,
            length:    isH ? dims.width  : dims.height,
            thickness: isH ? dims.height : dims.width,
          };
        }),
      }));
    },

    /* ── Flow path mutations ──────────────────────── */
    addFlowPath: (path) => {
      pushHistory();
      set((s) => ({
        edges: [...s.edges, { ...path, id: `fp-${Date.now()}` }],
      }));
    },

    removeFlowPath: (pathId) => {
      pushHistory();
      set((s) => ({
        edges: s.edges.filter((e) => e.id !== pathId),
      }));
    },

    clearFloor: () => {
      pushHistory();
      set({ zones: [], nodes: [], edges: [], walls: [], selectedNodeId: null });
    },
  };
});
