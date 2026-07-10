"use client";

import { useState } from "react";
import { AlertCircle, Plus, X, Trash2 } from "lucide-react";

type StockType = "all" | "outsourced" | "internal";
type ActiveForm = "os" | "im" | null;

interface SubComponent { id: string; name: string; qty: number }

const MOCK_INVENTORY = [
  { id: "1", name: "COMPRESSION LATCH", barcode: "1111", serial: "1111", qty: 50,  min: 50, type: "Out Sourced",            supplier: "Economic motor spares", reorder: true,  cost: 100,     sale: 130     },
  { id: "2", name: "M5 WASHER SMALL",   barcode: "1111", serial: "1111", qty: 100, min: 50, type: "Out Sourced",            supplier: "Economic motor spares", reorder: false, cost: 10,      sale: 13      },
  { id: "3", name: "M5 LOCKNUT",        barcode: "1111", serial: "1111", qty: 100, min: 50, type: "Out Sourced",            supplier: "Economic motor spares", reorder: false, cost: 10,      sale: 13      },
  { id: "4", name: "M5 NUTCAP",         barcode: "1111", serial: "1111", qty: 100, min: 50, type: "Out Sourced",            supplier: "Economic motor spares", reorder: false, cost: 10,      sale: 13      },
  { id: "5", name: "E3 FRIDGE DOOR",    barcode: "1111", serial: "1111", qty: 10,  min: 5,  type: "Internally Manufactured", supplier: "—",                    reorder: false, cost: 1206.25, sale: 1568.13 },
];

export default function InventoryPage() {
  const [typeFilter, setTypeFilter] = useState<StockType>("all");
  const [search,     setSearch]     = useState("");
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);

  const filtered = MOCK_INVENTORY.filter((item) => {
    if (typeFilter === "outsourced" && item.type !== "Out Sourced") return false;
    if (typeFilter === "internal"   && item.type !== "Internally Manufactured") return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <h1 style={s.title}>Parts</h1>
        <div style={s.btnGroup}>
          <button style={s.addBtn} onClick={() => setActiveForm(activeForm === "os" ? null : "os")}>
            <Plus size={14} strokeWidth={2.5} /> OS Part
          </button>
          <button style={s.addBtn} onClick={() => setActiveForm(activeForm === "im" ? null : "im")}>
            <Plus size={14} strokeWidth={2.5} /> IM Part
          </button>
        </div>
      </div>

      <div style={s.card}>
        <FilterSection label="Filter Stock Item Type">
          <FilterChip label="Out Sourced"             active={typeFilter === "outsourced"} onClick={() => setTypeFilter(typeFilter === "outsourced" ? "all" : "outsourced")} />
          <FilterChip label="Internally Manufactured" active={typeFilter === "internal"}   onClick={() => setTypeFilter(typeFilter === "internal"   ? "all" : "internal")}   />
        </FilterSection>

        <div style={s.searchRow}>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..." style={s.search} />
        </div>

        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["#", "Part Name", "Barcode", "Serial Number", "Amount In Stock", "Minimum Threshold", "Stock Item Type", "Supplier", "Re-Order Alert", "Cost Price", "Sale Price"].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id} style={s.tr}>
                  <td style={s.td}>{i + 1}</td>
                  <td style={{ ...s.td, fontWeight: 500 }}>{item.name}</td>
                  <td style={s.td}>{item.barcode}</td>
                  <td style={s.td}>{item.serial}</td>
                  <td style={s.td}>{item.qty}</td>
                  <td style={s.td}>{item.min}</td>
                  <td style={s.td}>{item.type}</td>
                  <td style={s.td}><span style={s.supplierChip}>{item.supplier}</span></td>
                  <td style={s.td}>
                    <div style={s.alertCell}>
                      <span style={{ ...s.dot, backgroundColor: item.qty > item.min ? "var(--success)" : "var(--warning)" }} />
                      {item.qty <= item.min && <AlertCircle size={14} color="var(--danger)" />}
                    </div>
                  </td>
                  <td style={s.td}>R{item.cost.toFixed(2)}</td>
                  <td style={s.td}>R{item.sale.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


{activeForm && <div style={f.backdrop} onClick={() => setActiveForm(null)} />}
      {activeForm === "os" && <AddOSPartForm onClose={() => setActiveForm(null)} />}
      {activeForm === "im" && <AddIMPartForm onClose={() => setActiveForm(null)} />}
    </div>
  );
}

