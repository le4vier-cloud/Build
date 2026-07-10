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

const INPUT_WIDTH = 220;
const ICON_SIZE = 32;
const GAP = 8;

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
      {/* Search input — slides out to the left of the icon, absolutely positioned so nothing else shifts */}
      <div
        style={{
          position: "absolute",
          top: -6,
          [align]: ICON_SIZE + GAP - 8,
          height: ICON_SIZE + 12,
          width: open ? INPUT_WIDTH + 16 : 0,
          opacity: open ? 1 : 0,
          overflow: "hidden",
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.16s ease",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
          borderRadius: 999,
        } as React.CSSProperties}
      >
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            height: ICON_SIZE,
            width: INPUT_WIDTH,
            marginRight: 8,
            boxSizing: "border-box",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: "0 14px",
            fontSize: 13,
            color: "var(--text-primary)",
            backgroundColor: "var(--surface)",
            outline: "none",
            pointerEvents: open ? "auto" : "none",
            flexShrink: 0,
          }}
        />
      </div>

      <button
        type="button"
        aria-label="Search and filter"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: ICON_SIZE, height: ICON_SIZE, borderRadius: "50%", flexShrink: 0,
          border: "none", background: "transparent", cursor: "pointer",
          color: showsActive ? "var(--accent)" : "var(--text-secondary)",
          transition: "color 0.15s",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Search size={16} strokeWidth={1.8} />
      </button>

      {children && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 2px)",
            [align]: 0,
            width: 300,
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.98)",
            transformOrigin: `top ${align}`,
            pointerEvents: open ? "auto" : "none",
            transition: "opacity 0.18s ease, transform 0.18s ease",
            zIndex: 80,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            padding: "14px 4px 18px",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
          } as React.CSSProperties}
        >
          {children}
        </div>
      )}
    </div>
  );
}
