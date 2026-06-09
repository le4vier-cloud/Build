/* ── Core entities ─────────────────────────────────── */

export interface Task {
  id: string;
  name: string;
  duration: number; // minutes
  optionSet: "machine" | "human";
  workflowId?: string;
}

export interface Workflow {
  id: string;
  name: string;
  taskIds: string[];
}

export interface Station {
  id: string;
  name: string;
  childWorkflows: string[];
  wagePerHour: number;
  tools: string[];
}

export interface ProductOption {
  id: string;
  name: string;
  taskIds: string[];
}

export interface Product {
  id: string;
  name: string;
  baseTasks: string[];
  options: ProductOption[];
}

/* ── Resource catalogue (pulled from other modules) ── */

export interface StaffResource {
  id: string;
  name: string;
  wagePerHour: number;     // R/hr
}

export interface PartResource {
  id: string;
  name: string;
  unitCost: number;        // R per unit
  type: "OS" | "IM";      // Outsourced | Internally Manufactured
}

export interface ToolResource {
  id: string;
  name: string;
  costPerHour: number;     // R/hr depreciation / usage cost
}

/* ── Per-node resource assignments ───────────────── */

export interface NodeStaff {
  staffId: string;
  name: string;
  wagePerHour: number;
}

export interface NodeMaterial {
  partId: string;
  name: string;
  qty: number;
  unitCost: number;
}

export interface NodeTool {
  toolId: string;
  name: string;
  costPerHour: number;
}

/* ── Station node (extended) ─────────────────────── */

export interface StationNode {
  id: string;
  stationId: string;
  orderIndex: number;
  parallelGroupId: string;
  assignedTasks: string[];
  assignedWorkflows: string[];
  assignedStaff: NodeStaff[];
  assignedMaterials: NodeMaterial[];
  assignedTools: NodeTool[];
  position: { x: number; y: number };
}

/* ── Overhead cost lines ─────────────────────────── */

export interface VasteKosItem {
  id: string;
  label: string;          // e.g. "Rent", "Insurance"
  monthlyCost: number;    // R/month
  unitsPerMonth: number;  // units produced / month → allocated per unit
}

export interface BedryfskosItem {
  id: string;
  label: string;          // e.g. "Electricity", "Gas"
  costPerHour: number;    // R/hr consumed across all stations
}

/* ── Process / stage summaries ───────────────────── */

export interface ProductionProcess {
  id: string;
  name: string;
  productId: string;
  selectedOptions: string[];
  stationNodes: StationNode[];
  totalTime: number;
  criticalPath: string[];
}

export interface StageGroup {
  orderIndex: number;
  parallelGroupId: string;
  stations: StationNode[];
  maxDuration: number;
  criticalStationId: string;
}

export interface CostBreakdown {
  totalMinutes: number;
  labourCost: number;
  materialCost: number;
  machineCost: number;
  vasteKosCost: number;
  bedryfskosCell: number;
  totalPerUnit: number;
}