/* ── OS Part Form ───────────────────────────────────────────────── */
function AddOSPartForm({ onClose }: { onClose: () => void }) {
  const [name,          setName]          = useState("");
  const [supplier,      setSupplier]      = useState("");
  const [barcode,       setBarcode]       = useState("");
  const [serial,        setSerial]        = useState("");
  const [qty,           setQty]           = useState("");
  const [min,           setMin]           = useState("");
  const [cost,          setCost]          = useState("");
  const [sale,          setSale]          = useState("");
  const [lowStockAlert,    setLowStockAlert]    = useState(false);
  const [alertThreshold,   setAlertThreshold]   = useState("");

  return (
    <div style={f.panel}>
      <div style={f.header}>
        <span style={f.headerTitle}>Add OS Part</span>
        <button onClick={onClose} style={f.closeBtn}><X size={16} /></button>
      </div>
      <div style={f.body}>
        <Field label="Part Name *">
          <input value={name} onChange={e => setName(e.target.value)} style={f.inp} placeholder="e.g. M5 Bolt" />
        </Field>
        <Field label="Supplier">
          <input value={supplier} onChange={e => setSupplier(e.target.value)} style={f.inp} placeholder="Supplier name" />
        </Field>
        <Field label="Barcode">
          <input value={barcode} onChange={e => setBarcode(e.target.value)} style={f.inp} placeholder="Scan or enter barcode" />
        </Field>
        <Field label="Serial Number">
          <input value={serial} onChange={e => setSerial(e.target.value)} style={f.inp} placeholder="Serial number" />
        </Field>
        <div style={f.row}>
          <Field label="Qty in Stock" flex>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} style={f.inp} placeholder="0" min={0} />
          </Field>
          <Field label="Min Threshold" flex>
            <input type="number" value={min} onChange={e => setMin(e.target.value)} style={f.inp} placeholder="0" min={0} />
          </Field>
        </div>
        <div style={f.row}>
          <Field label="Cost Price (R)" flex>
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} style={f.inp} placeholder="0.00" min={0} step={0.01} />
          </Field>
          <Field label="Sale Price (R)" flex>
            <input type="number" value={sale} onChange={e => setSale(e.target.value)} style={f.inp} placeholder="0.00" min={0} step={0.01} />
          </Field>
        </div>
        <div style={f.toggleRow}>
          <span style={f.lbl}>Low Stock Alert</span>
          <Toggle on={lowStockAlert} onChange={v => { setLowStockAlert(v); if (!v) setAlertThreshold(""); }} />
        </div>
        {lowStockAlert && (
          <Field label="Alert when stock falls below">
            <input
              type="number"
              value={alertThreshold}
              onChange={e => setAlertThreshold(e.target.value)}
              style={f.inp}
              placeholder="e.g. 10"
              min={0}
              autoFocus
            />
          </Field>
        )}
      </div>
      <div style={f.footer}>
        <button onClick={onClose} style={f.cancelBtn}>Cancel</button>
        <button style={f.saveBtn}>Add Part</button>
      </div>
    </div>
  );
}

