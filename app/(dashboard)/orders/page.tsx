"use client";

import { useState } from "react";
import { CalendarDays, Plus, Calendar } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";
import { MultiInput } from "@/components/ui/multi-input";

const SUB_NAV = [
  { key: "list",     label: "Orders",           icon: <CalendarDays size={15} strokeWidth={1.8} /> },
  { key: "add",      label: "Add Orders",        icon: <Plus size={15} strokeWidth={2} /> },
  { key: "calendar", label: "Calendar",          icon: <Calendar size={15} strokeWidth={1.8} /> },
  { key: "annual",   label: "Annual Calendar",   icon: <Calendar size={15} strokeWidth={1.8} /> },
];

const MOCK_ORDERS = [
  {
    id: "1", client: "Divan Oelerman", product: "Ingane - 1.0",
    status: "In Progress", progress: 0, email: "divanoelerman@gmail.com",
    cell: "0987645634", address: "Still Bay West", start: "Mon 25 August, 2025", end: "Thu 14 May, 2026",
  },
];

export default function OrdersPage() {
  const [view, setView] = useState("list");
  const [newClientMode, setNewClientMode] = useState(false);
  const [form, setForm] = useState({
    client_id: "", new_client_name: "", new_client_address: "",
    new_client_emails: [] as string[], new_client_cells: [] as string[],
    product_id: "", option_ids: [] as string[],
    start_date: "", end_date: "",
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ModuleLayout title="Orders" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
      {view === "list"     && <OrderList />}
      {view === "add"      && <AddOrderForm form={form} set={set} newClientMode={newClientMode} setNewClientMode={setNewClientMode} />}
      {view === "calendar" && <CalendarView />}
      {view === "annual"   && <AnnualCalendarView />}
    </ModuleLayout>
  );
}

/* ── Order List ─────────────────────────────────────── */
function OrderList() {
  const [selected, setSelected] = useState<string | null>(null);
  const order = MOCK_ORDERS.find((o) => o.id === selected);

  if (selected && order) {
    return <OrderDetail order={order} onBack={() => setSelected(null)} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input placeholder="Search..." style={s.search} />
      {MOCK_ORDERS.map((o) => (
        <div key={o.id} style={s.orderCard} onClick={() => setSelected(o.id)}>
          <div style={s.orderTop}>
            <span style={s.orderClient}>{o.client}</span>
            <ProgressRing pct={o.progress} />
          </div>
          <div style={s.orderMeta}>
            <span>Email: {o.email}</span>
            <span>Cell: {o.cell}</span>
            <span>Address: {o.address}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 22, c = 2 * Math.PI * r;
  return (
    <div style={s.ring}>
      <svg width={54} height={54} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={27} cy={27} r={r} fill="none" stroke="var(--accent-light, #ede9fe)" strokeWidth={5} />
        <circle cx={27} cy={27} r={r} fill="none" stroke="var(--accent)" strokeWidth={5}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
      </svg>
      <span style={s.ringPct}>{pct}%</span>
    </div>
  );
}

/* ── Order Detail ───────────────────────────────────── */
function OrderDetail({ order, onBack }: { order: typeof MOCK_ORDERS[0]; onBack: () => void }) {
  return (
    <div>
      <div style={s.detailHeader}>
        <button onClick={onBack} style={s.backBtn}>← Back</button>
      </div>
      <div style={s.detailCard}>
        <div style={s.detailLeft}>
          <ProgressRingLarge pct={order.progress} />
          <p style={s.detailTime}>Total: 15 min | Remaining: 15 min</p>
        </div>
        <div style={s.detailCenter}>
          <div style={s.detailNum}>1</div>
          <div style={s.detailProduct}>{order.product}</div>
          <button style={s.statusBtn}>{order.status}</button>
          <button style={s.bomBtn}>BOM</button>
        </div>
        <div style={s.detailRight}>
          <span style={s.detailClientName}>{order.client}</span>
          <div style={s.detailDates}>
            <span style={s.detailDate}>{order.start} <span style={s.dateLabel}>Start Date</span></span>
            <span style={s.detailDate}>{order.end} <span style={s.dateLabel}>End Date</span></span>
          </div>
        </div>
      </div>

      <div style={s.stationsSection}>
        <div style={s.stationsHeader}>
          <span style={s.stationsTitle}>Order&apos;s Stations</span>
        </div>
        {["Prep Station", "Station 1", "Station 2"].map((st) => (
          <div key={st} style={s.stationRow}>
            <span style={s.stationArrow}>›</span>
            <span style={s.stationName}>{st}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressRingLarge({ pct }: { pct: number }) {
  const r = 70, c = 2 * Math.PI * r;
  return (
    <div style={s.ringLarge}>
      <svg width={160} height={160} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={80} cy={80} r={r} fill="none" stroke="var(--accent-light, #ede9fe)" strokeWidth={14} />
        <circle cx={80} cy={80} r={r} fill="none" stroke="var(--accent)" strokeWidth={14}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
      </svg>
      <span style={s.ringLargePct}>{pct}% <br /><span style={{ fontSize: 13, fontWeight: 400 }}>Progress</span></span>
    </div>
  );
}

/* ── Add Order Form ─────────────────────────────────── */
function AddOrderForm({ form, set, newClientMode, setNewClientMode }: {
  form: ReturnType<typeof Object.create>;
  set: (k: string, v: unknown) => void;
  newClientMode: boolean;
  setNewClientMode: (v: boolean) => void;
}) {
  return (
    <div style={s.addForm}>
      <h3 style={s.addTitle}>New Order</h3>

      <div style={s.field}>
        <label style={s.label}>Client*</label>
        <div style={s.row}>
          <select value={form.client_id} onChange={(e) => set("client_id", e.target.value)} style={s.select}>
            <option value="">Choose a client...</option>
          </select>
          <button type="button" onClick={() => setNewClientMode(!newClientMode)} style={s.newClientBtn}>
            {newClientMode ? "Cancel" : "Create New"}
          </button>
        </div>
      </div>

      {newClientMode && (
        <div style={s.newClientBlock}>
          <Field label="New Client Name*" value={form.new_client_name} onChange={(v) => set("new_client_name", v)} />
          <Field label="New Client Address" value={form.new_client_address} onChange={(v) => set("new_client_address", v)} />
          <MultiInput label="Email Addresses" values={form.new_client_emails}
            onChange={(v) => set("new_client_emails", v)} placeholder="Type here..." type="email" />
          <MultiInput label="Cell Numbers" values={form.new_client_cells}
            onChange={(v) => set("new_client_cells", v)} placeholder="Type here..." type="tel" />
        </div>
      )}

      <div style={s.field}>
        <label style={s.label}>Product*</label>
        <select value={form.product_id} onChange={(e) => set("product_id", e.target.value)} style={s.select}>
          <option value="">Choose a product...</option>
        </select>
      </div>

      <div style={s.dateRow}>
        <div style={s.field}>
          <label style={s.label}>Start Date</label>
          <input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} style={s.input} />
        </div>
        <div style={s.field}>
          <label style={s.label}>End Date</label>
          <input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} style={s.input} />
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <button style={s.saveBtn}>Save</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <input value={value} placeholder="Type here..."
        onChange={(e) => onChange(e.target.value)} style={s.input} />
    </div>
  );
}

function CalendarView()       { return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Calendar view coming soon.</p>; }
function AnnualCalendarView() { return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Annual calendar view coming soon.</p>; }

const s: Record<string, React.CSSProperties> = {
  search: { width: 280, height: 36, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--bg)", outline: "none", marginBottom: 8 },
  orderCard: { border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16, cursor: "pointer", backgroundColor: "var(--surface)" },
  orderTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  orderClient: { fontSize: 16, fontWeight: 600, color: "var(--text-primary)" },
  orderMeta: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--text-secondary)" },
  ring: { position: "relative", width: 54, height: 54, display: "flex", alignItems: "center", justifyContent: "center" },
  ringPct: { position: "absolute", fontSize: 12, fontWeight: 700, color: "var(--accent)" },
  detailHeader: { marginBottom: 16 },
  backBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 14, fontWeight: 500 },
  detailCard: { display: "flex", gap: 24, padding: 24, backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: 16, alignItems: "center" },
  detailLeft: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  detailTime: { fontSize: 12, color: "var(--text-secondary)" },
  detailCenter: { flex: 1, display: "flex", flexDirection: "column", gap: 12 },
  detailNum: { fontSize: 28, fontWeight: 700, color: "var(--text-primary)" },
  detailProduct: { fontSize: 18, fontWeight: 600, color: "var(--text-primary)" },
  statusBtn: { width: "100%", padding: "10px 0", backgroundColor: "var(--text-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  bomBtn: { alignSelf: "flex-start", padding: "8px 20px", backgroundColor: "var(--text-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  detailRight: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" },
  detailClientName: { fontSize: 16, fontWeight: 700, color: "var(--text-primary)" },
  detailDates: { display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" },
  detailDate: { fontSize: 16, fontWeight: 700, color: "var(--text-primary)" },
  dateLabel: { fontSize: 11, fontWeight: 400, color: "var(--text-secondary)" },
  ringLarge: { position: "relative", width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center" },
  ringLargePct: { position: "absolute", fontSize: 22, fontWeight: 700, color: "var(--accent)", textAlign: "center", lineHeight: 1.3 },
  stationsSection: { backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" },
  stationsHeader: { padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 },
  stationsTitle: { fontSize: 15, fontWeight: 600, color: "var(--text-primary)" },
  stationRow: { display: "flex", alignItems: "center", gap: 10, padding: "13px 20px", borderBottom: "1px solid var(--border)", cursor: "pointer" },
  stationArrow: { fontSize: 16, color: "var(--text-secondary)" },
  stationName: { fontSize: 14, color: "var(--text-primary)" },
  addForm: { display: "flex", flexDirection: "column", gap: 20, maxWidth: 500 },
  addTitle: { fontSize: 18, fontWeight: 600, color: "var(--text-primary)" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input: { height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none" },
  select: { flex: 1, height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none" },
  row: { display: "flex", gap: 8, alignItems: "center" },
  dateRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  newClientBlock: { display: "flex", flexDirection: "column", gap: 16, padding: 16, backgroundColor: "var(--bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" },
  newClientBtn: { padding: "0 14px", height: 38, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap" },
  saveBtn: { height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
