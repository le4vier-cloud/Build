"use client";

import { useState } from "react";
import { Building2, Palette, Bell, CreditCard, Link2 } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";
import { useTheme } from "@/hooks/useTheme";
import AccountingIntegrationPanel from "@/components/settings/AccountingIntegrationPanel";

const SUB_NAV = [
  { key: "company",       label: "Company",      icon: <Building2  size={15} strokeWidth={1.8} /> },
  { key: "appearance",    label: "Appearance",   icon: <Palette    size={15} strokeWidth={1.8} /> },
  { key: "notifications", label: "Notifications",icon: <Bell       size={15} strokeWidth={1.8} /> },
  { key: "plan",          label: "Plan",         icon: <CreditCard size={15} strokeWidth={1.8} /> },
  { key: "integrations",  label: "Integrations", icon: <Link2      size={15} strokeWidth={1.8} /> },
];

export default function SettingsPage() {
  const [view, setView] = useState("company");

  return (
    <ModuleLayout title="Settings" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
      {view === "company"       && <CompanySettings />}
      {view === "appearance"    && <AppearanceSettings />}
      {view === "notifications" && <NotificationSettings />}
      {view === "plan"          && <PlanSettings />}
      {view === "integrations"  && <IntegrationsSettings />}
    </ModuleLayout>
  );
}

/* ── Company ──────────────────────────────────── */
function CompanySettings() {
  const [form, setForm] = useState({
    name: "My Company",
    address: "",
    city: "",
    country: "South Africa",
    currency: "ZAR",
    vat: "",
    phone: "",
    email: "",
  });
  const [saved, setSaved] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setSaved(false); }
  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  return (
    <div style={s.page}>
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Company Information</h2>
        <div style={s.grid2}>
          <Field label="Company Name" value={form.name}     onChange={v => set("name", v)} />
          <Field label="VAT Number"   value={form.vat}      onChange={v => set("vat", v)} />
          <Field label="Email"        value={form.email}    onChange={v => set("email", v)} />
          <Field label="Phone"        value={form.phone}    onChange={v => set("phone", v)} />
          <Field label="Address"      value={form.address}  onChange={v => set("address", v)} />
          <Field label="City"         value={form.city}     onChange={v => set("city", v)} />
        </div>
        <div style={s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Country</label>
            <select value={form.country} onChange={e => set("country", e.target.value)} style={s.select}>
              <option>South Africa</option>
              <option>United States</option>
              <option>United Kingdom</option>
              <option>Australia</option>
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Currency</label>
            <select value={form.currency} onChange={e => set("currency", e.target.value)} style={s.select}>
              <option value="ZAR">ZAR — South African Rand</option>
              <option value="USD">USD — US Dollar</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
        </div>
      </div>

      <div style={s.section}>
        <h2 style={s.sectionTitle}>Company Logo</h2>
        <div style={s.logoRow}>
          <div style={s.logoPlaceholder}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-tertiary)" }}>MC</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button style={s.uploadBtn}>Upload Logo</button>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}>PNG or SVG, max 2MB. Shown in the header.</p>
          </div>
        </div>
      </div>

      <button onClick={save} style={s.saveBtn}>
        {saved ? <><Check size={14} /> Saved</> : "Save Changes"}
      </button>
    </div>
  );
}

/* ── Appearance ───────────────────────────────── */
function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  return (
    <div style={s.page}>
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Theme</h2>
        <div style={{ display: "flex", gap: 12 }}>
          {(["system", "light", "dark"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                flex: 1,
                padding: "20px 16px",
                borderRadius: 10,
                borderWidth: 2,
                borderStyle: "solid",
                borderColor: theme === t ? "var(--accent)" : "var(--border)",
                backgroundColor: theme === t ? "rgba(245,99,0,0.06)" : "var(--surface)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{
                width: 48,
                height: 32,
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: t === "light" ? "#fff" : t === "dark" ? "#111" : "linear-gradient(135deg,#111 50%,#fff 50%)",
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: theme === t ? "var(--accent)" : "var(--text-primary)", textTransform: "capitalize" }}>{t}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={s.section}>
        <h2 style={s.sectionTitle}>Density</h2>
        <div style={{ display: "flex", gap: 12 }}>
          {(["comfortable", "compact"] as const).map(d => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: 10,
                borderWidth: 2,
                borderStyle: "solid",
                borderColor: density === d ? "var(--accent)" : "var(--border)",
                backgroundColor: density === d ? "rgba(245,99,0,0.06)" : "var(--surface)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: density === d ? "var(--accent)" : "var(--text-primary)", textTransform: "capitalize" }}>{d}</span>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0" }}>
                {d === "comfortable" ? "More spacing, easier to scan" : "Tighter rows, more content visible"}
              </p>
            </button>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 8 }}>Theme and density preferences are saved per-device.</p>
    </div>
  );
}

