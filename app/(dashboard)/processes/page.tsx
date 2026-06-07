"use client";

import { useState } from "react";
import Link from "next/link";
import { Workflow } from "lucide-react";

const MOCK_PRODUCTS = [
  { id: "p1", name: "Ingane",         model: "1.0", image_url: null },
  { id: "p2", name: "Alublack Trey",  model: "1.0", image_url: null },
];

export default function ProcessesPage() {
  const [selected, setSelected] = useState<string | null>("p1");

  return (
    <div style={s.page}>
      <h1 style={s.title}>Processes Per Product</h1>

      <div style={s.productGrid}>
        {MOCK_PRODUCTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            style={{ ...s.productCard, ...(selected === p.id ? s.productCardActive : {}) }}
          >
            <div style={s.productImage}>
              <Workflow size={32} color={selected === p.id ? "var(--accent)" : "var(--text-tertiary)"} strokeWidth={1.5} />
            </div>
            <span style={s.productName}>{p.name} — {p.model}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div style={s.actions}>
          <h3 style={s.actionsTitle}>
            {MOCK_PRODUCTS.find((p) => p.id === selected)?.name}
          </h3>
          <div style={s.actionCards}>
            <ActionCard title="Task Manager" description="Define tasks and workflows for this product" href={`/processes/${selected}/tasks`} />
            <ActionCard title="Production Planner" description="Design the visual production flow with stations" href={`/processes/${selected}/planner`} />
          </div>
        </div>
      )}
    </div>
  );
}

function ActionCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link href={href} style={s.actionCard}>
      <span style={s.actionTitle}>{title}</span>
      <span style={s.actionDesc}>{description}</span>
    </Link>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: 32 },
  title: { fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" },
  productGrid: { display: "flex", gap: 16, flexWrap: "wrap" },
  productCard: { width: 140, height: 140, border: "2px solid var(--border)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", background: "var(--surface)" },
  productCardActive: { borderColor: "var(--accent)", backgroundColor: "var(--accent-light, #f3e8ff)" },
  productImage: { width: 64, height: 64, borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" },
  productName: { fontSize: 12, fontWeight: 600, color: "var(--text-primary)", textAlign: "center" },
  actions: { display: "flex", flexDirection: "column", gap: 16 },
  actionsTitle: { fontSize: 18, fontWeight: 600, color: "var(--text-primary)" },
  actionCards: { display: "flex", gap: 16 },
  actionCard: { flex: 1, maxWidth: 260, padding: 24, backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", gap: 8, textDecoration: "none", cursor: "pointer" },
  actionTitle: { fontSize: 16, fontWeight: 600, color: "var(--text-primary)" },
  actionDesc: { fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 },
};
