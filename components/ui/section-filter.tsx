"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface SectionFilterProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  align?: "left" | "right";
  active?: boolean;
}

const ICON_SIZE = 32;
const PANEL_WIDTH = 260;

export function SectionFilter({
  search, onSearchChange, searchPlaceholder = "Search...", children, align = "right", active,
}: SectionFilterProps) {
  const [hovered, setHovered] = useState(false);
  const open = hovered;
  const showsActive = active || search.length > 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", height: ICON_SIZE }}
    >
      <button
        type="button"
        aria-label="Search and filter"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: ICON_SIZE, height: ICON_SIZE, borderRadius: "50%", flexShrink: 0,
          border: "none", backgroundColor: open ? "var(--bg)" : "transparent", cursor: "pointer",
          color: showsActive ? "var(--accent)" : "var(--text-secondary)",
          transition: "color 0.15s, background-color 0.15s",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Search size={16} strokeWidth={1.8} />
      </button>

      {/* Popover panel — search input on top, filter toggles below, one solid bordered surface */}
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          [align]: 0,
          width: PANEL_WIDTH,
          maxWidth: "calc(100vw - 32px)",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.98)",
          transformOrigin: `top ${align}`,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.18s ease, transform 0.18s ease",
          zIndex: 80,
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
          overflow: "hidden",
        } as React.CSSProperties}
      >
        <div style={{ padding: 10 }}>
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              height: 34,
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid var(--input-border)",
              borderRadius: 9,
              padding: "0 12px",
              fontSize: 13,
              color: "var(--text-primary)",
              backgroundColor: "var(--bg)",
              outline: "none",
            }}
          />
        </div>

        {children && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            padding: "10px 14px 16px",
            borderTop: "1px solid var(--border)",
          }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
