"use client";

import React, { use, useEffect, useRef, useState } from "react";
import { FlowCanvas }        from "@/components/manufacturing/FlowCanvas";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import { ArrowLeft, Clock, Workflow, ListTodo, Maximize2, Minimize2 } from "lucide-react";
import Link from "next/link";

/* ── Demo data ───────────────────────────────────────────────────── */
const DEMO = {
  tasks: [
    { id: "t1", name: "Cut & Prep Materials",  duration: 45,  optionSet: "machine" as const },
    { id: "t2", name: "Frame Assembly",        duration: 120, optionSet: "human"   as const },
    { id: "t3", name: "Wiring & Electronics",  duration: 90,  optionSet: "human"   as const },
    { id: "t4", name: "QC Inspection",         duration: 30,  optionSet: "human"   as const },
    { id: "t5", name: "Paint & Polish",        duration: 60,  optionSet: "machine" as const },
  ],
  workflows: [
    { id: "w1", name: "Core Build",   taskIds: ["t1", "t2"] },
    { id: "w2", name: "Final Finish", taskIds: ["t4", "t5"] },
  ],
};

const fmtMin = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
};

/* ── Page ────────────────────────────────────────────────────────── */
export default function PlannerPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const { setData, setSelectedProduct, workflows, tasks } = useManufacturingStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state = useManufacturingStore.getState();
    if (state.tasks.length === 0) {
      setData(DEMO);
      setSelectedProduct({ id: productId, name: "Product", baseTasks: DEMO.tasks.map(t => t.id), options: [] });
    }
  }, [productId, setData, setSelectedProduct]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "f" || e.key === "F") && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        toggleFullscreen();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) containerRef.current?.requestFullscreen()?.catch(() => {});
      else document.exitFullscreen()?.catch(() => {});
    } catch { /* Fullscreen API unavailable/blocked in this context */ }
  };

  const totalTime = tasks.reduce((s, t) => s + t.duration, 0);

  return (
    <div
      ref={containerRef}
      style={
        isFullscreen
          ? { height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg)", padding: 16, boxSizing: "border-box" }
          : { height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }
      }
    >

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <Link href="/processes" style={s.back}>
            <ArrowLeft size={15} strokeWidth={2} /> Processes
          </Link>
          <h2 style={s.title}>Production Planner</h2>
          <Link href={`/processes/${productId}/tasks`} style={{ ...s.back, fontSize: 12, color: "var(--text-secondary)", gap: 4 }}>
            <ListTodo size={13} /> Task Manager
          </Link>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={s.chip}>
            <Clock size={12} color="var(--text-secondary)" />
            <span style={s.chipLabel}>Total time</span>
            <span style={s.chipVal}>{totalTime > 0 ? fmtMin(totalTime) : "—"}</span>
          </div>
          <div style={s.chip}>
            <Workflow size={12} color="var(--text-secondary)" />
            <span style={s.chipVal}>
              {workflows.length} {workflows.length === 1 ? "workflow" : "workflows"}
            </span>
          </div>
          <button onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"} style={s.fullscreenBtn}>
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Full-width canvas */}
      <div style={{ flex: 1, overflow: "hidden", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
        <FlowCanvas />
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header:    { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, flexShrink: 0 },
  headerLeft:{ display: "flex", alignItems: "center", gap: 16 },
  back:      { display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", textDecoration: "none", fontSize: 13, fontWeight: 500 },
  title:     { fontSize: 18, fontWeight: 700, color: "var(--text-primary)" },
  chip:      { display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: 999 },
  chipLabel: { color: "var(--text-secondary)", fontSize: 12 },
  chipVal:   { fontWeight: 700, color: "var(--text-primary)", fontSize: 12 },
  fullscreenBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-secondary)", cursor: "pointer" },
};
