"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, ShoppingBag, Scissors,
  Warehouse, ArrowUpCircle, Link2, Archive,
  Workflow, UserCircle, CalendarDays,
  Home, Settings, LogOut, User, Building2,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/factory",    icon: Building2,      label: "Factory" },
  { href: "/staff",      icon: Users,          label: "Staff" },
  { href: "/products",   icon: ShoppingBag,    label: "Products" },
  { href: "/tools",      icon: Scissors,       label: "Tools" },
  { href: "/suppliers",  icon: Warehouse,      label: "Suppliers" },
  { href: "/parts-os",   icon: ArrowUpCircle,  label: "Parts (OS)" },
  { href: "/parts-im",   icon: Link2,          label: "Parts (IM)" },
  { href: "/inventory",  icon: Archive,        label: "Inventory" },
  { href: "/processes",  icon: Workflow,       label: "Processes" },
  { href: "/clients",    icon: UserCircle,     label: "Clients" },
  { href: "/orders",     icon: CalendarDays,   label: "Orders" },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside style={styles.sidebar}>
      <nav style={styles.nav}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} style={styles.link}>
              <span style={{ ...styles.iconWrap, ...(active ? styles.iconWrapActive : {}) }}>
                <Icon size={20} color={active ? "#fff" : "var(--sidebar-icon)"} strokeWidth={1.8} />
              </span>
              <span style={{ ...styles.label, ...(active ? styles.labelActive : {}) }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div style={styles.bottom}>
        <div style={styles.bottomRow}>
          <Link href="/home" style={styles.bottomIcon}>
            <Home size={18} color="var(--sidebar-icon)" strokeWidth={1.8} />
          </Link>
          <Link href="/settings" style={styles.bottomIcon}>
            <Settings size={18} color="var(--sidebar-icon)" strokeWidth={1.8} />
          </Link>
        </div>
        <div style={styles.bottomRow}>
          <button style={styles.bottomIcon}>
            <LogOut size={18} color="var(--sidebar-icon)" strokeWidth={1.8} />
          </button>
          <Link href="/profile" style={styles.bottomIcon}>
            <User size={18} color="var(--sidebar-icon)" strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 72,
    minWidth: 72,
    height: "100%",
    backgroundColor: "var(--surface)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 16,
    overflowY: "auto",
    flexShrink: 0,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    paddingInline: 8,
  },
  link: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "8px 4px",
    borderRadius: "var(--radius-md)",
    textDecoration: "none",
    cursor: "pointer",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: "var(--radius-full, 9999px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.15s ease",
  },
  iconWrapActive: {
    backgroundColor: "var(--sidebar-active)",
  },
  label: {
    fontSize: 10,
    fontWeight: 500,
    color: "var(--sidebar-icon)",
    textAlign: "center",
    lineHeight: 1.2,
    letterSpacing: "0.01em",
  },
  labelActive: {
    color: "var(--text-primary)",
    fontWeight: 600,
  },
  bottom: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    paddingInline: 8,
  },
  bottomRow: {
    display: "flex",
    justifyContent: "center",
    gap: 4,
  },
  bottomIcon: {
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    background: "none",
    border: "none",
    textDecoration: "none",
  },
};
