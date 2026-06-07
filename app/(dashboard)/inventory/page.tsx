"use client";

import { useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

type StockType = "all" | "outsourced" | "internal";

const MOCK_INVENTORY = [
  { id: "1", name: "COMPRESSION LATCH", barcode: "1111", serial: "1111", qty: 50, min: 50, type: "Out Sourced", supplier: "Economic motor spares", reorder: true, cost: 100, sale: 130 },
  { id: "2", name: "M5 WASHER SMALL",   barcode: "1111", serial: "1111", qty: 100, min: 50, type: "Out Sourced", supplier: "Economic motor spares", reorder: false, cost: 10, sale: 13 },
  { id: "3", name: "M5 LOCKNUT",        barcode: "1111", serial: "1111", qty: 100, min: 50, type: "Out Sourced", supplier: "Economic motor spares", reorder: false, cost: 10, sale: 13 },
  { id: "4", name: "M5 NUTCAP",         barcode: "1111", serial: "1111", qty: 100, min: 50, type: "Out Sourced", supplier: "Economic motor spares", reorder: false, cost: 10, sale: 13 },
  { id: "5", name: "E3 FRIDGE DOOR",    barcode: "1111", serial: "1111", qty: 10, min: 5, type: "Internally Manufactured", supplier: "—", reorder: false, cost: 1206.25, sale: 1568.13 },
];

const LOW_STOCK_ALERTS = MOCK_INVENTORY.filter((i) => i.qty <= i.min);

export default function InventoryPage() {
  const [typeFilter, setTypeFilter] = useState<StockType>("all");
  const [search, setSearch] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(true);

  const filtered = MOCK_INVENTORY.filter((item) => {
    if (typeFilter === "outsourced" && item.type !== "Out Sourced") return false;
    if (typeFilter === "internal"   && item.type !== "Internally Manufactured") return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <h1 style={s.title}>Inventory</h1>
        <button style={s.aiBtn}>
          <span style={s.aiDot} />
          Ask AI
        </button>
      </div>

      <div style={s.card}>
        <FilterSection label="Filter Stock Item Type">
          <FilterChip label="Out Sourced"           active={typeFilter === "outsourced"} onClick={() => setTypeFilter(typeFilter === "outsourced" ? "all" : "outsourced")} />
          <FilterChip label="Internally Manufactured" active={typeFilter === "internal"} onClick={() => setTypeFilter(typeFilter === "internal" ? "all" : "internal")} />
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

      {alertsOpen && LOW_STOCK_ALERTS.length > 0 && (
        <div style={s.alertPanel}>
          <div style={s.alertHeader}>
            <span style={s.alertTitle}>Low Stock Alerts</span>
            <button onClick={() => setAlertsOpen(false)} style={s.closeBtn}>✕</button>
          </div>
          {LOW_STOCK_ALERTS.map((item) => (
            <div key={item.id} style={s.alertItem}>
              <p style={s.alertName}>{item.name}</p>
              <p style={s.alertDetail}>Minimum: {item.min} · Qty: {item.qty}</p>
              <button style={s.reorderBtn}>
                <RefreshCw size={12} strokeWidth={2} /> Re-Order
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={s.filterSection}>
      <div style={s.filterHeader}>
        <span style={s.filterLabel}>{label}</span>
      </div>
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

const s: Record<string, React.CSSProperties> = {
  page: { position: "relative", display: "flex", flexDirection: "column", gap: 16 },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" },
  aiBtn: { display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", backgroundColor: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  aiDot: { width: 18, height: 18, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.3)" },
  card: { backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden" },
  filterSection: { padding: "16px 20px", borderBottom: "1px solid var(--border)" },
  filterHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  filterLabel: { fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" },
  filterChips: { display: "flex", gap: 8, flexWrap: "wrap" },
  chip: { padding: "6px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius-full, 9999px)", background: "none", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" },
  chipActive: { backgroundColor: "var(--text-primary)", color: "#fff", borderColor: "var(--text-primary)" },
  searchRow: { padding: "12px 20px", borderBottom: "1px solid var(--border)" },
  search: { width: 280, height: 36, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--bg)", outline: "none" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: { padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "11px 14px", fontSize: 13, color: "var(--text-primary)", whiteSpace: "nowrap" },
  supplierChip: { fontSize: 11, backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px" },
  alertCell: { display: "flex", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  alertPanel: { position: "fixed", top: 80, right: 24, width: 260, backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", zIndex: 50, overflow: "hidden" },
  alertHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border)" },
  alertTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-primary)" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 14 },
  alertItem: { padding: "12px 16px", borderBottom: "1px solid var(--border)" },
  alertName: { fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 },
  alertDetail: { fontSize: 11, color: "var(--text-secondary)", marginBottom: 8 },
  reorderBtn: { display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", backgroundColor: "var(--btn-primary)", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" },
};
