"use client";

import { useState, Fragment } from "react";
import {
  Users, Plus, Timer, CalendarDays,
  CreditCard, Fingerprint, ScanFace, KeyRound, QrCode, Wifi, Scan,
  LogIn, LogOut, Coffee, RotateCcw, Info,
  ChevronDown, ChevronUp, X,
  Pencil, Trash2, SlidersHorizontal,
} from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";
import type {
  HardwareAuthType, HardwareCredential, ClockEvent, Shift, StaffMember,
  ClockEventType, ShiftStatus, StaffRole,
} from "@/types/index";

/* ── Auth method config ────────────────────────────────────────────── */
const AUTH_CFG: Record<HardwareAuthType, {
  label: string; color: string; icon: React.ReactNode;
  tokenLabel: string; tokenPlaceholder: string; hint: string;
}> = {
  rfid_card:   { label: "RFID Card",        color: "#4A90E2", icon: <CreditCard  size={14}/>, tokenLabel: "Card ID",       tokenPlaceholder: "e.g. 00043A2F",            hint: "Scan the badge or type the card ID from the back." },
  nfc:         { label: "NFC / Smart Badge", color: "#7B6CF6", icon: <Wifi        size={14}/>, tokenLabel: "NFC Tag ID",    tokenPlaceholder: "e.g. 04:DA:A2:3A",         hint: "Tap on a reader or copy the tag ID from your NFC software." },
  fingerprint: { label: "Fingerprint",       color: "#E55F1F", icon: <Fingerprint size={14}/>, tokenLabel: "Enrollment ID", tokenPlaceholder: "e.g. FP-00421",            hint: "Enroll in your scanner first, then enter the ID it assigns. Raw biometric data is never stored here." },
  face:        { label: "Face Recognition",  color: "#3CC86A", icon: <ScanFace    size={14}/>, tokenLabel: "Enrollment ID", tokenPlaceholder: "e.g. FACE-0042",           hint: "Enroll in your camera system first, then enter the ID it assigns. Raw biometric data is never stored here." },
  pin:         { label: "PIN Code",          color: "#F5C542", icon: <KeyRound    size={14}/>, tokenLabel: "PIN",           tokenPlaceholder: "4–8 digit PIN",             hint: "Stored as a secure hash — cannot be read back. Use a numeric PIN." },
  qr_code:     { label: "QR Badge",          color: "#20B2AA", icon: <QrCode      size={14}/>, tokenLabel: "Badge Code",    tokenPlaceholder: "Leave blank to auto-generate", hint: "Leave blank to auto-generate a unique code. Print it on the staff badge." },
  barcode:     { label: "Barcode",           color: "#A0A0B8", icon: <Scan        size={14}/>, tokenLabel: "Barcode Value", tokenPlaceholder: "e.g. BC-1234567890",        hint: "Scan an existing badge or type the barcode string manually." },
};

const CLOCK_CFG: Record<ClockEventType, { label: string; color: string; icon: React.ReactNode }> = {
  clock_in:    { label: "Clock In",  color: "#3CC86A", icon: <LogIn    size={12}/> },
  clock_out:   { label: "Clock Out", color: "#E55F1F", icon: <LogOut   size={12}/> },
  break_start: { label: "Break",     color: "#F5C542", icon: <Coffee   size={12}/> },
  break_end:   { label: "Back",      color: "#4A90E2", icon: <RotateCcw size={12}/> },
};

const SHIFT_STATUS_CFG: Record<ShiftStatus, { label: string; color: string }> = {
  scheduled:   { label: "Scheduled", color: "#4A90E2" },
  in_progress: { label: "Working",   color: "#3CC86A" },
  completed:   { label: "Completed", color: "#7B6CF6" },
  missed:      { label: "Missed",    color: "#E55F1F" },
  partial:     { label: "Partial",   color: "#F5C542" },
};

/* ── Mock data ────────────────────────────────────────────────────── */
const MOCK_STAFF: StaffMember[] = [
  { id: "1", org_id: "org1", name: "Jane Smith",  email: "jane@company.com",
    hourly_wage: 85, user_role: "back_end",  staff_role_ids: [],
    is_active: true,  created_at: "2026-01-15T09:00:00Z" },
  { id: "2", org_id: "org1", name: "Tom Ndlovu",  email: "tom@company.com",
    hourly_wage: 65, user_role: "front_end", staff_role_ids: [],
    is_active: true,  created_at: "2026-02-01T08:00:00Z" },
  { id: "3", org_id: "org1", name: "Sara Botha",  email: "sara@company.com",
    hourly_wage: 72, user_role: "front_end", staff_role_ids: [],
    is_active: false, created_at: "2026-03-01T10:00:00Z" },
];

