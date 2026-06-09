import { create } from "zustand";
import {
  FactoryZone, FactoryZoneNode, FactoryFlowPath, ZoneType,
} from "@/types/factory";

const MAX_HISTORY = 50;

interface HistorySnapshot {
  zones:  FactoryZone[];
  nodes:  FactoryZoneNode[];
  edges:  FactoryFlowPath[];
}

interface FactoryStore {
  zones:    FactoryZone[];
  nodes:    FactoryZoneNode[];
  edges:    FactoryFlowPath[];
  selectedNodeId: string | null;

  /* ── History ── */
  canUndo: boolean;
  undo:    () => void;

  /* ── Actions ── */
  addZone:             (zone: Omit<FactoryZone, "id">, position: { x: number; y: number }) => string;
  updateZone:          (id: string, updates: Partial<Omit<FactoryZone, "id">>) => void;
  removeZone:          (zoneId: string) => void;
  updateNodePosition:  (nodeId: string, pos: { x: number; y: number }) => void;
  updateNodeDimensions:(nodeId: string, dims: { width: number; height: number }) => void;
  setSelectedNode:     (nodeId: string | null) => void;
  addFlowPath:         (path: Omit<FactoryFlowPath, "id">) => void;
  removeFlowPath:      (pathId: string) => void;
  clearFloor:          () => void;

  /* Internal */
  _history: HistorySnapshot[];
}

export const useFactoryStore = create<FactoryStore>((set, get) => {

  /* ── Save a snapshot of current mutable data ── */
  const pushHistory = () => {
    const { zones, nodes, edges } = get();
    const snap: HistorySnapshot = { zones, nodes, edges };
    set((s) => ({
      _history: [...s._history.slice(-(MAX_HISTORY - 1)), snap],
      canUndo: true,
    }));
  };

  return {
    zones: [],
    nodes: [],
    edges: [],
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
          selectedNodeId: null,
          _history:       s._history.slice(0, -1),
          canUndo:        s._history.length > 1,
        };
      });
    },

    /* ── Mutations (each pushes history first) ───── */
    addZone: (zone, position) => {
      pushHistory();
      const zoneId = `zone-${Date.now()}`;
      const nodeId = `fn-${Date.now()}`;
      set((s) => ({
        zones: [...s.zones, { ...zone, id: zoneId }],
        nodes: [...s.nodes, { id: nodeId, zoneId, position, width: 180, height: 120 }],
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

    updateNodeDimensions: (nodeId, dims) => {
      pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) => n.id === nodeId ? { ...n, ...dims } : n),
      }));
    },

    setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

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
      set({ zones: [], nodes: [], edges: [], selectedNodeId: null });
    },
  };
});
