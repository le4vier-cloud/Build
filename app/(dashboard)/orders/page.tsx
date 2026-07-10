"use client";

import { useState } from "react";
import { CalendarDays, Plus, Calendar } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";
import { RightPanel } from "@/components/ui/right-panel";
import { MultiInput } from "@/components/ui/multi-input";
import { SectionFilter } from "@/components/ui/section-filter";
import { RangeHistogram } from "@/components/ui/range-histogram";
import { useSelection } from "@/hooks/useSelection";
import { SelectCheckbox } from "@/components/ui/select-checkbox";
import { RowActions } from "@/components/ui/row-actions";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { exportToCsv } from "@/lib/csv-export";

const SUB_NAV = [
  { key: "list",     label: "Orders",         icon: <CalendarDays size={15} strokeWidth={1.8} /> },
  { key: "calendar", label: "Calendar",       icon: <Calendar     size={15} strokeWidth={1.8} /> },
  { key: "annual",   label: "Annual Calendar",icon: <Calendar     size={15} strokeWidth={1.8} /> },
];

type Order = {
  id: string; client: string; product: string;
  status: string; progress: number;
  email: string; cell: string; address: string;
  start: string; end: string;
};

const MOCK_ORDERS: Order[] = [
  {
    id: "1", client: "Divan Oelerman", product: "Ingane - 1.0",
    status: "In Progress", progress: 35, email: "divanoelerman@gmail.com",
    cell: "098 764 5634", address: "Still Bay West", start: "Mon 25 August, 2025", end: "Thu 14 May, 2026",
  },
  {
    id: "2", client: "Marlene Kruger", product: "Ingane - 1.0",
    status: "Completed", progress: 100, email: "marlene.k@gmail.com",
    cell: "082 456 7890", address: "Cape Town", start: "Mon 3 March, 2025", end: "Fri 20 June, 2025",
  },
  {
    id: "3", client: "Riaan Botha", product: "Standard Build",
    status: "Awaiting Parts", progress: 10, email: "riaan.botha@outlook.com",
    cell: "083 112 2334", address: "Worcester", start: "Mon 6 January, 2026", end: "Fri 10 July, 2026",
  },
  {
    id: "4", client: "Sarah Naidoo", product: "Ingane - 1.0",
    status: "In Progress", progress: 62, email: "sarah.naidoo@gmail.com",
    cell: "071 998 4432", address: "Stellenbosch", start: "Mon 12 January, 2026", end: "Fri 8 May, 2026",
  },
];

