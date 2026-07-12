import { create } from "zustand";
import {
  FactoryZone, FactoryZoneNode, FactoryFlowPath,
  FactoryWall, WorkflowAttachment,
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
  planAttachments: WorkflowAttachment[];

  /* Transient UI state — deliberately outside the node-rebuild path so
     hover changes don't trigger a full ReactFlow node reconstruction. */
  hoveredWallId: string | null;
  setHoveredWallId: (id: string | null) => void;

  /* ── History ── */
  canUndo: boolean;
  undo:    () => void;

  /* ── Zone actions ── */
  addZone:             (zone: Omit<FactoryZone, "id">, position: { x: number; y: number }, size?: { width: number; height: number }) => string;
  updateZone:          (id: string, updates: Partial<Omit<FactoryZone, "id">>) => void;
  removeZone:          (zoneId: string) => void;
  updateNodePosition:  (nodeId: string, pos: { x: number; y: number }) => void;
  batchMoveNodes:      (moves: Array<{ id: string; position: { x: number; y: number } }>) => void;
  updateNodeDimensions:(nodeId: string, dims: { width: number; height: number }) => void;
  resizeNode:          (nodeId: string, pos: { x: number; y: number }, dims: { width: number; height: number }) => void;
  setSelectedNode:     (nodeId: string | null) => void;

  /* ── Wall / Walkway actions ── */
  addWall:        (wall: Omit<FactoryWall, "id">) => void;
  updateWall:     (id: string, updates: Partial<Omit<FactoryWall, "id">>) => void;
  removeWall:     (id: string) => void;
  /* Mixed per-wall patches (e.g. a dragged wall's full translate alongside
     a single moved endpoint on a wall connected to it) applied as one
     history step, so a joint stays connected through a drag + one undo. */
  batchPatchWalls: (patches: Array<{ id: string } & Partial<Omit<FactoryWall, "id">>>) => void;

  /* ── Flow path actions ── */
  addFlowPath:   (path: Omit<FactoryFlowPath, "id">) => void;
  removeFlowPath:(pathId: string) => void;

  /* ── Plan overlay attachments ── */
  addAttachment:    (att: WorkflowAttachment) => void;
  removeAttachment: (workflowId: string, planId: string) => void;
  clearAttachments: () => void;

  clearFloor: () => void;
  loadSnapshot: (snap: HistorySnapshot & { planAttachments?: WorkflowAttachment[] }) => void;

  /* Internal */
  _history: HistorySnapshot[];
}

export const useFactoryStore = create<FactoryStore>((set, get) => {

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
    planAttachments: [],
    hoveredWallId: null,
    setHoveredWallId: (id) => set({ hoveredWallId: id }),
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
        planAttachments: s.planAttachments.filter((a) => {
          const removedIds = s.nodes.filter((n) => n.zoneId === zoneId).map((n) => n.id);
          return !removedIds.includes(a.zoneNodeId);
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

    batchMoveNodes: (moves) => {
      pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) => {
          const m = moves.find((mv) => mv.id === n.id);
          return m ? { ...n, position: m.position } : n;
        }),
      }));
    },

    updateNodeDimensions: (nodeId, dims) => {
      pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) => n.id === nodeId ? { ...n, ...dims } : n),
      }));
    },

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

    batchPatchWalls: (patches) => {
      pushHistory();
      set((s) => ({
        walls: s.walls.map((w) => {
          const p = patches.find((pt) => pt.id === w.id);
          return p ? { ...w, ...p } : w;
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

    /* ── Plan overlay attachments ─────────────────── */
    addAttachment: (att) => {
      set((s) => {
        // Replace if same workflow+plan already attached somewhere
        const without = s.planAttachments.filter(
          (a) => !(a.workflowId === att.workflowId && a.planId === att.planId)
        );
        return { planAttachments: [...without, att] };
      });
    },

    removeAttachment: (workflowId, planId) => {
      set((s) => ({
        planAttachments: s.planAttachments.filter(
          (a) => !(a.workflowId === workflowId && a.planId === planId)
        ),
      }));
    },

    clearAttachments: () => set({ planAttachments: [] }),

    clearFloor: () => {
      pushHistory();
      set({ zones: [], nodes: [], edges: [], walls: [], planAttachments: [], selectedNodeId: null });
    },

    loadSnapshot: (snap) => {
      set({
        zones: snap.zones, nodes: snap.nodes, edges: snap.edges, walls: snap.walls,
        planAttachments: snap.planAttachments ?? [],
        selectedNodeId: null, _history: [], canUndo: false,
      });
    },
  };
});
