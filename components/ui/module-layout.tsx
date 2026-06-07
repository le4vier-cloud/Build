import React from "react";

interface SubNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface ModuleLayoutProps {
  title: string;
  subNav: SubNavItem[];
  activeView: string;
  onViewChange: (key: string) => void;
  children: React.ReactNode;
}

export function ModuleLayout({ title, subNav, activeView, onViewChange, children }: ModuleLayoutProps) {
  return (
    <div style={s.page}>
      <h1 style={s.pageTitle}>{title}</h1>
      <div style={s.card}>
        <div style={s.subNav}>
          {subNav.map((item) => (
            <button
              key={item.key}
              onClick={() => onViewChange(item.key)}
              style={{
                ...s.subNavItem,
                ...(activeView === item.key ? s.subNavItemActive : {}),
              }}
            >
              <span style={s.subNavIcon}>{item.icon}</span>
              <span style={s.subNavLabel}>{item.label}</span>
            </button>
          ))}
        </div>
        <div style={s.content}>{children}</div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: 0, height: "100%" },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: 16,
    letterSpacing: "-0.02em",
  },
  card: {
    backgroundColor: "var(--surface)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border)",
    display: "flex",
    minHeight: 500,
    overflow: "hidden",
  },
  subNav: {
    width: 180,
    borderRight: "1px solid var(--border)",
    padding: "16px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flexShrink: 0,
  },
  subNavItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "none",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    color: "var(--text-secondary)",
  },
  subNavItemActive: {
    backgroundColor: "var(--bg)",
    color: "var(--text-primary)",
    fontWeight: 600,
  },
  subNavIcon: { display: "flex", alignItems: "center", flexShrink: 0 },
  subNavLabel: { fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" },
  content: { flex: 1, padding: 32, overflowY: "auto" },
};