export default function OrdersPage() {
  const [view, setView]           = useState("list");
  const [orders, setOrders]       = useState<Order[]>(MOCK_ORDERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [newClientMode, setNewClientMode] = useState(false);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [progressRange, setProgressRange] = useState<[number, number]>([0, 100]);
  const [form, setForm] = useState({
    client_id: "", new_client_name: "", new_client_address: "",
    new_client_emails: [] as string[], new_client_cells: [] as string[],
    product_id: "", option_ids: [] as string[],
    start_date: "", end_date: "",
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const sel = useSelection<string>();

  const statuses = Array.from(new Set(orders.map(o => o.status)));

  const filtered = orders.filter(o => {
    if (search && !`${o.client} ${o.product}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    if (o.progress < progressRange[0] || o.progress > progressRange[1]) return false;
    return true;
  });

  function handleSave() {
    setPanelOpen(false);
  }

  function deleteOne(id: string) {
    if (!window.confirm("Delete this order?")) return;
    setOrders(prev => prev.filter(o => o.id !== id));
    sel.clear();
  }

  function deleteSelected() {
    setOrders(prev => prev.filter(o => !sel.isSelected(o.id)));
    sel.clear();
  }

  function exportSelected() {
    const rows = orders.filter(o => sel.isSelected(o.id));
    exportToCsv("orders", rows.map(o => ({
      Client: o.client, Product: o.product, Status: o.status, Progress: o.progress,
      Email: o.email, Cell: o.cell, Address: o.address, Start: o.start, End: o.end,
    })));
  }

  return (
    <>
      <ModuleLayout title="Orders" subNav={SUB_NAV} activeView={view} onViewChange={setView} onBackgroundClick={view === "list" ? sel.clear : undefined}>
        {view === "list"     && (
          <OrderList
            orders={filtered}
            onAdd={() => setPanelOpen(true)}
            onDelete={deleteOne}
            sel={sel}
            search={search}
            onSearchChange={setSearch}
            statuses={statuses}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            progressRange={progressRange}
            onProgressRangeChange={setProgressRange}
            allProgress={orders.map(o => o.progress)}
          />
        )}
        {view === "calendar" && <CalendarView />}
        {view === "annual"   && <AnnualCalendarView />}
      </ModuleLayout>

      <RightPanel open={panelOpen} onClose={() => setPanelOpen(false)} title="New Order">
        <div style={s.panelForm}>
          <div style={s.field}>
            <label style={s.label}>Client *</label>
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
              <Field label="New Client Name *" value={form.new_client_name} onChange={(v) => set("new_client_name", v)} />
              <Field label="Address"           value={form.new_client_address} onChange={(v) => set("new_client_address", v)} />
              <MultiInput label="Email Addresses" values={form.new_client_emails}
                onChange={(v) => set("new_client_emails", v)} placeholder="Type here..." type="email" />
              <MultiInput label="Cell Numbers" values={form.new_client_cells}
                onChange={(v) => set("new_client_cells", v)} placeholder="Type here..." type="tel" />
            </div>
          )}

          <div style={s.field}>
            <label style={s.label}>Product *</label>
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

          <button onClick={handleSave} style={s.saveBtn}>Save</button>
        </div>
      </RightPanel>

      {!panelOpen && (
        <BulkActionBar
          count={sel.count}
          entityLabel="order"
          onExport={exportSelected}
          onDelete={deleteSelected}
          onClear={sel.clear}
        />
      )}
    </>
  );
}

/* ── Order List ─────────────────────────────────────── */
function OrderList({
  orders, onAdd, onDelete, sel, search, onSearchChange,
  statuses, statusFilter, onStatusFilterChange, progressRange, onProgressRangeChange, allProgress,
}: {
  orders: Order[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  sel: ReturnType<typeof useSelection<string>>;
  search: string;
  onSearchChange: (v: string) => void;
  statuses: string[];
  statusFilter: string | null;
  onStatusFilterChange: (v: string | null) => void;
  progressRange: [number, number];
  onProgressRangeChange: (v: [number, number]) => void;
  allProgress: number[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openOrder = orders.find((o) => o.id === openId);

  if (openId && openOrder) {
    return <OrderDetail order={openOrder} onBack={() => setOpenId(null)} />;
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) sel.clear(); }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SectionFilter
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="Search client or product..."
          active={!!statusFilter || progressRange[0] > 0 || progressRange[1] < 100}
        >
          <RangeHistogram
            label="Progress"
            values={allProgress}
            min={0} max={100}
            value={progressRange}
            onChange={onProgressRangeChange}
            format={(n) => `${n}%`}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {statuses.map(st => (
                <button
                  key={st}
                  onClick={() => onStatusFilterChange(statusFilter === st ? null : st)}
                  style={{
                    padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${statusFilter === st ? "var(--accent)" : "var(--border)"}`,
                    backgroundColor: statusFilter === st ? "var(--accent)" : "transparent",
                    color: statusFilter === st ? "#fff" : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </SectionFilter>
      </div>

      {orders.map((o) => (
        <OrderCard key={o.id} order={o} onOpen={() => setOpenId(o.id)} onDelete={onDelete} sel={sel} />
      ))}

      <button
        onClick={onAdd}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", padding: "10px", borderRadius: 8,
          border: "1.5px dashed var(--border)", backgroundColor: "transparent",
          color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <Plus size={15} /> Add Order
      </button>
    </div>
  );
}

function OrderCard({ order, onOpen, onDelete, sel }: {
  order: Order;
  onOpen: () => void;
  onDelete: (id: string) => void;
  sel: ReturnType<typeof useSelection<string>>;
}) {
  const [hovered, setHovered] = useState(false);
  const selected = sel.isSelected(order.id);

  return (
    <div
      style={s.orderCard}
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <SelectCheckbox checked={selected} visible={hovered || sel.count > 0} onChange={() => sel.toggle(order.id)} />
        <div style={{ flex: 1 }}>
          <div style={s.orderTop}>
            <span style={s.orderClient}>{order.client}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RowActions visible={hovered} onDelete={() => onDelete(order.id)} />
              <ProgressRing pct={order.progress} />
            </div>
          </div>
          <div style={s.orderMeta}>
            <span>Email: {order.email}</span>
            <span>Cell: {order.cell}</span>
            <span>Address: {order.address}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 22, c = 2 * Math.PI * r;
  return (
    <div style={s.ring}>
      <svg width={54} height={54} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={27} cy={27} r={r} fill="none" stroke="var(--border)" strokeWidth={5} />
        <circle cx={27} cy={27} r={r} fill="none" stroke="var(--accent)" strokeWidth={5}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
      </svg>
      <span style={s.ringPct}>{pct}%</span>
    </div>
  );
}

/* ── Order Detail ───────────────────────────────────── */
function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
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
        <circle cx={80} cy={80} r={r} fill="none" stroke="var(--border)" strokeWidth={14} />
        <circle cx={80} cy={80} r={r} fill="none" stroke="var(--accent)" strokeWidth={14}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
      </svg>
      <span style={s.ringLargePct}>{pct}% <br /><span style={{ fontSize: 13, fontWeight: 400 }}>Progress</span></span>
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
  search:         { width: 280, height: 36, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--bg)", outline: "none", marginBottom: 8 },
  orderCard:      { border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16, cursor: "pointer", backgroundColor: "var(--surface)" },
  orderTop:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  orderClient:    { fontSize: 16, fontWeight: 600, color: "var(--text-primary)" },
  orderMeta:      { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--text-secondary)" },
  ring:           { position: "relative", width: 54, height: 54, display: "flex", alignItems: "center", justifyContent: "center" },
  ringPct:        { position: "absolute", fontSize: 12, fontWeight: 700, color: "var(--accent)" },
  detailHeader:   { marginBottom: 16 },
  backBtn:        { background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 14, fontWeight: 500 },
  detailCard:     { display: "flex", gap: 24, padding: 24, backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: 16, alignItems: "center" },
  detailLeft:     { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  detailTime:     { fontSize: 12, color: "var(--text-secondary)" },
  detailCenter:   { flex: 1, display: "flex", flexDirection: "column", gap: 12 },
  detailNum:      { fontSize: 28, fontWeight: 700, color: "var(--text-primary)" },
  detailProduct:  { fontSize: 18, fontWeight: 600, color: "var(--text-primary)" },
  statusBtn:      { width: "100%", padding: "10px 0", backgroundColor: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  bomBtn:         { alignSelf: "flex-start", padding: "8px 20px", backgroundColor: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  detailRight:    { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" },
  detailClientName:{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" },
  detailDates:    { display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" },
  detailDate:     { fontSize: 16, fontWeight: 700, color: "var(--text-primary)" },
  dateLabel:      { fontSize: 11, fontWeight: 400, color: "var(--text-secondary)" },
  ringLarge:      { position: "relative", width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center" },
  ringLargePct:   { position: "absolute", fontSize: 22, fontWeight: 700, color: "var(--accent)", textAlign: "center", lineHeight: 1.3 },
  stationsSection:{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" },
  stationsHeader: { padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 },
  stationsTitle:  { fontSize: 15, fontWeight: 600, color: "var(--text-primary)" },
  stationRow:     { display: "flex", alignItems: "center", gap: 10, padding: "13px 20px", borderBottom: "1px solid var(--border)", cursor: "pointer" },
  stationArrow:   { fontSize: 16, color: "var(--text-secondary)" },
  stationName:    { fontSize: 14, color: "var(--text-primary)" },
  panelForm:      { display: "flex", flexDirection: "column", gap: 20 },
  field:          { display: "flex", flexDirection: "column", gap: 6 },
  label:          { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input:          { height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none", width: "100%" },
  select:         { flex: 1, height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none" },
  row:            { display: "flex", gap: 8, alignItems: "center" },
  dateRow:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  newClientBlock: { display: "flex", flexDirection: "column", gap: 16, padding: 16, backgroundColor: "var(--bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" },
  newClientBtn:   { padding: "0 14px", height: 38, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap" as const },
  saveBtn:        { height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8 },
};