const MOCK_CREDS: HardwareCredential[] = [
  { id: "c1", staff_id: "1", auth_type: "fingerprint", token: "FP-00421",
    label: "Right index finger", device_id: "biometric-main",
    is_active: true,  enrolled_at: "2026-01-15T09:00:00Z", last_used_at: "2026-06-12T07:58:00Z" },
  { id: "c2", staff_id: "1", auth_type: "rfid_card",   token: "00043A2F",
    label: "Main entrance card",
    is_active: true,  enrolled_at: "2026-01-15T09:00:00Z", last_used_at: "2026-06-11T16:04:00Z" },
  { id: "c3", staff_id: "2", auth_type: "rfid_card",   token: "0013BB8E",
    label: "Site card",
    is_active: true,  enrolled_at: "2026-02-01T08:00:00Z", last_used_at: "2026-06-12T07:55:00Z" },
  { id: "c4", staff_id: "2", auth_type: "pin",         token: "$2b$10$…",
    label: "Backup PIN",
    is_active: true,  enrolled_at: "2026-02-01T08:00:00Z" },
  { id: "c5", staff_id: "3", auth_type: "qr_code",    token: "QR-3A9F21E",
    label: "ID badge QR",
    is_active: false, enrolled_at: "2026-03-01T10:00:00Z" },
];

const MOCK_EVENTS: Array<ClockEvent & { staffName: string }> = [
  { id: "ev1", staff_id: "2", staffName: "Tom Ndlovu",  event_type: "clock_in",    timestamp: "2026-06-12T07:55:00Z", auth_type: "rfid_card",   credential_id: "c3", device_id: "reader-gate",    is_manual_entry: false },
  { id: "ev2", staff_id: "1", staffName: "Jane Smith",  event_type: "clock_in",    timestamp: "2026-06-12T07:58:00Z", auth_type: "fingerprint", credential_id: "c1", device_id: "biometric-main", is_manual_entry: false },
  { id: "ev3", staff_id: "1", staffName: "Jane Smith",  event_type: "break_start", timestamp: "2026-06-12T12:01:00Z", auth_type: "fingerprint", credential_id: "c1", device_id: "biometric-main", is_manual_entry: false },
  { id: "ev4", staff_id: "1", staffName: "Jane Smith",  event_type: "break_end",   timestamp: "2026-06-12T12:30:00Z", auth_type: "rfid_card",   credential_id: "c2", device_id: "reader-gate",    is_manual_entry: false },
  { id: "ev5", staff_id: "3", staffName: "Sara Botha",  event_type: "clock_in",    timestamp: "2026-06-11T08:05:00Z", auth_type: "qr_code",     credential_id: "c5", device_id: "reader-back",    is_manual_entry: false },
  { id: "ev6", staff_id: "3", staffName: "Sara Botha",  event_type: "clock_out",   timestamp: "2026-06-11T16:10:00Z", is_manual_entry: true,  notes: "Scanner offline — entered by admin." },
];

const MOCK_SHIFTS: Array<Shift & { staffName: string }> = [
  { id: "sh1", org_id: "org1", staff_id: "1", staffName: "Jane Smith",
    scheduled_start: "2026-06-12T08:00:00Z", scheduled_end: "2026-06-12T16:00:00Z",
    station_id: "s1", status: "in_progress", clock_in_id: "ev2", created_at: "2026-06-11T10:00:00Z" },
  { id: "sh2", org_id: "org1", staff_id: "2", staffName: "Tom Ndlovu",
    scheduled_start: "2026-06-12T08:00:00Z", scheduled_end: "2026-06-12T14:00:00Z",
    station_id: "s2", status: "in_progress", clock_in_id: "ev1", created_at: "2026-06-11T10:00:00Z" },
  { id: "sh3", org_id: "org1", staff_id: "3", staffName: "Sara Botha",
    scheduled_start: "2026-06-12T08:00:00Z", scheduled_end: "2026-06-12T16:00:00Z",
    status: "missed", created_at: "2026-06-11T10:00:00Z" },
  { id: "sh4", org_id: "org1", staff_id: "1", staffName: "Jane Smith",
    scheduled_start: "2026-06-11T08:00:00Z", scheduled_end: "2026-06-11T16:00:00Z",
    station_id: "s1", status: "completed", clock_in_id: "ev2", clock_out_id: "ev6",
    created_at: "2026-06-10T10:00:00Z" },
];

