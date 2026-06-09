"use client";

import React, { useState } from "react";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import { Plus, X, Clock, Users, Package, Wrench, Building2, Zap } from "lucide-react";

const R = (n: number) =>
  `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmt = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export function CostPanel() {
  const {
    getCostBreakdown,
    vasteKosItems, bedryfskosItems,
    addVasteKosItem, removeVasteKosItem,
    addBedryfskosItem, removeBedryfskosItem,
  } = useManufacturingStore();

  const bd = getCostBreakdown();

  /* ── Vaste Kostes form ── */
  const [vLabel, setVLabel] = useState("");
  const [vMonthly, setVMonthly] = useState("");
  const [vUnits, setVUnits] = useState("");

  /* ── Bedryfskostes form ── */
  const [bLabel, setBLabel] = useState("");
  const [bPerHour, setBPerHour] = useState("");

  function submitVaste(e: React.FormEvent) {
    e.preventDefault();
    const monthly = parseFloat(vMonthly);
    const units = parseFloat(vUnits);
    if (!vLabel || isNaN(monthly) || isNaN(units) || units === 0) return;
    addVasteKosItem({ label: vLabel, monthlyCost: monthly, unitsPerMonth: units });
    setVLabel(""); setVMonthly(""); setVUnits("");
  }

  function submitBedryf(e: React.FormEvent) {
    e.preventDefault();
    const perHour = parseFloat(bPerHour);
    if (!bLabel || isNaN(perHour)) return;
    addBedryfskosItem({ label: bLabel, costPerHour: perHour });
    setBLabel(""); setBPerHour("");
  }

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <p style={s.headerTitle}>Cost per Unit</p>
        <p style={s.headerTotal}>{R(bd.totalPerUnit)}</p>
      </div>

      <div style={s.scroll}>

        {/* ── Time ── */}
        <Section icon={<Clock size={13} />} label="Production Time" color="#F56300">
          <Row label="Total time" value={fmt(bd.totalMinutes)} mono />
        </Section>

        {/* ── Labour ── */}
        <Section icon={<Users size={13} />} label="Labour" value={R(bd.labourCost)} color="#2563EB">
          <p style={s.hint}>Assigned staff × station hours</p>
        </Section>

        {/* ── Materials ── */}
        <Section icon={<Package size={13} />} label="Materials" value={R(bd.materialCost)} color="#059669">
          <p style={s.hint}>Parts consumed × quantity</p>
        </Section>

        {/* ── Machines ── */}
        <Section icon={<Wrench size={13} />} label="Machines" value={R(bd.machineCost)} color="#D97706">
          <p style={s.hint}>Tool usage cost × station hours</p>
        </Section>

        {/* ── Vaste Kostes ── */}
        <Section icon={<Building2 size={13} />} label="Vaste Kostes" value={R(bd.vasteKosCost)} color="#DC2626">
          <p style={s.hint}>Monthly overhead ÷ units/month</p>

          {vasteKosItems.map((v) => (
            <div key={v.id} style={s.lineItem}>
              <span style={s.lineLabel}>{v.label}</span>
              <span style={s.lineValue}>
                {R(v.unitsPerMonth > 0 ? v.monthlyCost / v.unitsPerMonth : 0)}/unit
              </span>
              <button onClick={() => removeVasteKosItem(v.id)} style={s.removeBtn}>
                <X size={11} />
              </button>
            </div>
          ))}

          <form onSubmit={submitVaste} style={s.addForm}>
            <input style={s.input} placeholder="Label (e.g. Rent)" value={vLabel}
              onChange={(e) => setVLabel(e.target.value)} />
            <div style={s.inputRow}>
              <input style={{ ...s.input, flex: 1 }} placeholder="R/month" type="number" min="0"
                value={vMonthly} onChange={(e) => setVMonthly(e.target.value)} />
              <input style={{ ...s.input, flex: 1 }} placeholder="units/month" type="number" min="1"
                value={vUnits} onChange={(e) => setVUnits(e.target.value)} />
            </div>
            <button type="submit" style={s.addBtn}>
              <Plus size={11} /> Add
            </button>
          </form>
        </Section>

        {/* ── Bedryfskostes ── */}
        <Section icon={<Zap size={13} />} label="Bedryfskostes" value={R(bd.bedryfskosCell)} color="#0891B2">
          <p style={s.hint}>Variable cost/hr × total production hours</p>

          {bedryfskosItems.map((b) => (
            <div key={b.id} style={s.lineItem}>
              <span style={s.lineLabel}>{b.label}</span>
              <span style={s.lineValue}>{R(b.costPerHour)}/hr</span>
              <button onClick={() => removeBedryfskosItem(b.id)} style={s.removeBtn}>
                <X size={11} />
              </button>
            </div>
          ))}

          <form onSubmit={submitBedryf} style={s.addForm}>
            <input style={s.input} placeholder="Label (e.g. Electricity)" value={bLabel}
              onChange={(e) => setBLabel(e.target.value)} />
            <input style={s.input} placeholder="R/hr" type="number" min="0"
              value={bPerHour} onChange={(e) => setBPerHour(e.target.value)} />
            <button type="submit" style={s.addBtn}>
              <Plus size={11} /> Add
            </button>
          </form>
        </Section>

        {/* ── Total ── */}
        <div style={s.totalRow}>
          <span style={s.totalLabel}>Total per Unit</span>
          <span style={s.totalValue}>{R(bd.totalPerUnit)}</span>
        </div>

        {/* Breakdown bar */}
        {bd.totalPerUnit > 0 && (
          <div style={s.barWrap}>
            {[
              { cost: bd.labourCost,    color: "#2563EB" },
              { cost: bd.materialCost,  color: "#059669" },
              { cost: bd.machineCost,   color: "#D97706" },
              { cost: bd.vasteKosCost,  color: "#DC2626" },
              { cost: bd.bedryfskosCell,color: "#0891B2" },
            ].filter((x) => x.cost > 0).map((x, i) => (
              <div key={i} style={{
                ...s.barSegment,
                flex: x.cost / bd.totalPerUnit,
                backgroundColor: x.color,
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Section wrapper ──────────────────────────────── */
function Section({
  icon, label, value, color, children,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  color: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={sct.wrap}>
      <button style={sct.head} onClick={() => setOpen((v) => !v)}>
        <span style={{ ...sct.dot, backgroundColor: color + "20", color }}>{icon}</span>
        <span style={sct.label}>{label}</span>
        {value && <span style={sct.value}>{value}</span>}
      </button>
      {open && <div style={sct.body}>{children}</div>}
    </div>
  );
}

const sct: Record<string, React.CSSProperties> = {
  wrap: { borderBottom: "1px solid var(--border)", paddingBottom: 10, marginBottom: 4 },
  head: {
    display: "flex", alignItems: "center", gap: 8, width: "100%",
    background: "none", border: "none", cursor: "pointer", padding: "8px 0 4px",
  },
  dot: {
    width: 22, height: 22, borderRadius: 6,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  label: { fontSize: 12, fontWeight: 600, color: "var(--text-primary)", flex: 1, textAlign: "left" },
  value: { fontSize: 12, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" },
  body: { paddingLeft: 30 },
};

const s: Record<string, React.CSSProperties> = {
  panel: {
    width: 260,
    minWidth: 260,
    height: "100%",
    backgroundColor: "var(--surface)",
    borderLeft: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  header: {
    padding: "14px 16px 12px",
    borderBottom: "1px solid var(--border)",
  },
  headerTitle: { fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", margin: 0 },
  headerTotal: {
    fontSize: 22, fontWeight: 800, color: "var(--text-primary)",
    letterSpacing: "-0.03em", marginTop: 2, fontVariantNumeric: "tabular-nums",
  },
  scroll: { flex: 1, overflowY: "auto", padding: "8px 14px 20px" },
  hint: { fontSize: 10, color: "var(--text-tertiary)", marginBottom: 6 },
  lineItem: {
    display: "flex", alignItems: "center", gap: 6, padding: "3px 0",
    fontSize: 11, color: "var(--text-primary)",
  },
  lineLabel: { flex: 1 },
  lineValue: { color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" },
  removeBtn: {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", color: "var(--text-tertiary)", padding: 2,
  },
  addForm: { display: "flex", flexDirection: "column", gap: 4, marginTop: 6 },
  inputRow: { display: "flex", gap: 4 },
  input: {
    height: 28, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)",
    padding: "0 8px", fontSize: 11, color: "var(--text-primary)",
    backgroundColor: "var(--bg)", outline: "none", width: "100%",
  },
  addBtn: {
    height: 26, padding: "0 10px", backgroundColor: "var(--bg)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    cursor: "pointer", fontSize: 11, fontWeight: 500,
    color: "var(--text-primary)", display: "flex", alignItems: "center",
    gap: 4, alignSelf: "flex-start",
  },
  totalRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 0 8px",
    borderTop: "2px solid var(--text-primary)",
    marginTop: 4,
  },
  totalLabel: { fontSize: 12, fontWeight: 700, color: "var(--text-primary)" },
  totalValue: { fontSize: 15, fontWeight: 800, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" },
  barWrap: {
    display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 1, marginTop: 4,
  },
  barSegment: { borderRadius: 2, transition: "flex 0.3s ease" },
  Row: {},
};

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>
      <span>{label}</span>
      <span style={mono ? { fontVariantNumeric: "tabular-nums" } : {}}>{value}</span>
    </div>
  );
}
