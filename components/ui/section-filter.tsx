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
      style={{ position: "relative", display: "inline-flex" }}
    >
      <button
        type="button"
        aria-label="Search and filter"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          border: "none", background: "transparent", cursor: "pointer",
          color: showsActive ? "var(--accent)" : "var(--text-secondary)",
          transition: "color 0.15s",
        }}
      >
        <Search size={16} strokeWidth={1.8} />
      </button>

      <div
        style={{
          position: "absolute",
          top: "calc(100% + 2px)",
          [align]: 0,
          width: 300,
          maxHeight: open ? 480 : 0,
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
          overflow: "hidden",
        } as React.CSSProperties}
      >
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            background: "transparent", border: "none", borderBottom: "1.5px solid var(--border)",
            padding: "6px 2px", fontSize: 14, color: "var(--text-primary)", outline: "none", width: "100%",
            transition: "border-color 0.15s",
          }}
          onFocus={e => { e.currentTarget.style.borderBottomColor = "var(--accent)"; }}
          onBlur={e => { e.currentTarget.style.borderBottomColor = "var(--border)"; }}
        />
        {children}
      </div>
    </div>
  );
}
