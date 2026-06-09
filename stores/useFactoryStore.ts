import { create } from "zustand";
import {
  FactoryZone, FactoryZoneNode, FactoryFlowPath, ZoneType,
} from "@/types/factory";

interface FactoryStore {
  zones:    FactoryZone[];
  nodes:    FactoryZoneNode[];
  edges:    FactoryFlowPath[];
  selectedNodeId: string | null;

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
}

export const useFactoryStore = create<FactoryStore>((set) => ({
  zones: [],
  nodes: [],
  edges: [],
  selectedNodeId: null,

  addZone: (zone, position) => {
    const zoneId  = `zone-${Date.now()}`;
    const nodeId  = `fn-${Date.now()}`;
    set((state) => ({
      zones: [...state.zones, { ...zone, id: zoneId }],
      nodes: [...state.nodes, {
        id: nodeId, zoneId,
        position, width: 180, height: 120,
      }],
      selectedNodeId: nodeId,
    }));
    return nodeId;
  },

  updateZone: (id, updates) =>
    set((state) => ({
      zones: state.zones.map((z) => z.id === id ? { ...z, ...updates } : z),
    })),

  removeZone: (zoneId) =>
    set((state) => ({
      zones: state.zones.filter((z) => z.id !== zoneId),
      nodes: state.nodes.filter((n) => n.zoneId !== zoneId),
      edges: state.edges.filter((e) => {
        const nodeIds = state.nodes.filter((n) => n.zoneId === zoneId).map((n) => n.id);
        return !nodeIds.includes(e.sourceId) && !nodeIds.includes(e.targetId);
      }),
      selectedNodeId: null,
    })),

  updateNodePosition: (nodeId, pos) =>
    set((state) => ({
      nodes: state.nodes.map((n) => n.id === nodeId ? { ...n, position: pos } : n),
    })),

  updateNodeDimensions: (nodeId, dims) =>
    set((state) => ({
      nodes: state.nodes.map((n) => n.id === nodeId ? { ...n, ...dims } : n),
    })),

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  addFlowPath: (path) =>
    set((state) => ({
      edges: [...state.edges, { ...path, id: `fp-${Date.now()}` }],
    })),

  removeFlowPath: (pathId) =>
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== pathId),
    })),

  clearFloor: () => set({ zones: [], nodes: [], edges: [], selectedNodeId: null }),
}));
