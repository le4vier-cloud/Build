"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { SidebarContext } from "@/components/sidebar-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(true);
  const [hovered, setHovered] = useState(false);
  const visible = locked || hovered;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Header onMenuClick={() => setLocked((v) => !v)} menuActive={locked} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Invisible 8px strip on the left edge — reveals sidebar on hover when hidden */}
        {!visible && (
          <div
            style={{
              position: "fixed",
              left: 0,
              top: 52,
              bottom: 0,
              width: 8,
              zIndex: 60,
            }}
            onMouseEnter={() => setHovered(true)}
          />
        )}

        {/* Sidebar wrapper — animates width to push content */}
        <div
          style={{
            width: visible ? 72 : 0,
            minWidth: visible ? 72 : 0,
            overflow: "hidden",
            flexShrink: 0,
            transition:
              "width 0.28s cubic-bezier(0.4,0,0.2,1), min-width 0.28s cubic-bezier(0.4,0,0.2,1)",
          }}
          onMouseLeave={() => {
            if (!locked) setHovered(false);
          }}
        >
          <Sidebar />
        </div>

        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: 24,
            backgroundColor: "var(--bg)",
          }}
        >
          <SidebarContext.Provider value={{ setLocked, setHovered }}>
            {children}
          </SidebarContext.Provider>
        </main>
      </div>
    </div>
  );
}
