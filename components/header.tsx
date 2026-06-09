"use client";

import { Menu } from "lucide-react";

interface HeaderProps {
  section?: string;
  onMenuClick?: () => void;
  menuActive?: boolean;
}

export function Header({ section = "Back-End", onMenuClick, menuActive }: HeaderProps) {
  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <button style={styles.menuBtn} onClick={onMenuClick} aria-label="Toggle sidebar">
          <Menu
            size={20}
            color={menuActive ? "var(--text-primary)" : "var(--text-secondary)"}
            strokeWidth={1.8}
          />
        </button>
        <span style={styles.sectionLabel}>{section}</span>
      </div>

      <div style={styles.center}>
        <div style={styles.logoMark} aria-hidden="true" />
        <span style={styles.companyName}>Company Name</span>
      </div>

      <div style={styles.right}>
        <span style={styles.appName}>Build</span>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: 52,
    backgroundColor: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingInline: 20,
    flexShrink: 0,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  menuBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 13,
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  center: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
  },
  logoMark: {
    width: 24,
    height: 24,
    borderRadius: 6,
    background: "linear-gradient(135deg, #F56300 0%, #1D1D1F 100%)",
  },
  companyName: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  right: {
    flex: 1,
    display: "flex",
    justifyContent: "flex-end",
  },
  appName: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },
};
