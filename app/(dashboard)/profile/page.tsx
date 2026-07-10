"use client";

import { useState } from "react";
import { User, Shield, LogOut, Camera } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";

const SUB_NAV = [
  { key: "profile",  label: "Profile",   icon: <User   size={15} strokeWidth={1.8} /> },
  { key: "security", label: "Security",  icon: <Shield size={15} strokeWidth={1.8} /> },
];

export default function ProfilePage() {
  const [view, setView] = useState("profile");

  return (
    <ModuleLayout title="Profile" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
      {view === "profile"  && <ProfileTab />}
      {view === "security" && <SecurityTab />}
    </ModuleLayout>
  );
}

/* ── Profile Tab ──────────────────────────────── */
function ProfileTab() {
  const [form, setForm] = useState({
    firstName: "Janco",
    lastName: "Olivier",
    email: "jancoolivier06@gmail.com",
    role: "Owner",
    phone: "",
  });
  const [saved, setSaved] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setSaved(false); }
  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  const initials = `${form.firstName[0] ?? ""}${form.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div style={s.page}>
      {/* Avatar */}
      <div style={s.avatarSection}>
        <div style={s.avatarWrap}>
          <div style={s.avatar}>{initials}</div>
          <button style={s.avatarEditBtn} aria-label="Change photo">
            <Camera size={14} strokeWidth={2} color="#fff" />
          </button>
        </div>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 2px" }}>
            {form.firstName} {form.lastName}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 2px" }}>{form.email}</p>
          <span style={s.roleBadge}>{form.role}</span>
        </div>
      </div>

      {/* Form */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Personal Information</h2>
        <div style={s.grid2}>
          <Field label="First Name" value={form.firstName} onChange={v => set("firstName", v)} />
          <Field label="Last Name"  value={form.lastName}  onChange={v => set("lastName", v)} />
          <Field label="Email"      value={form.email}     onChange={v => set("email", v)} type="email" />
          <Field label="Phone"      value={form.phone}     onChange={v => set("phone", v)} type="tel" />
        </div>
        <div style={s.field}>
          <label style={s.label}>Role</label>
          <select value={form.role} onChange={e => set("role", e.target.value)} style={s.select}>
            <option>Owner</option>
            <option>Manager</option>
            <option>Operator</option>
            <option>Viewer</option>
          </select>
        </div>
      </div>

      <button onClick={save} style={s.saveBtn}>
        {saved ? "Saved ✓" : "Save Changes"}
      </button>

      {/* Danger zone */}
      <div style={s.dangerSection}>
        <h2 style={{ ...s.sectionTitle, color: "#EF4444" }}>Danger Zone</h2>
        <div style={s.dangerRow}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>Sign Out</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>Sign out of this device.</p>
          </div>
          <button style={s.dangerBtn}>
            <LogOut size={14} strokeWidth={2} />
            Sign Out
          </button>
        </div>
        <div style={s.dangerRow}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>Delete Account</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>Permanently delete your account and all data. This cannot be undone.</p>
          </div>
          <button style={{ ...s.dangerBtn, backgroundColor: "#FEE2E2", color: "#EF4444", borderColor: "#EF4444" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Security Tab ─────────────────────────────── */
function SecurityTab() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState<string | null>(null);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setMsg(null); }

  function submit() {
    if (!form.current) { setMsg("Enter your current password."); return; }
    if (form.next.length < 8) { setMsg("New password must be at least 8 characters."); return; }
    if (form.next !== form.confirm) { setMsg("Passwords don't match."); return; }
    setMsg("Password updated.");
    setForm({ current: "", next: "", confirm: "" });
  }

  return (
    <div style={s.page}>
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Change Password</h2>
        <Field label="Current Password" value={form.current} onChange={v => set("current", v)} type="password" />
        <Field label="New Password"     value={form.next}    onChange={v => set("next", v)}    type="password" />
        <Field label="Confirm Password" value={form.confirm} onChange={v => set("confirm", v)} type="password" />
        {msg && (
          <p style={{ fontSize: 13, color: msg === "Password updated." ? "var(--accent)" : "#EF4444", margin: 0 }}>{msg}</p>
        )}
        <button onClick={submit} style={s.saveBtn}>Update Password</button>
      </div>

      <div style={s.section}>
        <h2 style={s.sectionTitle}>Active Sessions</h2>
        {[
          { device: "MacBook Pro", location: "Cape Town, ZA", time: "Active now", current: true },
          { device: "iPhone 15",   location: "Cape Town, ZA", time: "2h ago",     current: false },
        ].map(sess => (
          <div key={sess.device} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>
                {sess.device}
                {sess.current && <span style={{ marginLeft: 8, fontSize: 10, backgroundColor: "rgba(245,99,0,0.12)", color: "var(--accent)", borderRadius: 99, padding: "1px 6px", fontWeight: 700 }}>THIS DEVICE</span>}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{sess.location} · {sess.time}</p>
            </div>
            {!sess.current && (
              <button style={{ fontSize: 12, color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Shared ───────────────────────────────────── */
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder="—" style={s.input} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:          { maxWidth: 560, display: "flex", flexDirection: "column", gap: 28 },
  avatarSection: { display: "flex", alignItems: "center", gap: 20, padding: "20px 24px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 },
  avatarWrap:    { position: "relative", flexShrink: 0 },
  avatar:        { width: 72, height: 72, borderRadius: "50%", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff" },
  avatarEditBtn: { position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: "50%", backgroundColor: "var(--text-secondary)", border: "2px solid var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  roleBadge:     { fontSize: 11, fontWeight: 700, backgroundColor: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 99, padding: "2px 8px", letterSpacing: "0.04em" },
  section:       { display: "flex", flexDirection: "column", gap: 14 },
  sectionTitle:  { fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 2px" },
  grid2:         { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  field:         { display: "flex", flexDirection: "column", gap: 6 },
  label:         { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" },
  input:         { height: 36, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 13, color: "var(--text-primary)", backgroundColor: "var(--bg)", outline: "none" },
  select:        { height: 36, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 13, color: "var(--text-primary)", backgroundColor: "var(--bg)", outline: "none" },
  saveBtn:       { alignSelf: "flex-start", height: 38, padding: "0 24px", backgroundColor: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  dangerSection: { display: "flex", flexDirection: "column", gap: 12, padding: "20px", backgroundColor: "#FFF5F5", borderRadius: 12, border: "1px solid #FECACA" },
  dangerRow:     { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 },
  dangerBtn:     { display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", backgroundColor: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 },
};