/* ── IM Part Form ───────────────────────────────────────────────── */
function AddIMPartForm({ onClose }: { onClose: () => void }) {
  const [name,       setName]       = useState("");
  const [serial,     setSerial]     = useState("");
  const [qty,        setQty]        = useState("");
  const [min,        setMin]        = useState("");
  const [taskName,   setTaskName]   = useState("");
  const [taskDesc,      setTaskDesc]      = useState("");
  const [maxTime,       setMaxTime]       = useState("");
  const [labourCost,    setLabourCost]    = useState("");
  const [components,    setComponents]    = useState<SubComponent[]>([]);
  const [compName,      setCompName]      = useState("");
  const [compQty,       setCompQty]       = useState("1");

  function addComponent() {
    if (!compName.trim()) return;
    setComponents(prev => [...prev, { id: Date.now().toString(), name: compName.trim(), qty: parseInt(compQty) || 1 }]);
    setCompName("");
    setCompQty("1");
  }

  return (
    <div style={f.panel}>
      <div style={f.header}>
        <span style={f.headerTitle}>Add IM Part</span>
        <button onClick={onClose} style={f.closeBtn}><X size={16} /></button>
      </div>
      <div style={f.body}>
        <div style={f.sectionLabel}>Part Info</div>
        <Field label="Part Name *">
          <input value={name} onChange={e => setName(e.target.value)} style={f.inp} placeholder="e.g. E3 Fridge Door" />
        </Field>
        <Field label="Serial Number">
          <input value={serial} onChange={e => setSerial(e.target.value)} style={f.inp} placeholder="Serial number" />
        </Field>
        <div style={f.row}>
          <Field label="Qty in Stock" flex>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} style={f.inp} placeholder="0" min={0} />
          </Field>
          <Field label="Min Threshold" flex>
            <input type="number" value={min} onChange={e => setMin(e.target.value)} style={f.inp} placeholder="0" min={0} />
          </Field>
        </div>
        <div style={{ ...f.sectionLabel, marginTop: 20 }}>Assembly</div>
        <Field label="Assembly Task Name">
          <input value={taskName} onChange={e => setTaskName(e.target.value)} style={f.inp} placeholder="e.g. Door Assembly" />
        </Field>
        <Field label="Description">
          <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)}
            style={{ ...f.inp, height: 72, resize: "vertical" as const }}
            placeholder="Steps to assemble this part..." />
        </Field>
        <div style={f.row}>
          <Field label="Max Time (min)" flex>
            <input type="number" value={maxTime} onChange={e => setMaxTime(e.target.value)} style={f.inp} placeholder="0" min={0} />
          </Field>
          <Field label="Labour Cost (R/hr)" flex>
            <input type="number" value={labourCost} onChange={e => setLabourCost(e.target.value)} style={f.inp} placeholder="0.00" min={0} step={0.01} />
          </Field>
        </div>

        <div style={{ ...f.sectionLabel, marginTop: 20 }}>OS Sub-Components</div>
        {components.map(c => (
          <div key={c.id} style={f.compRow}>
            <span style={f.compName}>{c.name}</span>
            <span style={f.compQty}>×{c.qty}</span>
            <button onClick={() => setComponents(prev => prev.filter(x => x.id !== c.id))} style={f.removeBtn}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <div style={f.addCompRow}>
          <input
            value={compName}
            onChange={e => setCompName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addComponent()}
            style={{ ...f.inp, flex: 1, minWidth: 0 }}
            placeholder="Part name"
          />
          <input
            type="number"
            value={compQty}
            onChange={e => setCompQty(e.target.value)}
            style={{ ...f.inp, width: 60 }}
            placeholder="Qty"
            min={1}
          />
          <button onClick={addComponent} style={f.addCompBtn}><Plus size={14} /></button>
        </div>
      </div>
      <div style={f.footer}>
        <button onClick={onClose} style={f.cancelBtn}>Cancel</button>
        <button style={f.saveBtn}>Add Part</button>
      </div>
    </div>
  );
}

/* ── Shared primitives ──────────────────────────────────────────── */
function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12, ...(flex ? { flex: 1, minWidth: 0 } : {}) }}>
      <label style={f.lbl}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{ ...f.toggle, ...(on ? f.toggleOn : {}) }}>
      <span style={{ ...f.toggleThumb, ...(on ? f.toggleThumbOn : {}) }} />
    </button>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={s.filterSection}>
      <div style={s.filterHeader}><span style={s.filterLabel}>{label}</span></div>
      <div style={s.filterChips}>{children}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ ...s.chip, ...(active ? s.chipActive : {}) }}>
      {label}
    </button>
  );
}

