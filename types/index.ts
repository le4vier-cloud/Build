// ── Organizations ────────────────────────────────────────────────
export interface Organization {
  id: string;
  name: string;
  logo_url?: string;
  created_at: string;
}

// ── Staff ─────────────────────────────────────────────────────────
export interface StaffRole { id: string; org_id: string; name: string; }
export interface StaffMember {
  id: string;
  org_id: string;
  name: string;
  email: string;
  headshot_url?: string;
  hourly_wage: number;
  user_role: "front_end" | "back_end";
  staff_role_ids: string[];
  station_ids: string[];
  created_at: string;
}
export interface ClockStamp {
  id: string;
  staff_id: string;
  clocked_in_at: string;
  clocked_out_at?: string;
}
export interface StaffSchedule {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

// ── Stations ──────────────────────────────────────────────────────
export interface Station {
  id: string;
  org_id: string;
  name: string;
  image_url?: string;
  wage_per_hour?: number;
  staff_ids: string[];
  tool_ids: string[];
  created_at: string;
}
export interface StationProductWorkflow {
  id: string;
  station_id: string;
  product_id: string;
  workflow_id: string;
}

// ── Products ──────────────────────────────────────────────────────
export interface Product {
  id: string;
  org_id: string;
  name: string;
  model?: string;
  description?: string;
  image_url?: string;
  created_at: string;
}
export interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  task_ids: string[];
}
export interface ProductEvent {
  id: string;
  product_id: string;
  name: string;
  description?: string;
}

// ── Tools ─────────────────────────────────────────────────────────
export interface Tool {
  id: string;
  org_id: string;
  name: string;
  serial_number: string;
  image_url?: string;
  station_ids: string[];
  created_at: string;
}

// ── Suppliers ─────────────────────────────────────────────────────
export interface Supplier {
  id: string;
  org_id: string;
  name: string;
  address?: string;
  emails: string[];
  cell_numbers: string[];
  created_at: string;
}

// ── Parts ─────────────────────────────────────────────────────────
export interface PartOS {
  id: string;
  org_id: string;
  supplier_id: string;
  name: string;
  barcode?: string;
  serial_number?: string;
  qty_in_stock: number;
  min_threshold?: number;
  cost_price?: number;
  sale_price?: number;
  created_at: string;
}
export interface PartIM {
  id: string;
  org_id: string;
  name: string;
  serial_number?: string;
  qty_in_stock: number;
  min_threshold?: number;
  low_stock_alert: boolean;
  assembly_task_name: string;
  assembly_description?: string;
  max_produce_minutes?: number;
  labour_cost_per_hour?: number;
  os_components: { part_os_id: string; quantity: number }[];
  created_at: string;
}

// ── Processes ─────────────────────────────────────────────────────
export interface Task {
  id: string;
  org_id: string;
  product_id: string;
  name: string;
  duration_minutes: number;
  option_set: "machine" | "human";
}
export interface Workflow {
  id: string;
  org_id: string;
  product_id: string;
  name: string;
  task_ids: string[];
}
export interface ProductionProcess {
  id: string;
  org_id: string;
  product_id: string;
  name: string;
  total_time_minutes: number;
  created_at: string;
}

// ── Clients ───────────────────────────────────────────────────────
export interface Client {
  id: string;
  org_id: string;
  name: string;
  address?: string;
  emails: string[];
  cell_numbers: string[];
  created_at: string;
}

// ── Orders ────────────────────────────────────────────────────────
export type OrderStatus = "draft" | "in_progress" | "qa_check" | "complete" | "cancelled";
export interface Order {
  id: string;
  org_id: string;
  client_id: string;
  product_id: string;
  option_ids: string[];
  status: OrderStatus;
  progress_pct: number;
  total_minutes: number;
  remaining_minutes: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
}
