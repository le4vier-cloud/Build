"use client";

import { useState } from "react";
import { Users, Plus, Timer, CalendarDays } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";
import { MultiInput } from "@/components/ui/multi-input";

const SUB_NAV = [
  { key: "list",      label: "Staff",          icon: <Users size={15} strokeWidth={1.8} /> },
  { key: "add",       label: "Add Staff",      icon: <Plus size={15} strokeWidth={2} /> },
  { key: "clocks",    label: "Clock Stamps",   icon: <Timer size={15} strokeWidth={1.8} /> },
  { key: "schedule",  label: "Staff Schedule", icon: <CalendarDays size={15} strokeWidth={1.8} /> },
];

const MOCK_STAFF = [
  { id: "1", name: "Jane Smith", email: "jane@company.com", user_role: "Back End", hourly_wage: 85 },
  { id: "2", name: "Tom Ndlovu", email: "tom@company.com", user_role: "Front End", hourly_wage: 65 },
];

export default function StaffPage() {
  const [view, setView] = useState("add");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    hourly_wage: "",
    user_role: "front_end",
    staff_roles: [] as string[],
    station_ids: [] as string[],
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ModuleLayout title="Staff" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
      {view === "list" && <StaffList />}
      {view === "add" && (
        <AddStaffForm form={form} set={set} />
      )}
      {view === "clocks" && <ClockStampsView />}
      {view === "schedule" && <ScheduleView />}
    </ModuleLayout>
  );
}

/* ── Views ─────────────────────────────────────────── */

function StaffList() {
  return (
    <div>
      <table style={t.table}>
        <thead>
          <tr>
            {["Name", "Email", "User Role", "Hourly Wage"].map((h) => (
              <th key={h} style={t.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_STAFF.map((s) => (
            <tr key={s.id} style={t.tr}>
              <td style={t.td}>{s.name}</td>
              <td style={t.td}>{s.email}</td>
              <td style={t.td}>{s.user_role}</td>
              <td style={t.td}>R{s.hourly_wage}/hr</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddStaffForm({ form, set }: { form: ReturnType<typeof Object.create>; set: (k: string, v: unknown) => void }) {
  return (
    <div style={f.grid}>
      <div style={f.col}>
        <h3 style={f.sectionTitle}>Add New Staff</h3>

        <div style={f.imageUpload}>
          <span style={f.imageText}>Click to upload an image</span>
        </div>

        <Field label="New Staff Email*" type="email" placeholder="Type here..."
          value={form.email} onChange={(v) => set("email", v)} />
        <Field label="New Staff Password*" type="password" placeholder="Type here..."
          value={form.password} onChange={(v) => set("password", v)} />
        <Field label="New Staff Name*" placeholder="Type here..."
          value={form.name} onChange={(v) => set("name", v)} />
        <Field label="Hourly Wage*" type="number" placeholder="Type here..."
          value={form.hourly_wage} onChange={(v) => set("hourly_wage", v)} />
      </div>

      <div style={f.col}>
        <div style={f.fieldGroup}>
          <label style={f.label}>User Roles*</label>
          <div style={f.selectRow}>
            <select
              value={form.user_role}
              onChange={(e) => set("user_role", e.target.value)}
              style={f.select}
            >
              <option value="front_end">Front End</option>
              <option value="back_end">Back End</option>
            </select>
          </div>
        </div>

        <div style={f.fieldGroup}>
          <label style={f.label}>Staff Roles*</label>
          <div style={f.selectRow}>
            <select style={f.select}>
              <option value="">Choose From Staff Roles (0)</option>
            </select>
          </div>
        </div>

        <div style={f.fieldGroup}>
          <label style={f.label}>Stations</label>
          <div style={f.selectRow}>
            <select style={f.select}>
              <option value="">Choose From Stations</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <SaveButton />
      </div>
    </div>
  );
}

function ClockStampsView() {
  return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Clock stamps will appear here.</p>;
}

function ScheduleView() {
  return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Staff schedule will appear here.</p>;
}

/* ── Shared Field ───────────────────────────────────── */
function Field({ label, value, onChange, placeholder = "Type here...", type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div style={f.fieldGroup}>
      <label style={f.label}>{label}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} style={f.input} />
    </div>
  );
}

function SaveButton({ label = "Save" }: { label?: string }) {
  return (
    <button style={btn.save}>{label}</button>
  );
}

/* ── Styles ─────────────────────────────────────────── */
const f: Record<string, React.CSSProperties> = {
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 },
  col: { display: "flex", flexDirection: "column", gap: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 },
  imageUpload: {
    width: 120, height: 120, border: "1px dashed var(--input-border)",
    borderRadius: "var(--radius-md)", display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", backgroundColor: "var(--bg)",
  },
  imageText: { fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: 8 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input: {
    height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)",
    padding: "0 12px", fontSize: 14, color: "var(--text-primary)",
    backgroundColor: "var(--surface)", outline: "none", width: "100%",
  },
  select: {
    flex: 1, height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)",
    padding: "0 12px", fontSize: 14, color: "var(--text-primary)",
    backgroundColor: "var(--surface)", outline: "none",
  },
  selectRow: { display: "flex", gap: 8, alignItems: "center" },
};

const t: Record<string, React.CSSProperties> = {
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600,
    color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)" },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "12px 16px", fontSize: 14, color: "var(--text-primary)" },
};

const btn: Record<string, React.CSSProperties> = {
  save: {
    height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "var(--btn-primary-text)",
    border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600,
    cursor: "pointer", letterSpacing: "0.01em",
  },
};