/* ── Helpers ──────────────────────────────────────────────────────── */
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function shiftDuration(start: string, end: string) {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/* ── Role constants ───────────────────────────────────────────────── */
const ROLE_COLORS = [
  "#7B6CF6", "#4A90E2", "#3CC86A", "#F5C542",
  "#E55F1F", "#20B2AA", "#E84393", "#A0A0B8",
];

const MOCK_ROLES: StaffRole[] = [
  { id: "r1", org_id: "org1", name: "General Manager",
    color: "#7B6CF6", created_at: "2026-01-01T00:00:00Z" },
  { id: "r2", org_id: "org1", name: "Operations Manager",
    description: "Oversees day-to-day production operations",
    parent_role_id: "r1", color: "#4A90E2", created_at: "2026-01-01T00:00:00Z" },
  { id: "r3", org_id: "org1", name: "Production Supervisor",
    description: "Supervises floor activities and output targets",
    parent_role_id: "r2", color: "#3CC86A", created_at: "2026-01-01T00:00:00Z" },
  { id: "r4", org_id: "org1", name: "Machine Operator",
    parent_role_id: "r3", color: "#F5C542", created_at: "2026-01-01T00:00:00Z" },
  { id: "r5", org_id: "org1", name: "Assembly Technician",
    parent_role_id: "r3", color: "#F5C542", created_at: "2026-01-01T00:00:00Z" },
  { id: "r6", org_id: "org1", name: "QC Inspector",
    description: "Quality control and sign-off",
    parent_role_id: "r3", color: "#E55F1F", created_at: "2026-01-01T00:00:00Z" },
  { id: "r7", org_id: "org1", name: "Admin Manager",
    description: "Administrative and HR functions",
    parent_role_id: "r1", color: "#4A90E2", created_at: "2026-01-01T00:00:00Z" },
];

/** Returns true if `candidateId` is a descendant of `ancestorId` in the role tree. */
function isDescendant(candidateId: string, ancestorId: string, roles: StaffRole[]): boolean {
  let cur = roles.find((r) => r.id === candidateId);
  while (cur?.parent_role_id) {
    if (cur.parent_role_id === ancestorId) return true;
    cur = roles.find((r) => r.id === cur!.parent_role_id);
  }
  return false;
}

/* ── Shared mini-components ───────────────────────────────────────── */
function CredBadge({ type, size = "sm" }: { type: HardwareAuthType; size?: "sm" | "md" }) {
  const cfg = AUTH_CFG[type];
  const dim = size === "sm" ? 22 : 28;
  return (
    <span title={cfg.label} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: dim, height: dim, borderRadius: 6, flexShrink: 0,
      backgroundColor: cfg.color + "22", border: `1.5px solid ${cfg.color}44`,
      color: cfg.color,
    }}>
      {cfg.icon}
    </span>
  );
}

