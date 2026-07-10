"use client";

import React from "react";
import { useSidebar } from "@/components/sidebar-context";

interface SubNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface ModuleLayoutProps {
  title: string;
  subNav: SubNavItem[];
  activeView: string | null;
  onViewChange: (key: string) => void;
  children: React.ReactNode;
  onBackgroundClick?: () => void;
}

export function ModuleLayout({ title, subNav, activeView, onViewChange, children, onBackgroundClick }: ModuleLayoutProps) {
  const { setLocked, setHovered } = useSidebar();

  function handleTabClick(key: string) {
    onViewChange(key);
    setLocked(false);
    setHovered(false);
  }

  return (
    <div style={{ margin: "-24px", height: "calc(100vh - 52px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "0 20px",
        backgroundColor: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        {title && (
          <>
            <span style={{
              fontFamily: "var(--font-geist-pixel-square)",
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              paddingRight: 14,
              marginRight: 6,
              borderRight: "1px solid var(--border)",
              whiteSpace: "nowrap",
            }}>
              {title}
            </span>
          </>
        )}
        {subNav.map((item) => {
          const active = activeView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleTabClick(item.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 14px",
                height: 32,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                backgroundColor: active ? "var(--bg)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                transition: "background-color 0.15s, color 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <div
        style={{ flex: 1, overflowY: "auto", padding: 24, backgroundColor: "var(--bg)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onBackgroundClick?.(); }}
      >
        {children}
      </div>
    </div>
  );
}
