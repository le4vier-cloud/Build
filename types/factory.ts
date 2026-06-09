/* ── Factory Floor types ────────────────────────────── */

export type ZoneType =
  | "machining"
  | "assembly"
  | "quality"
  | "storage"
  | "logistics"
  | "office"
  | "raw_materials"
  | "dispatch";

export const ZONE_COLORS: Record<ZoneType, { bg: string; border: string; text: string }> = {
  machining:     { bg: "#1C1408", border: "#D97706", text: "#F59E0B" },
  assembly:      { bg: "#080F1E", border: "#3B82F6", text: "#60A5FA" },
  quality:       { bg: "#061410", border: "#10B981", text: "#34D399" },
  storage:       { bg: "#110B1E", border: "#8B5CF6", text: "#A78BFA" },
  logistics:     { bg: "#060F18", border: "#06B6D4", text: "#22D3EE" },
  office:        { bg: "#101014", border: "#6B7280", text: "#9CA3AF" },
  raw_materials: { bg: "#1A1008", border: "#F59E0B", text: "#FCD34D" },
  dispatch:      { bg: "#061410", border: "#34D399", text: "#6EE7B7" },
};

export const ZONE_LABELS: Record<ZoneType, string> = {
  machining:     "Machining",
  assembly:      "Assembly",
  quality:       "Quality Control",
  storage:       "Storage",
  logistics:     "Logistics",
  office:        "Office",
  raw_materials: "Raw Materials",
  dispatch:      "Dispatch",
};

export interface FactoryZone {
  id: string;
  name: string;
  type: ZoneType;
  description?: string;
  capacity?: number;
}

export interface FactoryZoneNode {
  id: string;
  zoneId: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface FactoryFlowPath {
  id: string;
  sourceId: string;
  targetId: string;
  pathType: "conveyor" | "walkway" | "agv" | "manual";
  label?: string;
}