function EventPill({ type }: { type: ClockEventType }) {
  const cfg = CLOCK_CFG[type];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      backgroundColor: cfg.color + "22", border: `1px solid ${cfg.color}55`, color: cfg.color,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ShiftPill({ status }: { status: ShiftStatus }) {
  const cfg = SHIFT_STATUS_CFG[status];
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      backgroundColor: cfg.color + "22", border: `1px solid ${cfg.color}55`, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

/* ── Auth type picker (grid of method buttons) ───────────────────── */
function AuthTypePicker({ value, onChange }: {
  value: HardwareAuthType | null;
  onChange: (t: HardwareAuthType) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {(Object.entries(AUTH_CFG) as [HardwareAuthType, typeof AUTH_CFG[HardwareAuthType]][]).map(([type, cfg]) => {
        const active = value === type;
        return (
          <button key={type} type="button" onClick={() => onChange(type)} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 11px", borderRadius: 8, fontSize: 12,
            fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 0.1s",
            border: `1.5px solid ${active ? cfg.color : "var(--border)"}`,
            backgroundColor: active ? cfg.color + "18" : "var(--surface)",
            color: active ? cfg.color : "var(--text-secondary)",
          }}>
            <span style={{ color: active ? cfg.color : "var(--text-tertiary)" }}>{cfg.icon}</span>
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Credential Enrollment (inline in Add Staff form) ─────────────── */
type PendingCred = { auth_type: HardwareAuthType; token: string; label: string };

function CredentialEnrollment({
  credentials, onChange,
}: { credentials: PendingCred[]; onChange: (c: PendingCred[]) => void }) {
  const [adding, setAdding]     = useState(false);
  const [authType, setAuthType] = useState<HardwareAuthType | null>(null);
  const [token, setToken]       = useState("");
  const [label, setLabel]       = useState("");

  function commit() {
    if (!authType) return;
    let finalToken = token.trim();
    if (!finalToken) {
      if (authType === "qr_code") {
        finalToken = `QR-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
      } else {
        return;
      }
    }
    onChange([...credentials, { auth_type: authType, token: finalToken, label: label.trim() }]);
    setAuthType(null); setToken(""); setLabel(""); setAdding(false);
  }

  const cfg = authType ? AUTH_CFG[authType] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Enrolled list */}
      {credentials.map((c, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 12px", borderRadius: 8,
          border: "1px solid var(--border)", backgroundColor: "var(--bg)",
        }}>
          <CredBadge type={c.auth_type} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {AUTH_CFG[c.auth_type].label}
            </div>
            {c.label && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{c.label}</div>}
          </div>
          <code style={{ fontSize: 11, color: "var(--text-tertiary)", padding: "1px 5px", backgroundColor: "var(--bg)", borderRadius: 4 }}>
            {c.auth_type === "pin" ? "•••••" : c.token}
          </code>
          <button type="button" onClick={() => onChange(credentials.filter((_, j) => j !== i))} style={btn.icon}>
            <X size={13} />
          </button>
        </div>
      ))}

      {/* Add form */}
      {adding ? (
        <div style={{
          padding: 16, borderRadius: 10,
          border: "1px solid var(--border)", backgroundColor: "var(--bg)",
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={s.fieldGroup}>
            <label style={s.label}>Auth Method *</label>
            <AuthTypePicker value={authType} onChange={setAuthType} />
          </div>

          {cfg && (
            <>
              <div style={s.fieldGroup}>
                <label style={s.label}>{cfg.tokenLabel} *</label>
                <input value={token} onChange={(e) => setToken(e.target.value)}
                  placeholder={cfg.tokenPlaceholder} style={s.input} />
                <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                  <Info size={11} style={{ color: "var(--text-tertiary)", marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5 }}>{cfg.hint}</span>
                </div>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Label <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>(optional)</span></label>
                <input value={label} onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Main entrance card, Right thumb" style={s.input} />
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => { setAdding(false); setAuthType(null); setToken(""); setLabel(""); }} style={btn.ghost}>
              Cancel
            </button>
            <button type="button" onClick={commit}
              disabled={!authType || (authType !== "qr_code" && !token.trim())}
              style={{ ...btn.primary, opacity: (!authType || (authType !== "qr_code" && !token.trim())) ? 0.4 : 1 }}>
              Add
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "8px", borderRadius: 8, width: "100%",
          border: "1.5px dashed var(--border)", backgroundColor: "transparent",
          color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer",
        }}>
          <Plus size={14} /> Add Credential
        </button>
      )}
    </div>
  );
}

/* ── Roles Modal ──────────────────────────────────────────────────── */
function RolesModal({ onClose }: { onClose: () => void }) {
  const [roles, setRoles]           = useState<StaffRole[]>(MOCK_ROLES);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", parent_role_id: "", color: ROLE_COLORS[1],
  });

  function openAdd() {
    setEditingId(null);
    setForm({ name: "", description: "", parent_role_id: "", color: ROLE_COLORS[1] });
    setShowForm(true);
  }

  function openEdit(role: StaffRole) {
    setEditingId(role.id);
    setForm({
      name: role.name,
      description: role.description ?? "",
      parent_role_id: role.parent_role_id ?? "",
      color: role.color ?? ROLE_COLORS[1],
    });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditingId(null); }

  function save() {
    if (!form.name.trim()) return;
    if (editingId) {
      setRoles((rs) => rs.map((r) => r.id !== editingId ? r : {
        ...r,
        name:           form.name.trim(),
        description:    form.description.trim() || undefined,
        parent_role_id: form.parent_role_id || undefined,
        color:          form.color,
      }));
    } else {
      setRoles((rs) => [...rs, {
        id: `r${Date.now()}`, org_id: "org1",
        name:           form.name.trim(),
        description:    form.description.trim() || undefined,
        parent_role_id: form.parent_role_id || undefined,
        color:          form.color,
        created_at:     new Date().toISOString(),
      }]);
    }
    closeForm();
  }

  function remove(id: string) {
    const hasKids = roles.some((r) => r.parent_role_id === id);
    if (hasKids && confirmDel !== id) { setConfirmDel(id); return; }
    // Orphan children up to deleted role's parent
    const parentId = roles.find((r) => r.id === id)?.parent_role_id;
    setRoles((rs) =>
      rs.filter((r) => r.id !== id)
        .map((r) => r.parent_role_id === id ? { ...r, parent_role_id: parentId } : r)
    );
    setConfirmDel(null);
  }

  function getChildren(pid: string | undefined) {
    return roles.filter((r) => r.parent_role_id === pid);
  }

  function renderTree(pid: string | undefined, depth: number): React.ReactNode {
    return getChildren(pid).map((role) => {
      const staffCount = MOCK_STAFF.filter((s) => s.staff_role_ids.includes(role.id)).length;
      const hasKids    = roles.some((r) => r.parent_role_id === role.id);
      return (
        <Fragment key={role.id}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: `10px 16px 10px ${16 + depth * 22}px`,
            borderBottom: "1px solid var(--border)",
            backgroundColor: editingId === role.id ? "var(--surface)" : undefined,
          }}>
            {/* Color dot */}
            <div style={{
              width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
              backgroundColor: role.color ?? "#A0A0B8",
            }} />

            {/* Name + description */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {role.name}
              </div>
              {role.description && (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 1 }}>
                  {role.description}
                </div>
              )}
            </div>

            {/* Staff count */}
            {staffCount > 0 && (
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {staffCount} staff
              </span>
            )}

            {/* Delete confirm */}
            {confirmDel === role.id ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#E55F1F" }}>
                  {hasKids ? "Has sub-roles. " : ""}Delete?
                </span>
                <button onClick={() => remove(role.id)} style={mb.danger}>Yes</button>
                <button onClick={() => setConfirmDel(null)} style={mb.sm}>No</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => openEdit(role)} style={mb.icon} title="Edit role">
                  <Pencil size={13} />
                </button>
                <button onClick={() => remove(role.id)} style={{ ...mb.icon, color: "#E55F1F88" }} title="Delete role">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Children */}
          {renderTree(role.id, depth + 1)}
        </Fragment>
      );
    });
  }

  // When editing, exclude the role itself and its descendants from the parent options
  const parentOptions = editingId
    ? roles.filter((r) => r.id !== editingId && !isDescendant(r.id, editingId, roles))
    : roles;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.55)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 560, maxHeight: "82vh",
        backgroundColor: "var(--bg)", borderRadius: 14,
        border: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "flex-start",
          padding: "18px 20px", borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Staff Roles
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "3px 0 0" }}>
              Define your management hierarchy — roles cascade downward
            </p>
          </div>
          <div style={{ flex: 1 }} />
          {!showForm && (
            <button
              onClick={openAdd}
              style={{ ...mb.primary, display: "flex", alignItems: "center", gap: 6, marginRight: 10 }}
            >
              <Plus size={13} /> Add Role
            </button>
          )}
          <button onClick={onClose} style={mb.icon}><X size={16} /></button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* Tree */}
          {roles.filter((r) => !r.parent_role_id).length === 0 && !showForm ? (
            <p style={{ padding: "32px 20px", color: "var(--text-tertiary)", fontSize: 14, textAlign: "center" }}>
              No roles defined yet.
            </p>
          ) : (
            renderTree(undefined, 0)
          )}

          {/* Add / Edit form */}
          {showForm && (
            <div style={{
              padding: 20, borderTop: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {editingId ? "Edit Role" : "New Role"}
              </h4>

              <div style={mf.group}>
                <label style={mf.label}>Role Name *</label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Production Supervisor"
                  style={mf.input}
                />
              </div>

              <div style={mf.group}>
                <label style={mf.label}>
                  Description{" "}
                  <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Responsibilities of this role"
                  style={mf.input}
                />
              </div>

              <div style={mf.group}>
                <label style={mf.label}>Reports to</label>
                <select
                  value={form.parent_role_id}
                  onChange={(e) => setForm((f) => ({ ...f, parent_role_id: e.target.value }))}
                  style={mf.select}
                >
                  <option value="">— Top level (no parent) —</option>
                  {parentOptions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div style={mf.group}>
                <label style={mf.label}>Colour</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ROLE_COLORS.map((c) => (
                    <button
                      key={c} type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      style={{
                        width: 22, height: 22, borderRadius: "50%",
                        backgroundColor: c, border: "none", cursor: "pointer",
                        boxShadow: form.color === c
                          ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}`
                          : "none",
                        transition: "box-shadow 0.1s",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={closeForm} style={mb.ghost}>Cancel</button>
                <button
                  onClick={save}
                  disabled={!form.name.trim()}
                  style={{ ...mb.primary, opacity: form.name.trim() ? 1 : 0.4 }}
                >
                  {editingId ? "Save Changes" : "Add Role"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Staff List ───────────────────────────────────────────────────── */
function StaffList({ onAddStaff }: { onAddStaff: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRoles, setShowRoles]   = useState(false);
  const credsByStaff = (sid: string) => MOCK_CREDS.filter((c) => c.staff_id === sid);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {MOCK_STAFF.length} staff members
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowRoles(true)}
            style={{ ...btn.ghost, display: "flex", alignItems: "center", gap: 6 }}
          >
            <SlidersHorizontal size={14} /> Manage Roles
          </button>
          <button onClick={onAddStaff} style={{ ...btn.primary, display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Add Staff
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {MOCK_STAFF.map((staff) => {
          const creds    = credsByStaff(staff.id);
          const expanded = expandedId === staff.id;
          return (
            <div key={staff.id} style={{
              border: "1px solid var(--border)", borderRadius: 10,
              backgroundColor: "var(--surface)", overflow: "hidden",
            }}>
              {/* Row */}
              <div
                onClick={() => setExpandedId(expanded ? null : staff.id)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", cursor: "pointer" }}
              >
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  backgroundColor: "var(--bg)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "var(--text-secondary)",
                }}>
                  {initials(staff.name)}
                </div>

                {/* Name + email */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>{staff.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{staff.email}</div>
                </div>

                {/* Role */}
                <span style={{ width: 90, fontSize: 12, color: "var(--text-secondary)" }}>
                  {staff.user_role === "back_end" ? "Back End" : "Front End"}
                </span>

                {/* Wage */}
                <span style={{ width: 80, fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                  R{staff.hourly_wage}/hr
                </span>

                {/* Credential badges */}
                <div style={{ display: "flex", gap: 4, width: 110, flexWrap: "wrap" }}>
                  {creds.length === 0
                    ? <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>No credentials</span>
                    : creds.map((c) => <CredBadge key={c.id} type={c.auth_type} />)}
                </div>

                {/* Status */}
                <span style={{
                  display: "inline-block", padding: "2px 8px", borderRadius: 999,
                  fontSize: 11, fontWeight: 600, width: 66,
                  backgroundColor: staff.is_active ? "#3CC86A22" : "#E55F1F22",
                  border: `1px solid ${staff.is_active ? "#3CC86A55" : "#E55F1F55"}`,
                  color: staff.is_active ? "#3CC86A" : "#E55F1F",
                }}>
                  {staff.is_active ? "Active" : "Inactive"}
                </span>

                {/* Chevron */}
                <span style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </div>

              {/* Expanded credentials panel */}
              {expanded && (
                <div style={{
                  borderTop: "1px solid var(--border)",
                  padding: "16px 20px",
                  backgroundColor: "var(--bg)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                    Hardware Credentials
                  </div>
                  {creds.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
                      No credentials enrolled yet.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {creds.map((c) => (
                        <div key={c.id} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "8px 12px", borderRadius: 8,
                          border: "1px solid var(--border)", backgroundColor: "var(--surface)",
                          opacity: c.is_active ? 1 : 0.5,
                        }}>
                          <CredBadge type={c.auth_type} size="md" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                              {AUTH_CFG[c.auth_type].label}{c.label ? ` — ${c.label}` : ""}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                              {c.device_id ? `Device: ${c.device_id} · ` : ""}
                              Enrolled {fmtDate(c.enrolled_at)}
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "right" }}>
                            {c.last_used_at ? `Last used ${fmtDate(c.last_used_at)}` : "Never used"}
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 999,
                            backgroundColor: c.is_active ? "#3CC86A22" : "#A0A0B822",
                            border: `1px solid ${c.is_active ? "#3CC86A44" : "#A0A0B844"}`,
                            color: c.is_active ? "#3CC86A" : "#A0A0B8",
                          }}>
                            {c.is_active ? "Active" : "Off"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showRoles && <RolesModal onClose={() => setShowRoles(false)} />}
    </div>
  );
}

/* ── Add Staff Form ───────────────────────────────────────────────── */
function AddStaffForm() {
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    hourly_wage: "", user_role: "front_end",
  });
  const [pendingCreds, setPendingCreds] = useState<PendingCred[]>([]);
  const upd = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      {/* Left — personal info */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h3 style={s.sectionTitle}>Personal Info</h3>

        <div style={s.imageUpload}>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: 8 }}>
            Click to upload photo
          </span>
        </div>

        <Field label="Full Name *"       value={form.name}        onChange={(v) => upd("name", v)}        placeholder="Jane Smith" />
        <Field label="Email *"           value={form.email}       onChange={(v) => upd("email", v)}       placeholder="jane@company.com" type="email" />
        <Field label="Password *"        value={form.password}    onChange={(v) => upd("password", v)}    placeholder="••••••••"           type="password" />
        <Field label="Hourly Wage (R) *" value={form.hourly_wage} onChange={(v) => upd("hourly_wage", v)} placeholder="85"                 type="number" />
      </div>

      {/* Right — role + credentials */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h3 style={s.sectionTitle}>Role & Access</h3>

        <div style={s.fieldGroup}>
          <label style={s.label}>User Role *</label>
          <select value={form.user_role} onChange={(e) => upd("user_role", e.target.value)} style={s.select}>
            <option value="front_end">Front End</option>
            <option value="back_end">Back End</option>
          </select>
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Staff Roles</label>
          <select style={s.select}><option value="">Choose from staff roles</option></select>
        </div>

        {/* Hardware credential enrollment */}
        <div style={s.fieldGroup}>
          <label style={s.label}>Hardware Credentials</label>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "0 0 8px", lineHeight: 1.6 }}>
            Add any auth methods this person will use to clock in — RFID cards, fingerprint scanners,
            face cameras, PIN pads, or QR badges. Any hardware your facility uses is supported.
            Multiple methods can be enrolled as a primary + backup.
          </p>
          <CredentialEnrollment credentials={pendingCreds} onChange={setPendingCreds} />
        </div>
      </div>

      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
        <button style={btn.primary}>Add Staff Member</button>
      </div>
    </div>
  );
}

/* ── Clock Events View ────────────────────────────────────────────── */
function ClockEventsView() {
  const [filterStaff, setFilterStaff] = useState("all");
  const [showManual, setShowManual]   = useState(false);

  const events = filterStaff === "all"
    ? MOCK_EVENTS
    : MOCK_EVENTS.filter((e) => e.staff_id === filterStaff);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} style={{ ...s.select, width: 180 }}>
          <option value="all">All Staff</option>
          {MOCK_STAFF.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowManual(!showManual)} style={{ ...btn.ghost, display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Manual Entry
        </button>
      </div>

      {/* Manual entry form */}
      {showManual && (
        <div style={{
          padding: 16, borderRadius: 10, border: "1px solid var(--border)",
          backgroundColor: "var(--surface)",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14,
        }}>
          <div style={s.fieldGroup}>
            <label style={s.label}>Staff Member</label>
            <select style={s.select}>
              {MOCK_STAFF.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Event Type</label>
            <select style={s.select}>
              <option value="clock_in">Clock In</option>
              <option value="clock_out">Clock Out</option>
              <option value="break_start">Break Start</option>
              <option value="break_end">Break End</option>
            </select>
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Timestamp</label>
            <input type="datetime-local" style={s.input} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={s.label}>Notes (required for manual entries)</label>
            <input style={{ ...s.input, marginTop: 6 }} placeholder="Reason for manual entry..." />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setShowManual(false)} style={btn.ghost}>Cancel</button>
            <button style={btn.primary}>Record Event</button>
          </div>
        </div>
      )}

      {/* Table */}
      <table style={t.table}>
        <thead>
          <tr>
            {["Time", "Staff", "Event", "Auth Method", "Device", ""].map((h, i) => (
              <th key={i} style={t.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr><td colSpan={6} style={{ ...t.td, textAlign: "center", color: "var(--text-tertiary)", padding: 36 }}>No events</td></tr>
          ) : events.map((ev) => (
            <tr key={ev.id} style={t.tr}>
              <td style={{ ...t.td, fontFamily: "monospace", fontSize: 12, color: "var(--text-secondary)" }}>
                {fmtDateTime(ev.timestamp)}
              </td>
              <td style={t.td}>
                <span style={{ fontWeight: 500 }}>{ev.staffName}</span>
              </td>
              <td style={t.td}>
                <EventPill type={ev.event_type} />
              </td>
              <td style={t.td}>
                {ev.auth_type ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <CredBadge type={ev.auth_type} />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{AUTH_CFG[ev.auth_type].label}</span>
                  </div>
                ) : ev.is_manual_entry ? (
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic" }}>Manual entry</span>
                ) : "—"}
              </td>
              <td style={{ ...t.td, fontSize: 12, color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                {ev.device_id ?? "—"}
              </td>
              <td style={t.td}>
                {ev.is_manual_entry && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 999,
                    backgroundColor: "#F5C54222", color: "#F5C542", border: "1px solid #F5C54244",
                  }}>
                    Manual
                  </span>
                )}
                {ev.notes && (
                  <span title={ev.notes} style={{ marginLeft: 4, cursor: "help" }}>
                    <Info size={12} style={{ color: "var(--text-tertiary)" }} />
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Hardware integration note */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "12px 14px", borderRadius: 8,
        border: "1px solid var(--border)", backgroundColor: "var(--surface)",
      }}>
        <Info size={14} style={{ color: "var(--text-tertiary)", marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text-secondary)" }}>Hardware integration: </strong>
          Events are recorded automatically when any device authenticates a staff member. RFID readers,
          fingerprint scanners, face cameras, PIN pads — each device posts to{" "}
          <code style={{ fontSize: 11, padding: "1px 4px", backgroundColor: "var(--bg)", borderRadius: 4 }}>
            POST /api/v1/clock
          </code>{" "}
          with its auth token. The server resolves the token to a staff member and creates the event instantly.
          No polling, no custom driver per device type.
        </div>
      </div>
    </div>
  );
}

/* ── Shifts View ──────────────────────────────────────────────────── */
function ShiftsView() {
  const [filterStaff, setFilterStaff] = useState("all");

  const shifts = filterStaff === "all"
    ? MOCK_SHIFTS
    : MOCK_SHIFTS.filter((sh) => sh.staff_id === filterStaff);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} style={{ ...s.select, width: 180 }}>
          <option value="all">All Staff</option>
          {MOCK_STAFF.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button style={{ ...btn.primary, display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Add Shift
        </button>
      </div>

      <table style={t.table}>
        <thead>
          <tr>
            {["Staff", "Scheduled", "Duration", "Status", "Clock In", "Clock Out", "Notes"].map((h, i) => (
              <th key={i} style={t.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shifts.length === 0 ? (
            <tr><td colSpan={7} style={{ ...t.td, textAlign: "center", color: "var(--text-tertiary)", padding: 36 }}>No shifts</td></tr>
          ) : shifts.map((sh) => {
            const clockIn  = sh.clock_in_id  ? MOCK_EVENTS.find((e) => e.id === sh.clock_in_id)  : null;
            const clockOut = sh.clock_out_id ? MOCK_EVENTS.find((e) => e.id === sh.clock_out_id) : null;
            return (
              <tr key={sh.id} style={t.tr}>
                <td style={t.td}>
                  <span style={{ fontWeight: 500 }}>{sh.staffName}</span>
                </td>
                <td style={{ ...t.td, fontSize: 12 }}>
                  <div style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>{fmtDate(sh.scheduled_start)}</div>
                  <div style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                    {fmtTime(sh.scheduled_start)} – {fmtTime(sh.scheduled_end)}
                  </div>
                </td>
                <td style={{ ...t.td, fontSize: 13, color: "var(--text-secondary)" }}>
                  {shiftDuration(sh.scheduled_start, sh.scheduled_end)}
                </td>
                <td style={t.td}>
                  <ShiftPill status={sh.status} />
                </td>
                <td style={t.td}>
                  {clockIn ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#3CC86A" }}>{fmtTime(clockIn.timestamp)}</span>
                      {clockIn.auth_type && <CredBadge type={clockIn.auth_type} />}
                    </div>
                  ) : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                </td>
                <td style={t.td}>
                  {clockOut ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#E55F1F" }}>{fmtTime(clockOut.timestamp)}</span>
                      {clockOut.auth_type && <CredBadge type={clockOut.auth_type} />}
                    </div>
                  ) : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                </td>
                <td style={{ ...t.td, fontSize: 12, color: "var(--text-tertiary)" }}>
                  {sh.notes ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Shared Field ─────────────────────────────────────────────────── */
function Field({ label, value, onChange, placeholder = "Type here...", type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div style={s.fieldGroup}>
      <label style={s.label}>{label}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} style={s.input} />
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────── */
const SUB_NAV = [
  { key: "list",   label: "Staff",        icon: <Users        size={15} strokeWidth={1.8} /> },
  { key: "add",    label: "Add Staff",    icon: <Plus         size={15} strokeWidth={2}   /> },
  { key: "clocks", label: "Clock Events", icon: <Timer        size={15} strokeWidth={1.8} /> },
  { key: "shifts", label: "Shifts",       icon: <CalendarDays size={15} strokeWidth={1.8} /> },
];

export default function StaffPage() {
  const [view, setView] = useState<string | null>(null);

  return (
    <ModuleLayout title="Staff" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
      {view === "list"   && <StaffList onAddStaff={() => setView("add")} />}
      {view === "add"    && <AddStaffForm />}
      {view === "clocks" && <ClockEventsView />}
      {view === "shifts" && <ShiftsView />}
    </ModuleLayout>
  );
}

/* ── Styles ───────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  sectionTitle: { fontSize: 18, fontWeight: 600, color: "var(--text-primary)", margin: 0 },
  fieldGroup:   { display: "flex", flexDirection: "column", gap: 6 },
  label:        { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input: {
    height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)",
    padding: "0 12px", fontSize: 14, color: "var(--text-primary)",
    backgroundColor: "var(--surface)", outline: "none", width: "100%", boxSizing: "border-box",
  },
  select: {
    height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)",
    padding: "0 12px", fontSize: 14, color: "var(--text-primary)",
    backgroundColor: "var(--surface)", outline: "none", width: "100%",
  },
  imageUpload: {
    width: 100, height: 100, border: "1px dashed var(--input-border)",
    borderRadius: "var(--radius-md)", display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", backgroundColor: "var(--bg)",
  },
};

const t: Record<string, React.CSSProperties> = {
  table: { width: "100%", borderCollapse: "collapse" },
  th:    { padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600,
           color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)" },
  tr:    { borderBottom: "1px solid var(--border)" },
  td:    { padding: "12px 16px", fontSize: 14, color: "var(--text-primary)", verticalAlign: "middle" },
};

const btn: Record<string, React.CSSProperties> = {
  primary: {
    height: 36, padding: "0 20px",
    backgroundColor: "var(--btn-primary)", color: "var(--btn-primary-text)",
    border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  ghost: {
    height: 36, padding: "0 16px", backgroundColor: "transparent", color: "var(--text-secondary)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-full, 9999px)", fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
  icon: {
    width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center",
    backgroundColor: "transparent", border: "none", borderRadius: 6,
    color: "var(--text-tertiary)", cursor: "pointer",
  },
};

/* Modal button styles */
const mb: Record<string, React.CSSProperties> = {
  primary: {
    height: 32, padding: "0 16px",
    backgroundColor: "var(--btn-primary)", color: "var(--btn-primary-text)",
    border: "none", borderRadius: "var(--radius-full, 9999px)",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  ghost: {
    height: 32, padding: "0 14px", backgroundColor: "transparent",
    color: "var(--text-secondary)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-full, 9999px)", fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
  danger: {
    height: 24, padding: "0 10px", fontSize: 11, fontWeight: 600,
    backgroundColor: "#E55F1F22", color: "#E55F1F",
    border: "1px solid #E55F1F44", borderRadius: "var(--radius-full, 9999px)", cursor: "pointer",
  },
  sm: {
    height: 24, padding: "0 10px", fontSize: 11, fontWeight: 500,
    backgroundColor: "transparent", color: "var(--text-secondary)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-full, 9999px)", cursor: "pointer",
  },
  icon: {
    width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center",
    backgroundColor: "transparent", border: "none", borderRadius: 6,
    color: "var(--text-tertiary)", cursor: "pointer",
  },
};

/* Modal field styles */
const mf: Record<string, React.CSSProperties> = {
  group:  { display: "flex", flexDirection: "column", gap: 6 },
  label:  { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input: {
    height: 36, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)",
    padding: "0 12px", fontSize: 14, color: "var(--text-primary)",
    backgroundColor: "var(--bg)", outline: "none", width: "100%", boxSizing: "border-box",
  },
  select: {
    height: 36, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)",
    padding: "0 12px", fontSize: 14, color: "var(--text-primary)",
    backgroundColor: "var(--bg)", outline: "none", width: "100%",
  },
};
