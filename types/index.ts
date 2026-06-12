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
  is_active: boolean;
  created_at: string;
  // Hardware credentials live in a separate HardwareCredential table
  // linked by staff_id — not embedded here to allow many per person.
}

// ── Hardware Authentication ────────────────────────────────────────────
//
// How it works:
//   1. A hardware device (scanner, reader, keypad) authenticates the staff
//      member using its own method (face, finger, card swipe, etc.).
//   2. The device sends a POST to /api/v1/clock with the token it has on
//      file for that person.
//   3. The server looks up the token in HardwareCredential, resolves the
//      staff_id, and writes a ClockEvent.
//   4. For biometric devices (face/fingerprint) the `token` is the
//      enrollment ID stored in the scanner — raw biometric data is NEVER
//      stored here.
//
export type HardwareAuthType =
  | "rfid_card"    // RFID badge / proximity card
  | "nfc"          // NFC tap (smart card, phone)
  | "fingerprint"  // Fingerprint biometric — token = scanner enrollment ID
  | "face"         // Face recognition       — token = scanner enrollment ID
  | "pin"          // Numeric PIN pad        — token = bcrypt hash
  | "qr_code"      // Printed QR on ID badge — token = generated UUID
  | "barcode";     // Barcode scanner        — token = barcode string

/** One authentication method for one staff member.
 *  A person may have multiple credentials (e.g. RFID primary + PIN backup).
 *  device_id scopes the credential to a specific reader if needed. */
export interface HardwareCredential {
  id: string;
  staff_id: string;
  auth_type: HardwareAuthType;
  /** The identifier the device sends on each authentication event. */
  token: string;
  /** Human-readable label, e.g. "Main entrance card", "Backup PIN". */
  label?: string;
  /** Optional: tie to a specific device/reader rather than any reader. */
  device_id?: string;
  is_active: boolean;
  enrolled_at: string;
  last_used_at?: string;
}

// ── Clock Events ──────────────────────────────────────────────────────
export type ClockEventType = "clock_in" | "clock_out" | "break_start" | "break_end";

/** A single timestamped event — triggered by hardware or manual admin entry. */
export interface ClockEvent {
  id: string;
  staff_id: string;
  event_type: ClockEventType;
  timestamp: string;               // ISO 8601
  auth_type?: HardwareAuthType;   // which method was used
  credential_id?: string;          // which HardwareCredential record
  device_id?: string;              // which physical reader/terminal
  station_id?: string;             // location in the facility
  shift_id?: string;               // links to Shift when applicable
  is_manual_entry: boolean;        // true = admin correction, not hardware event
  notes?: string;
}

// ── Shifts ────────────────────────────────────────────────────────────
export type ShiftStatus =
  | "scheduled"   // future, not started
  | "in_progress" // clocked in, not yet out
  | "completed"   // clocked in AND out
  | "missed"      // scheduled window passed, no clock-in
  | "partial";    // clocked in but no clock-out recorded

export interface Shift {
  id: string;
  org_id: string;
  staff_id: string;
  scheduled_start: string;   // ISO 8601
  scheduled_end: string;
  station_id?: string;
  status: ShiftStatus;
  clock_in_id?: string;      // ClockEvent.id of the clock-in
  clock_out_id?: string;     // ClockEvent.id of the clock-out
  notes?: string;
  created_at: string;
}

// ── Labour Logs ───────────────────────────────────────────────────────
/** Granular record of what a staff member worked on during a shift. */
export interface LabourLog {
  id: string;
  org_id: string;
  staff_id: string;
  shift_id?: string;
  task_id?: string;          // links to Task (process module)
  order_id?: string;
  station_id?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  notes?: string;
  created_at: string;
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