/* ── Notifications ────────────────────────────── */
function NotificationSettings() {
  const [prefs, setPrefs] = useState({
    low_stock: true,
    new_order: true,
    task_complete: false,
    plan_saved: false,
    weekly_summary: true,
  });
  const toggle = (k: keyof typeof prefs) => setPrefs(p => ({ ...p, [k]: !p[k] }));

  const items = [
    { key: "low_stock"      as const, label: "Low Stock Alerts",    desc: "When a part or tool drops below minimum stock" },
    { key: "new_order"      as const, label: "New Orders",          desc: "When a client order is placed or updated" },
    { key: "task_complete"  as const, label: "Task Completions",    desc: "When a production task is marked complete" },
    { key: "plan_saved"     as const, label: "Plan Changes",        desc: "When a production plan is saved or modified" },
    { key: "weekly_summary" as const, label: "Weekly Summary",      desc: "A digest of the week's production activity" },
  ];

  return (
    <div style={s.page}>
      <div style={s.section}>
        <h2 style={s.sectionTitle}>In-App Notifications</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {items.map((item, i) => (
            <div key={item.key} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 0",
              borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>{item.label}</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{item.desc}</p>
              </div>
              <Toggle on={prefs[item.key]} onChange={() => toggle(item.key)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Plan ─────────────────────────────────────── */
const PLANS = [
  {
    key: "minimal",
    name: "MINIMAL",
    price: "R 650",
    highlight: false,
    features: ["1 user", "Up to 5 products", "50 orders/mo", "Email support"],
    cta: "Current plan",
    current: true,
  },
  {
    key: "basic",
    name: "BASIC",
    price: "R 3,000",
    highlight: true,
    features: ["5 users", "Up to 30 products", "500 orders/mo", "Priority support"],
    cta: "Upgrade to Basic",
    current: false,
  },
  {
    key: "professional",
    name: "PROFESSIONAL",
    price: "R 8,000",
    highlight: false,
    features: ["Unlimited users", "Unlimited products", "Unlimited orders", "Dedicated support + SLA"],
    cta: "Upgrade to Professional",
    current: false,
  },
];

function PlanSettings() {
  return (
    <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Pricing grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        backgroundColor: "var(--surface)",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid var(--border)",
      }}>
        {PLANS.map((plan, i) => (
          <div
            key={plan.key}
            style={{
              padding: "32px 28px",
              borderRight: i < PLANS.length - 1 ? "1px solid var(--border)" : "none",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              marginBottom: 16,
            }}>
              {plan.name}
              {plan.current && (
                <span style={{ marginLeft: 8, color: "var(--accent)" }}>✦</span>
              )}
            </span>

            <div style={{ display: "flex", alignItems: "baseline", gap: 0, marginBottom: 32 }}>
              <span style={{
                fontSize: 36,
                fontWeight: 700,
                color: plan.highlight ? "var(--accent)" : "var(--text-primary)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}>
                {plan.price}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-tertiary)", marginLeft: 4, fontWeight: 500 }}>/mo</span>
            </div>

            <ul style={{ margin: "0 0 28px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {plan.features.map(f => (
                <li key={f} style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={13} color={plan.current ? "var(--text-tertiary)" : "var(--accent)"} strokeWidth={2} />
                  {f}
                </li>
              ))}
            </ul>

            <button style={{
              marginTop: "auto",
              height: 38,
              backgroundColor: plan.current ? "transparent" : plan.highlight ? "var(--btn-primary)" : "var(--bg)",
              color: plan.current ? "var(--text-tertiary)" : plan.highlight ? "var(--btn-primary-text, #fff)" : "var(--text-primary)",
              border: plan.current || !plan.highlight ? "1px solid var(--border)" : "none",
              borderRadius: "var(--radius-full, 9999px)",
              fontSize: 13,
              fontWeight: 600,
              cursor: plan.current ? "default" : "pointer",
            }}>
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Usage summary */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Usage — Minimal</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Users",          value: "1 / 1 seat" },
            { label: "Products",       value: "3 / 5" },
            { label: "Orders / month", value: "2 / 50" },
          ].map(row => (
            <div key={row.label} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              backgroundColor: "var(--bg)",
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Shared ───────────────────────────────────── */
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="—" style={s.input} />
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        backgroundColor: on ? "var(--accent)" : "var(--border)",
        border: "none",
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        transition: "background-color 0.2s",
      }}
    >
      <span style={{
        position: "absolute",
        top: 3,
        left: on ? 21 : 3,
        width: 16,
        height: 16,
        borderRadius: "50%",
        backgroundColor: "#fff",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:         { maxWidth: 640, display: "flex", flexDirection: "column", gap: 28 },
  section:      { display: "flex", flexDirection: "column", gap: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 },
  grid2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  field:        { display: "flex", flexDirection: "column", gap: 6 },
  label:        { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" },
  input:        { height: 36, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 13, color: "var(--text-primary)", backgroundColor: "var(--bg)", outline: "none" },
  select:       { height: 36, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 13, color: "var(--text-primary)", backgroundColor: "var(--bg)", outline: "none" },
  logoRow:      { display: "flex", alignItems: "center", gap: 20 },
  logoPlaceholder: { width: 80, height: 80, borderRadius: 12, backgroundColor: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  uploadBtn:    { height: 34, padding: "0 16px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg)", color: "var(--text-primary)", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  saveBtn:      { alignSelf: "flex-start", height: 38, padding: "0 24px", backgroundColor: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
};

function IntegrationsSettings() {
  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>Accounting</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
          Connect your accounting software. When an order is completed, Build will automatically
          create the client invoice in your account. Your credentials are stored securely
          on our servers and never sent to the browser.
        </p>
        <AccountingIntegrationPanel source="build" />
      </div>
    </div>
  );
}
