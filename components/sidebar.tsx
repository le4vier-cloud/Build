"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box, Wrench, Users, Truck,
  GitBranch, CircleUser, FileText, ShoppingBag,
  SlidersHorizontal, LogOut, UserRound, HardHat,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/inventory",  icon: Box,               label: "Parts" },
  { href: "/tools",      icon: Wrench,            label: "Tools" },
  { href: "/staff",      icon: Users,             label: "Staff" },
  { href: "/suppliers",  icon: Truck,             label: "Suppliers" },
  { href: "/products",   icon: ShoppingBag,       label: "Products" },
  { href: "/processes",  icon: GitBranch,         label: "Processes" },
  { href: "/clients",    icon: CircleUser,        label: "Clients" },
  { href: "/orders",     icon: FileText,          label: "Orders" },
];

const BOTTOM_ITEMS = [
  { href: "/floor",     icon: HardHat,            label: "Factory Floor" },
  { href: "/settings",  icon: SlidersHorizontal,  label: "Settings" },
  { href: "/profile",   icon: UserRound,          label: "Profile" },
];

interface Tooltip { label: string; y: number }

export function Sidebar() {
  const pathname = usePathname();
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  const isActive = (href: string) => pathname.startsWith(href);

  function show(e: React.MouseEvent, label: string) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ label, y: r.top + r.height / 2 });
  }

  return (
    <>
      <style>{`
        .sb-link {
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; padding: 6px 4px; border-radius: 12px;
          text-decoration: none; cursor: pointer;
        }
        .sb-icon {
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: background-color 0.12s ease, transform 0.12s ease;
        }
        .sb-link:hover .sb-icon { transform: scale(1.14); }
        .sb-link:active .sb-icon { transform: scale(0.88); transition-duration: 0.06s; }

        .sb-btn {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 8px;
          border: none; background: none; cursor: pointer; text-decoration: none;
          transition: transform 0.12s ease, background-color 0.12s ease;
          color: inherit;
        }
        .sb-btn:hover { transform: scale(1.18); background-color: var(--bg); }
        .sb-btn:active { transform: scale(0.88); transition-duration: 0.06s; }
      `}</style>

      <aside style={s.sidebar}>
        {/* Main nav */}
        <nav style={s.nav}>
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="sb-link"
                onMouseEnter={e => show(e, label)}
                onMouseLeave={() => setTooltip(null)}
              >
                <span
                  className="sb-icon"
                  style={{ backgroundColor: active ? "var(--sidebar-active)" : "transparent" }}
                >
                  <Icon
                    size={18}
                    color={active ? "#fff" : "var(--sidebar-icon)"}
                    strokeWidth={1.5}
                  />
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--text-primary)" : "var(--sidebar-icon)",
                  textAlign: "center",
                  lineHeight: 1.2,
                  letterSpacing: "0.01em",
                }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={s.bottom}>
          <button
            className="sb-btn"
            onMouseEnter={e => show(e, "Sign Out")}
            onMouseLeave={() => setTooltip(null)}
          >
            <LogOut size={16} color="var(--sidebar-icon)" strokeWidth={1.5} />
          </button>

          {BOTTOM_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="sb-btn"
              onMouseEnter={e => show(e, label)}
              onMouseLeave={() => setTooltip(null)}
            >
              <Icon size={16} color="var(--sidebar-icon)" strokeWidth={1.5} />
            </Link>
          ))}
        </div>
      </aside>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "fixed",
          left: 80,
          top: tooltip.y,
          transform: "translateY(-50%)",
          backgroundColor: "var(--text-primary)",
          color: "var(--bg)",
          fontSize: 12,
          fontWeight: 600,
          padding: "5px 10px",
          borderRadius: 7,
          pointerEvents: "none",
          zIndex: 9999,
          whiteSpace: "nowrap",
          letterSpacing: "0.01em",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>
          {tooltip.label}
        </div>
      )}
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
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
    alignItems: "center",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    paddingInline: 8,
    width: "100%",
  },
  bottom: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    paddingInline: 8,
  },
};