/* ── Page styles ────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page:         { position: "relative", display: "flex", flexDirection: "column", gap: 16 },
  topBar:       { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title:        { fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-pixel-square)" },
  btnGroup:     { display: "flex", gap: 8 },
  addBtn:       { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", backgroundColor: "var(--btn-primary)", color: "var(--btn-primary-text, #fff)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  card:         { backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden" },
  filterSection:{ padding: "16px 20px", borderBottom: "1px solid var(--border)" },
  filterHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  filterLabel:  { fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" },
  filterChips:  { display: "flex", gap: 8, flexWrap: "wrap" },
  chip:         { padding: "6px 14px", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: "var(--radius-full, 9999px)", backgroundColor: "transparent", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" },
  chipActive:   { backgroundColor: "var(--accent)", color: "#fff", borderColor: "var(--accent)" },
  searchRow:    { padding: "12px 20px", borderBottom: "1px solid var(--border)" },
  search:       { width: 280, height: 36, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--bg)", outline: "none" },
  tableWrap:    { overflowX: "auto" },
  table:        { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th:           { padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)", whiteSpace: "nowrap" },
  tr:           { borderBottom: "1px solid var(--border)" },
  td:           { padding: "11px 14px", fontSize: 13, color: "var(--text-primary)", whiteSpace: "nowrap" },
  supplierChip: { fontSize: 11, backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px" },
  alertCell:    { display: "flex", alignItems: "center", gap: 6 },
  dot:          { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },

};

/* ── Drawer / form styles ───────────────────────────────────────── */
const f: Record<string, React.CSSProperties> = {
  backdrop:      { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", zIndex: 100 },
  panel:         { position: "fixed", top: 0, right: 0, bottom: 0, width: 380, backgroundColor: "var(--surface)", borderLeft: "1px solid var(--border)", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)", zIndex: 101, display: "flex", flexDirection: "column" },
  header:        { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 },
  headerTitle:   { fontSize: 15, fontWeight: 700, color: "var(--text-primary)" },
  closeBtn:      { background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", padding: 4 },
  body:          { flex: 1, overflowY: "auto", padding: "20px 20px 0" },
  footer:        { padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0 },
  sectionLabel:  { fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 },
  lbl:           { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" },
  inp:           { width: "100%", height: 34, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0 10px", fontSize: 13, color: "var(--text-primary)", backgroundColor: "var(--bg)", outline: "none", boxSizing: "border-box" },
  row:           { display: "flex", gap: 10 },
  toggleRow:     { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  toggle:        { width: 36, height: 20, borderRadius: 10, backgroundColor: "var(--border)", border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" },
  toggleOn:      { backgroundColor: "var(--accent)" },
  toggleThumb:   { position: "absolute", top: 2, left: 2, width: 16, height: 16, borderRadius: "50%", backgroundColor: "#fff", transition: "left 0.2s" },
  toggleThumbOn: { left: 18 },
  compRow:       { display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 6 },
  compName:      { flex: 1, fontSize: 13, color: "var(--text-primary)" },
  compQty:       { fontSize: 12, color: "var(--text-secondary)", minWidth: 28 },
  removeBtn:     { background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex", alignItems: "center", padding: 2 },
  addCompRow:    { display: "flex", gap: 8, marginBottom: 20, alignItems: "center" },
  addCompBtn:    { height: 34, width: 34, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", flexShrink: 0 },
  cancelBtn:     { flex: 1, height: 36, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" },
  saveBtn:       { flex: 2, height: 36, backgroundColor: "var(--btn-primary)", color: "var(--btn-primary-text, #fff)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};
