"use client";

import React, { use, useEffect, useRef, useState } from "react";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import {
  ArrowLeft, Plus, X, Clock, Cpu, User2, Users,
  Workflow, Pencil, GitBranch,
  ChevronDown, ChevronRight, GripVertical,
  FileText, Upload, Search, Package,
} from "lucide-react";
import Link from "next/link";

/* ── Demo data ──────────────────────────────────────────────────── */
const DEMO = {
  stations: [
    { id: "s1", name: "Prep Station",    childWorkflows: [], wagePerHour: 65, tools: [] },
    { id: "s2", name: "Assembly",        childWorkflows: [], wagePerHour: 75, tools: [] },
    { id: "s3", name: "Quality Control", childWorkflows: [], wagePerHour: 85, tools: [] },
    { id: "s4", name: "Finishing",       childWorkflows: [], wagePerHour: 70, tools: [] },
  ],
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
  staffResources: [
    { id: "st1", name: "Jane Smith",          wagePerHour: 85 },
    { id: "st2", name: "Tom Ndlovu",          wagePerHour: 65 },
    { id: "st3", name: "Damien De Villiers",  wagePerHour: 95 },
  ],
  partResources: [
    { id: "p1", name: "Compression Latch",  unitCost: 100,  type: "OS" as const },
    { id: "p2", name: "M5 Washer (Small)",  unitCost: 10,   type: "OS" as const },
    { id: "p3", name: "M5 Locknut",         unitCost: 10,   type: "OS" as const },
    { id: "p4", name: "E3 Fridge Door",     unitCost: 1206, type: "IM" as const },
  ],
  toolResources: [
    { id: "tl1", name: "MIG Welder",   costPerHour: 50 },
    { id: "tl2", name: "Drill Press",  costPerHour: 30 },
    { id: "tl3", name: "Paint Booth",  costPerHour: 80 },
  ],
};

/* ── Types & constants ──────────────────────────────────────────── */
type MachType =
  | "cnc_milling" | "cnc_turning" | "laser" | "plasma"
  | "waterjet"    | "3d_print"    | "welding"| "sheet_metal"
  | "drilling"    | "grinding";

const MACH_TYPES: { key: MachType; label: string; color: string }[] = [
  { key: "cnc_milling",  label: "CNC Milling",  color: "#2563EB" },
  { key: "cnc_turning",  label: "CNC Turning",  color: "#7C3AED" },
  { key: "laser",        label: "Laser Cut",    color: "#DC2626" },
  { key: "plasma",       label: "Plasma Cut",   color: "#F56300" },
  { key: "waterjet",     label: "Water Jet",    color: "#0891B2" },
  { key: "3d_print",     label: "3D Print",     color: "#059669" },
  { key: "welding",      label: "Welding",      color: "#D97706" },
  { key: "sheet_metal",  label: "Sheet Metal",  color: "#64748B" },
  { key: "drilling",     label: "Drilling",     color: "#0D9488" },
  { key: "grinding",     label: "Grinding",     color: "#9333EA" },
];

const SOP_ACCEPTS = ".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg";
const MACH_ACCEPTS_MAP: Record<MachType, string> = {
  cnc_milling: ".nc,.gcode,.ngc,.cnc,.tap,.step,.stp,.iges,.igs,.dxf,.sldprt,.x_t,.x_b",
  cnc_turning: ".nc,.gcode,.ngc,.cnc,.tap,.step,.stp,.dxf",
  laser:       ".dxf,.dwg,.ai,.svg,.pdf,.eps",
  plasma:      ".dxf,.dwg,.nc,.gcode",
  waterjet:    ".dxf,.dwg,.step,.stp,.ai",
  "3d_print":  ".stl,.obj,.3mf,.step,.stp,.amf,.gcode",
  welding:     ".jbi,.ls,.urp,.pdf,.docx",
  sheet_metal: ".dxf,.dwg,.step,.stp,.sldprt",
  drilling:    ".nc,.gcode,.drl,.dxf",
  grinding:    ".nc,.gcode,.step,.stp",
};

interface SOPFile    { id: string; name: string; }
interface MachFile   { id: string; name: string; machType: MachType; }
interface TaskMat    { id: string; partId: string; name: string; partType: "OS" | "IM"; qty: number; }
interface TaskMeta   { numPeople: number; sopFiles: SOPFile[]; machFiles: MachFile[]; materials: TaskMat[]; }
const blankMeta    = (): TaskMeta => ({ numPeople: 1, sopFiles: [], machFiles: [], materials: [] });

function blankNewPart() {
  return {
    name: "", supplier: "", barcode: "", serial: "",
    qtyStock: "", minThreshold: "", costPrice: "", salePrice: "",
    lowStockAlert: true, assemblyName: "", assemblyDesc: "",
    maxMinutes: "", labourCostPerHour: "",
    osComponents: [] as { id: string; partOsId: string; qty: string }[],
  };
}

type PanelState =
  | { mode: "new-workflow" }
  | { mode: "edit-workflow"; wfId: string; name: string }
  | { mode: "new-task"; targetWfId: string }
  | { mode: "edit-task"; taskId: string; name: string; maxDuration: string; optionSet: "human" | "machine"; meta: TaskMeta }
  | { mode: "new-task-option"; taskId: string; parentPath: string[] }
  | { mode: "edit-task-option"; taskId: string; parentPath: string[]; optId: string; name: string; maxDuration: string; optionSet: "human" | "machine"; meta: TaskMeta }
  | { mode: "new-workflow-option"; wfId: string; parentPath: string[] }
  | { mode: "edit-workflow-option"; wfId: string; parentPath: string[]; optId: string; name: string }
  | { mode: "new-task-in-wf-option"; wfId: string; optPath: string[] }
  | { mode: "edit-task-in-wf-option"; wfId: string; optPath: string[]; taskId: string; name: string; maxDuration: string; optionSet: "human" | "machine"; meta: TaskMeta }
  | null;

interface LocalTask { id: string; name: string; duration: number; optionSet: "human" | "machine"; meta: TaskMeta; options: LocalTask[] }
interface WfOption  { id: string; name: string; tasks: LocalTask[]; options: WfOption[] }

interface SaveData { name: string; maxDuration?: number; optionSet?: "human" | "machine"; meta?: TaskMeta; }

const fmtMin = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
};
function reorder<T>(arr: T[], from: number, to: number): T[] {
  const r = [...arr]; const [item] = r.splice(from, 1); r.splice(to, 0, item); return r;
}

/* ── Recursive tree helpers ─────────────────────────────────────── */
function getTaskOptsAt(opts: LocalTask[], path: string[]): LocalTask[] {
  if (path.length === 0) return opts;
  const n = opts.find(o => o.id === path[0]); if (!n) return [];
  return getTaskOptsAt(n.options, path.slice(1));
}
function addTaskOpt(opts: LocalTask[], path: string[], item: LocalTask): LocalTask[] {
  if (path.length === 0) return [...opts, item];
  return opts.map(o => o.id !== path[0] ? o : { ...o, options: addTaskOpt(o.options, path.slice(1), item) });
}
function updateTaskOptById(opts: LocalTask[], path: string[], id: string, fn: (t: LocalTask) => LocalTask): LocalTask[] {
  if (path.length === 0) return opts.map(o => o.id === id ? fn(o) : o);
  return opts.map(o => o.id !== path[0] ? o : { ...o, options: updateTaskOptById(o.options, path.slice(1), id, fn) });
}
function removeTaskOptById(opts: LocalTask[], path: string[], id: string): LocalTask[] {
  if (path.length === 0) return opts.filter(o => o.id !== id);
  return opts.map(o => o.id !== path[0] ? o : { ...o, options: removeTaskOptById(o.options, path.slice(1), id) });
}
function reorderTaskOptsAt(opts: LocalTask[], path: string[], from: number, to: number): LocalTask[] {
  if (path.length === 0) return reorder(opts, from, to);
  return opts.map(o => o.id !== path[0] ? o : { ...o, options: reorderTaskOptsAt(o.options, path.slice(1), from, to) });
}
function getWfOptsAt(opts: WfOption[], path: string[]): WfOption[] {
  if (path.length === 0) return opts;
  const n = opts.find(o => o.id === path[0]); if (!n) return [];
  return getWfOptsAt(n.options, path.slice(1));
}
function addWfOpt(opts: WfOption[], path: string[], item: WfOption): WfOption[] {
  if (path.length === 0) return [...opts, item];
  return opts.map(o => o.id !== path[0] ? o : { ...o, options: addWfOpt(o.options, path.slice(1), item) });
}
function updateWfOptById(opts: WfOption[], path: string[], id: string, fn: (o: WfOption) => WfOption): WfOption[] {
  if (path.length === 0) return opts.map(o => o.id === id ? fn(o) : o);
  return opts.map(o => o.id !== path[0] ? o : { ...o, options: updateWfOptById(o.options, path.slice(1), id, fn) });
}
function removeWfOptById(opts: WfOption[], path: string[], id: string): WfOption[] {
  if (path.length === 0) return opts.filter(o => o.id !== id);
  return opts.map(o => o.id !== path[0] ? o : { ...o, options: removeWfOptById(o.options, path.slice(1), id) });
}
function reorderWfOptsAt(opts: WfOption[], path: string[], from: number, to: number): WfOption[] {
  if (path.length === 0) return reorder(opts, from, to);
  return opts.map(o => o.id !== path[0] ? o : { ...o, options: reorderWfOptsAt(o.options, path.slice(1), from, to) });
}
function updateWfOptAtPath(opts: WfOption[], path: string[], fn: (o: WfOption) => WfOption): WfOption[] {
  if (path.length === 0) return opts;
  return opts.map(o => {
    if (o.id !== path[0]) return o;
    if (path.length === 1) return fn(o);
    return { ...o, options: updateWfOptAtPath(o.options, path.slice(1), fn) };
  });
}

/* ── Slide-out panel ────────────────────────────────────────────── */
type PartRes = { id: string; name: string; type: "OS" | "IM" };

function SlidePanel({ panel, parts, onClose, onSave }: {
  panel: PanelState;
  parts: PartRes[];
  onClose: () => void;
  onSave: (data: SaveData) => void;
}) {
  const [name,        setName]        = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [optionSet,   setOptionSet]   = useState<"human" | "machine">("human");
  const [numPeople,   setNumPeople]   = useState("1");
  const [sopFiles,    setSopFiles]    = useState<SOPFile[]>([]);
  const [machFiles,   setMachFiles]   = useState<MachFile[]>([]);
  const [selMach,     setSelMach]     = useState<MachType | null>(null);
  const [materials,   setMaterials]   = useState<TaskMat[]>([]);
  const [partQuery,   setPartQuery]   = useState("");
  const [showDrop,    setShowDrop]    = useState(false);
  const [addingPart,  setAddingPart]  = useState(false);
  const [newPart,     setNewPart]     = useState(blankNewPart);
  const [newPartType, setNewPartType] = useState<"OS" | "IM">("OS");
  const setNP = (u: Partial<ReturnType<typeof blankNewPart>>) => setNewPart(f => ({ ...f, ...u }));
  const [partFilter,  setPartFilter]  = useState<"all" | "OS" | "IM">("all");
  const [sopDrag,     setSopDrag]     = useState<number | null>(null);
  const [machDrag,    setMachDrag]    = useState<number | null>(null);

  const sopRef  = useRef<HTMLInputElement>(null);
  const machRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!panel) return;
    if (panel.mode === "edit-workflow" || panel.mode === "edit-workflow-option") {
      setName(panel.name); setMaxDuration(""); setOptionSet("human");
      setNumPeople("1"); setSopFiles([]); setMachFiles([]); setMaterials([]);
    } else if (panel.mode === "edit-task" || panel.mode === "edit-task-option" || panel.mode === "edit-task-in-wf-option") {
      setName(panel.name); setMaxDuration(panel.maxDuration); setOptionSet(panel.optionSet);
      setNumPeople(String(panel.meta.numPeople || 1));
      setSopFiles(panel.meta.sopFiles); setMachFiles(panel.meta.machFiles);
      setMaterials(panel.meta.materials);
    } else {
      setName(""); setMaxDuration(""); setOptionSet("human");
      setNumPeople("1"); setSopFiles([]); setMachFiles([]); setMaterials([]);
    }
    setPartQuery(""); setShowDrop(false); setAddingPart(false);
    setNewPart(blankNewPart()); setPartFilter("all"); setSelMach(null);
  }, [panel]);

  const isOpen     = panel !== null;
  const isWf       = panel?.mode === "new-workflow" || panel?.mode === "edit-workflow" || panel?.mode === "new-workflow-option" || panel?.mode === "edit-workflow-option";
  const isEdit     = panel?.mode === "edit-workflow" || panel?.mode === "edit-task" || panel?.mode === "edit-task-option" || panel?.mode === "edit-workflow-option" || panel?.mode === "edit-task-in-wf-option";
  const isMachine  = optionSet === "machine";

  const title =
    panel?.mode === "new-workflow"             ? "New Workflow"
    : panel?.mode === "edit-workflow"          ? "Edit Workflow"
    : panel?.mode === "new-task"               ? "New Task"
    : panel?.mode === "edit-task"              ? "Edit Task"
    : panel?.mode === "new-task-option"        ? "New Task Option"
    : panel?.mode === "edit-task-option"       ? "Edit Task Option"
    : panel?.mode === "new-workflow-option"    ? "New Workflow Option"
    : panel?.mode === "edit-workflow-option"   ? "Edit Workflow Option"
    : panel?.mode === "new-task-in-wf-option"  ? "Add Task to Option"
    : panel?.mode === "edit-task-in-wf-option" ? "Edit Task in Option"
    : "";

  const filteredParts = parts.filter(p =>
    (partQuery.trim() ? p.name.toLowerCase().includes(partQuery.toLowerCase()) : true) &&
    !materials.some(m => m.partId === p.id) &&
    (partFilter === "all" || p.type === partFilter)
  );

  const addMaterial = (p: PartRes) => {
    setMaterials(m => [...m, { id: `mat-${Date.now()}`, partId: p.id, name: p.name, partType: p.type, qty: 1 }]);
    setPartQuery(""); setShowDrop(false);
  };

  const handleNewPart = () => {
    if (!newPart.name.trim()) return;
    const newId    = `part-${Date.now()}`;
    const unitCost = parseFloat(newPartType === "OS" ? newPart.costPrice : newPart.labourCostPerHour) || 0;
    useManufacturingStore.setState(s => ({
      partResources: [...s.partResources, { id: newId, name: newPart.name.trim(), unitCost, type: newPartType }],
    }));
    setMaterials(m => [...m, { id: `mat-${Date.now()}`, partId: newId, name: newPart.name.trim(), partType: newPartType, qty: 1 }]);
    setNewPart(blankNewPart()); setAddingPart(false); setPartQuery(""); setShowDrop(false);
  };

  const handleSOPFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(f =>
      setSopFiles(p => [...p, { id: `s-${Date.now()}-${Math.random()}`, name: f.name }])
    );
    e.target.value = "";
  };

  const handleMachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selMach) return;
    const mt = selMach;
    Array.from(e.target.files || []).forEach(f =>
      setMachFiles(p => [...p, { id: `m-${Date.now()}-${Math.random()}`, name: f.name, machType: mt }])
    );
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isWf) {
      onSave({ name: name.trim() });
    } else {
      const dur = parseInt(maxDuration, 10);
      if (isNaN(dur) || dur <= 0) return;
      onSave({
        name: name.trim(), maxDuration: dur, optionSet,
        meta: { numPeople: parseInt(numPeople, 10) || 1, sopFiles, machFiles, materials },
      });
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 49, pointerEvents: isOpen ? "auto" : "none" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: "min(400px, 100vw)", zIndex: 50,
        backgroundColor: "var(--bg)", borderLeft: "1px solid var(--border)",
        boxShadow: isOpen ? "-8px 0 32px rgba(0,0,0,0.1)" : "none",
        transform: `translateX(${isOpen ? 0 : 400}px)`,
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column", pointerEvents: isOpen ? "auto" : "none",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={sp.iconBtn}><X size={14} /></button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Name */}
          <div style={sp.field}>
            <label style={sp.label}>Name *</label>
            <input style={sp.input} value={name} onChange={e => setName(e.target.value)}
              placeholder={isWf ? "e.g. Core Build" : "e.g. Weld Frame"} autoFocus />
          </div>

          {/* Max Duration */}
          {!isWf && (
            <div style={sp.field}>
              <label style={sp.label}>Max Duration (minutes) *</label>
              <input style={sp.input} type="number" min="1" value={maxDuration}
                onChange={e => setMaxDuration(e.target.value)} placeholder="e.g. 45" />
            </div>
          )}

          {/* Type */}
          {!isWf && (
            <div style={sp.field}>
              <label style={sp.label}>Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setOptionSet("human")}
                  style={{ ...sp.typeBtn, ...(optionSet === "human" ? sp.typeBtnHuman : {}) }}>
                  <User2 size={13} /> Human
                </button>
                <button type="button" onClick={() => setOptionSet("machine")}
                  style={{ ...sp.typeBtn, ...(optionSet === "machine" ? sp.typeBtnMachine : {}) }}>
                  <Cpu size={13} /> Machine
                </button>
              </div>
            </div>
          )}

          {/* People (human only) */}
          {!isWf && optionSet === "human" && (
            <div style={sp.field}>
              <label style={sp.label}><Users size={13} style={{ display: "inline", marginRight: 5 }} />People Required</label>
              <input style={{ ...sp.input, width: 100 }} type="number" min="1" value={numPeople}
                onChange={e => setNumPeople(e.target.value)} placeholder="1" />
            </div>
          )}

          {/* SOP Documents */}
          {!isWf && (
            <div style={sp.section}>
              <div style={sp.sectionHead}>
                <FileText size={13} color="var(--text-secondary)" />
                <span style={sp.sectionTitle}>SOP Documents</span>
                <span style={sp.sectionSub}>{SOP_ACCEPTS.replaceAll(",", " ·")}</span>
              </div>
              {/* File list */}
              {sopFiles.map((f, idx) => (
                <div key={f.id} draggable
                  onDragStart={() => setSopDrag(idx)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => { if (sopDrag !== null) { setSopFiles(a => reorder(a, sopDrag, idx)); setSopDrag(null); } }}
                  style={{ ...sp.fileRow, opacity: sopDrag === idx ? 0.4 : 1 }}>
                  <GripVertical size={13} color="var(--text-tertiary)" style={{ cursor: "grab" }} />
                  <span style={sp.fileIdx}>{idx + 1}</span>
                  <span style={sp.fileName}>{f.name}</span>
                  <button type="button" onClick={() => setSopFiles(a => a.filter(x => x.id !== f.id))} style={sp.fileRemove}><X size={11} /></button>
                </div>
              ))}
              <input ref={sopRef} type="file" multiple accept={SOP_ACCEPTS} style={{ display: "none" }} onChange={handleSOPFiles} />
              <button type="button" onClick={() => sopRef.current?.click()} style={sp.attachBtn}>
                <Upload size={12} /> Attach file
              </button>
            </div>
          )}

          {/* Machining Files (machine only) */}
          {!isWf && isMachine && (
            <div style={sp.section}>
              <div style={sp.sectionHead}>
                <Cpu size={13} color="var(--text-secondary)" />
                <span style={sp.sectionTitle}>Machining Files</span>
                {selMach && (
                  <span style={sp.sectionSub}>{MACH_ACCEPTS_MAP[selMach].replaceAll(",", " ·")}</span>
                )}
              </div>
              {/* Machining type selector */}
              <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Select machine type then attach
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 10 }}>
                {MACH_TYPES.map(mt => (
                  <button key={mt.key} type="button" onClick={() => setSelMach(selMach === mt.key ? null : mt.key)}
                    style={{
                      padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      border: `1.5px solid ${selMach === mt.key ? mt.color : "var(--border)"}`,
                      backgroundColor: selMach === mt.key ? `${mt.color}18` : "var(--bg)",
                      color: selMach === mt.key ? mt.color : "var(--text-secondary)",
                      transition: "all 0.12s",
                    }}>
                    {mt.label}
                  </button>
                ))}
              </div>
              {/* Machining file list */}
              {machFiles.map((f, idx) => {
                const mt = MACH_TYPES.find(m => m.key === f.machType);
                return (
                  <div key={f.id} draggable
                    onDragStart={() => setMachDrag(idx)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (machDrag !== null) { setMachFiles(a => reorder(a, machDrag, idx)); setMachDrag(null); } }}
                    style={{ ...sp.fileRow, opacity: machDrag === idx ? 0.4 : 1 }}>
                    <GripVertical size={13} color="var(--text-tertiary)" style={{ cursor: "grab" }} />
                    <span style={sp.fileIdx}>{idx + 1}</span>
                    {mt && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, backgroundColor: `${mt.color}18`, color: mt.color, flexShrink: 0 }}>
                        {mt.label}
                      </span>
                    )}
                    <span style={sp.fileName}>{f.name}</span>
                    <button type="button" onClick={() => setMachFiles(a => a.filter(x => x.id !== f.id))} style={sp.fileRemove}><X size={11} /></button>
                  </div>
                );
              })}
              <input ref={machRef} type="file" multiple style={{ display: "none" }} onChange={handleMachFiles} />
              <button type="button" disabled={!selMach} onClick={() => { if (selMach && machRef.current) { machRef.current.accept = MACH_ACCEPTS_MAP[selMach]; machRef.current.click(); } }}
                style={{ ...sp.attachBtn, opacity: selMach ? 1 : 0.4, cursor: selMach ? "pointer" : "not-allowed" }}>
                <Upload size={12} /> Attach {selMach ? MACH_TYPES.find(m => m.key === selMach)?.label : "—"} file
              </button>
            </div>
          )}

          {/* Parts & Materials */}
          {!isWf && (
            <div style={sp.section}>
              <div style={sp.sectionHead}>
                <Package size={13} color="var(--text-secondary)" />
                <span style={sp.sectionTitle}>Parts & Materials</span>
              </div>
              {/* Search + filter */}
              <div style={{ position: "relative" }}>
                {/* Input row */}
                <div style={{ position: "relative" }}>
                  <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
                  <input style={{ ...sp.input, paddingLeft: 30 }}
                    value={partQuery}
                    placeholder="Search IM / OS parts…"
                    onChange={e => { setPartQuery(e.target.value); setShowDrop(true); }}
                    onFocus={() => setShowDrop(true)}
                    onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                  />
                </div>

                {/* IM / OS filter slider — visible while dropdown is open */}
                {showDrop && (
                  <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                    {(["all", "OS", "IM"] as const).map(f => (
                      <button key={f} type="button"
                        onMouseDown={e => { e.preventDefault(); setPartFilter(f); }}
                        style={{
                          flex: 1, height: 26, borderRadius: 6, cursor: "pointer",
                          fontSize: 11, fontWeight: 600, transition: "all 0.12s",
                          border: `1.5px solid ${f === "OS" && partFilter === f ? "#3B82F6" : f === "IM" && partFilter === f ? "#9333EA" : "var(--border)"}`,
                          backgroundColor: f === "OS" && partFilter === f ? "rgba(59,130,246,0.12)" : f === "IM" && partFilter === f ? "rgba(147,51,234,0.12)" : partFilter === f ? "var(--surface)" : "transparent",
                          color: f === "OS" && partFilter === f ? "#3B82F6" : f === "IM" && partFilter === f ? "#9333EA" : partFilter === f ? "var(--text-primary)" : "var(--text-tertiary)",
                        }}>
                        {f === "all" ? "All" : f}
                      </button>
                    ))}
                  </div>
                )}

                {/* Results dropdown */}
                {showDrop && (
                  <div style={sp.dropdown}>
                    {filteredParts.length > 0
                      ? filteredParts.map(p => (
                          <button key={p.id} type="button" onMouseDown={() => addMaterial(p)} style={sp.dropItem}>
                            <span style={{ ...sp.typePill, backgroundColor: p.type === "OS" ? "rgba(59,130,246,0.12)" : "rgba(147,51,234,0.12)", color: p.type === "OS" ? "#3B82F6" : "#9333EA" }}>
                              {p.type}
                            </span>
                            {p.name}
                          </button>
                        ))
                      : (
                          <p style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "8px 12px" }}>
                            {partQuery.trim() ? "No parts found" : `No ${partFilter !== "all" ? partFilter + " " : ""}parts in library yet`}
                          </p>
                        )
                    }
                    <div style={{ borderTop: "1px solid var(--border)", marginTop: 2 }}>
                      <button type="button"
                        onMouseDown={() => {
                          setNewPartType(partFilter === "all" ? "OS" : partFilter);
                          setAddingPart(true);
                        }}
                        style={{ ...sp.dropItem, color: "var(--accent)", fontWeight: 600 }}>
                        <Plus size={12} /> Add new {partFilter !== "all" ? partFilter + " " : ""}part to library
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* New part full form */}
              {addingPart && (
                <div style={{
                  display: "flex", flexDirection: "column", gap: 8, marginTop: 8, padding: 14,
                  backgroundColor: "var(--surface)", borderRadius: 10,
                  border: `1px solid ${newPartType === "OS" ? "rgba(59,130,246,0.35)" : "rgba(147,51,234,0.35)"}`,
                }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: newPartType === "OS" ? "#3B82F6" : "#9333EA" }}>
                      New {newPartType} Part
                    </span>
                    {partFilter === "all" && (
                      <button type="button" onClick={() => setNewPartType(t => t === "OS" ? "IM" : "OS")}
                        style={{ ...sp.typeSmall, height: 22, padding: "0 8px", fontSize: 10,
                          backgroundColor: newPartType === "OS" ? "rgba(59,130,246,0.1)" : "rgba(147,51,234,0.1)",
                          color: newPartType === "OS" ? "#3B82F6" : "#9333EA",
                          borderColor: newPartType === "OS" ? "#3B82F6" : "#9333EA" }}>
                        Switch to {newPartType === "OS" ? "IM" : "OS"}
                      </button>
                    )}
                    <button type="button" onClick={() => setAddingPart(false)} style={sp.iconBtn}><X size={12} /></button>
                  </div>

                  {/* ── OS fields ── */}
                  {newPartType === "OS" && <>
                    <input autoFocus placeholder="Name *" value={newPart.name}
                      onChange={e => setNP({ name: e.target.value })} style={{ ...sp.input, height: 34 }} />
                    <input placeholder="Supplier" value={newPart.supplier}
                      onChange={e => setNP({ supplier: e.target.value })} style={{ ...sp.input, height: 34 }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <input placeholder="Barcode" value={newPart.barcode}
                        onChange={e => setNP({ barcode: e.target.value })} style={{ ...sp.input, height: 34 }} />
                      <input placeholder="Serial No." value={newPart.serial}
                        onChange={e => setNP({ serial: e.target.value })} style={{ ...sp.input, height: 34 }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <input type="number" placeholder="Qty in stock *" value={newPart.qtyStock}
                        onChange={e => setNP({ qtyStock: e.target.value })} style={{ ...sp.input, height: 34 }} />
                      <input type="number" placeholder="Min. threshold" value={newPart.minThreshold}
                        onChange={e => setNP({ minThreshold: e.target.value })} style={{ ...sp.input, height: 34 }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <input type="number" placeholder="Cost price (R) *" value={newPart.costPrice}
                        onChange={e => setNP({ costPrice: e.target.value })} style={{ ...sp.input, height: 34 }} />
                      <input type="number" placeholder="Sale price (R)" value={newPart.salePrice}
                        onChange={e => setNP({ salePrice: e.target.value })} style={{ ...sp.input, height: 34 }} />
                    </div>
                  </>}

                  {/* ── IM fields ── */}
                  {newPartType === "IM" && <>
                    <input autoFocus placeholder="Name *" value={newPart.name}
                      onChange={e => setNP({ name: e.target.value })} style={{ ...sp.input, height: 34 }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <input placeholder="Serial No." value={newPart.serial}
                        onChange={e => setNP({ serial: e.target.value })} style={{ ...sp.input, height: 34 }} />
                      <input type="number" placeholder="Qty in stock *" value={newPart.qtyStock}
                        onChange={e => setNP({ qtyStock: e.target.value })} style={{ ...sp.input, height: 34 }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <input type="number" placeholder="Min. threshold" value={newPart.minThreshold}
                        onChange={e => setNP({ minThreshold: e.target.value })} style={{ ...sp.input, height: 34 }} />
                      {/* Low stock alert toggle inline */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "0 10px", border: "1px solid var(--input-border)", borderRadius: 8, height: 34 }}>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Low stock alert</span>
                        <button type="button" onClick={() => setNP({ lowStockAlert: !newPart.lowStockAlert })}
                          style={{ width: 34, height: 18, borderRadius: 9, border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background-color 0.2s", backgroundColor: newPart.lowStockAlert ? "#DC2626" : "var(--border)" }}>
                          <span style={{ position: "absolute", top: 2, width: 14, height: 14, borderRadius: "50%", backgroundColor: "#fff", transition: "transform 0.2s", transform: newPart.lowStockAlert ? "translateX(18px)" : "translateX(2px)" }} />
                        </button>
                      </div>
                    </div>
                    <input placeholder="Assembly task name *" value={newPart.assemblyName}
                      onChange={e => setNP({ assemblyName: e.target.value })} style={{ ...sp.input, height: 34 }} />
                    <textarea placeholder="Assembly description…" value={newPart.assemblyDesc}
                      onChange={e => setNP({ assemblyDesc: e.target.value })} rows={2}
                      style={{ border: "1px solid var(--input-border)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text-primary)", backgroundColor: "var(--surface)", resize: "none", fontFamily: "inherit", outline: "none" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <input type="number" placeholder="Max time (min)" value={newPart.maxMinutes}
                        onChange={e => setNP({ maxMinutes: e.target.value })} style={{ ...sp.input, height: 34 }} />
                      <input type="number" placeholder="Labour (R/hr)" value={newPart.labourCostPerHour}
                        onChange={e => setNP({ labourCostPerHour: e.target.value })} style={{ ...sp.input, height: 34 }} />
                    </div>
                    {/* OS sub-components */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>OS Stock Items</span>
                        <button type="button"
                          onClick={() => setNP({ osComponents: [...newPart.osComponents, { id: `osc-${Date.now()}`, partOsId: "", qty: "1" }] })}
                          style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, background: "none", border: "1px solid var(--border)", borderRadius: 5, padding: "3px 8px", cursor: "pointer", color: "var(--text-secondary)" }}>
                          <Plus size={10} strokeWidth={2} /> Add
                        </button>
                      </div>
                      {newPart.osComponents.length === 0
                        ? <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>No OS components yet</p>
                        : newPart.osComponents.map((c, i) => (
                            <div key={c.id} style={{ display: "flex", gap: 5, marginBottom: 4, alignItems: "center" }}>
                              <select value={c.partOsId}
                                onChange={e => setNP({ osComponents: newPart.osComponents.map((x, xi) => xi === i ? { ...x, partOsId: e.target.value } : x) })}
                                style={{ ...sp.input, flex: 1, height: 32, fontSize: 12 }}>
                                <option value="">Choose OS part…</option>
                                {parts.filter(p => p.type === "OS").map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                              <input type="number" placeholder="Qty" value={c.qty}
                                onChange={e => setNP({ osComponents: newPart.osComponents.map((x, xi) => xi === i ? { ...x, qty: e.target.value } : x) })}
                                style={{ ...sp.input, width: 60, height: 32 }} />
                              <button type="button"
                                onClick={() => setNP({ osComponents: newPart.osComponents.filter((_, xi) => xi !== i) })}
                                style={sp.fileRemove}><X size={11} /></button>
                            </div>
                          ))
                      }
                    </div>
                  </>}

                  <button type="button" onClick={handleNewPart}
                    style={{ ...sp.primaryBtn, height: 36, fontSize: 13, marginTop: 4 }}>
                    Add {newPartType} part to library & task
                  </button>
                </div>
              )}
              {/* Selected materials */}
              {materials.map(m => (
                <div key={m.id} style={sp.matRow}>
                  <span style={{ ...sp.typePill, backgroundColor: m.partType === "OS" ? "rgba(59,130,246,0.12)" : "rgba(147,51,234,0.12)", color: m.partType === "OS" ? "#3B82F6" : "#9333EA" }}>
                    {m.partType}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)" }}>{m.name}</span>
                  <input type="number" min="1" value={m.qty}
                    onChange={e => setMaterials(ms => ms.map(x => x.id === m.id ? { ...x, qty: parseInt(e.target.value, 10) || 1 } : x))}
                    style={{ ...sp.input, width: 56, height: 28, fontSize: 12, padding: "0 6px", textAlign: "center" }} />
                  <button type="button" onClick={() => setMaterials(ms => ms.filter(x => x.id !== m.id))} style={sp.fileRemove}><X size={11} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button type="submit" style={{ ...sp.primaryBtn, flex: 1 }}>
              {isEdit ? "Save changes" : "Create"}
            </button>
            <button type="button" onClick={onClose} style={sp.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */
export function TasksContent({ productId, hideHeader = false }: { productId: string; hideHeader?: boolean }) {
  const [panel,        setPanel]        = useState<PanelState>(null);
  const [expandedWfs,  setExpandedWfs]  = useState<Set<string>>(new Set());
  const [expandedTasks,setExpandedTasks]= useState<Set<string>>(new Set());
  const [hoveredWf,    setHoveredWf]    = useState<string | null>(null);
  const [hoveredTask,  setHoveredTask]  = useState<string | null>(null);
  const [taskMeta,       setTaskMeta]       = useState<Record<string, TaskMeta>>({});
  const [taskOptions,      setTaskOptions]      = useState<Record<string, LocalTask[]>>({});
  const [wfOptions,        setWfOptions]        = useState<Record<string, WfOption[]>>({});
  const [expandedWfOpts,   setExpandedWfOpts]   = useState<Set<string>>(new Set());
  const [hoveredTaskOpt,   setHoveredTaskOpt]   = useState<string | null>(null);
  const [hoveredWfOpt,     setHoveredWfOpt]     = useState<string | null>(null);
  const [hoveredWfOptTask, setHoveredWfOptTask] = useState<string | null>(null);
  const [dragTaskOpt,      setDragTaskOpt]      = useState<{ taskId: string; parentPath: string[]; optId: string } | null>(null);
  const [overTaskOptId,    setOverTaskOptId]    = useState<string | null>(null);
  const [dragWfOpt,        setDragWfOpt]        = useState<{ wfId: string; parentPath: string[]; optId: string } | null>(null);
  const [overWfOptId,      setOverWfOptId]      = useState<string | null>(null);
  const [dragWfOptTask,    setDragWfOptTask]    = useState<{ wfId: string; optPath: string[]; taskId: string } | null>(null);
  const [overWfOptTaskId,  setOverWfOptTaskId]  = useState<string | null>(null);
  const [dragWfId,       setDragWfId]       = useState<string | null>(null);
  const [overWfId,     setOverWfId]     = useState<string | null>(null);
  const [dragTask,     setDragTask]     = useState<{ wfId: string; taskId: string } | null>(null);
  const [overTaskId,   setOverTaskId]   = useState<string | null>(null);
  // ref so onDragOver always reads the live value (state update may be async)
  const dragTaskRef = useRef<{ wfId: string; taskId: string } | null>(null);

  const { setData, setSelectedProduct, tasks, workflows, updateTask, addWorkflow, removeWorkflow, removeTaskFromWorkflow, partResources } =
    useManufacturingStore();

  useEffect(() => {
    const state = useManufacturingStore.getState();
    if (state.tasks.length === 0) {
      setData(DEMO);
      setSelectedProduct({ id: productId, name: "Product", baseTasks: DEMO.tasks.map(t => t.id), options: [] });
      setExpandedWfs(new Set(DEMO.workflows.map(w => w.id)));
    }
  }, [productId, setData, setSelectedProduct]);

  const toggleWf   = (id: string) => setExpandedWfs(s   => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleTask = (id: string) => setExpandedTasks(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleWfDrop = (toId: string) => {
    if (!dragWfId || dragWfId === toId) return;
    useManufacturingStore.setState(s => {
      const wfs = [...s.workflows];
      const from = wfs.findIndex(w => w.id === dragWfId);
      const to   = wfs.findIndex(w => w.id === toId);
      if (from === -1 || to === -1) return s;
      return { workflows: reorder(wfs, from, to) };
    });
    setDragWfId(null); setOverWfId(null);
  };

  const handleTaskDrop = (toTaskId: string, wfId: string) => {
    const dt = dragTaskRef.current;
    if (!dt || dt.taskId === toTaskId || dt.wfId !== wfId) return;
    useManufacturingStore.setState(s => ({
      workflows: s.workflows.map(w => {
        if (w.id !== wfId) return w;
        const tids = [...w.taskIds];
        const from = tids.indexOf(dt.taskId);
        const to   = tids.indexOf(toTaskId);
        if (from === -1 || to === -1) return w;
        return { ...w, taskIds: reorder(tids, from, to) };
      }),
    }));
    dragTaskRef.current = null;
    setDragTask(null); setOverTaskId(null);
  };

  const handleTaskOptDrop = (toOptId: string, taskId: string, parentPath: string[]) => {
    if (!dragTaskOpt || dragTaskOpt.taskId !== taskId || dragTaskOpt.optId === toOptId) return;
    if (dragTaskOpt.parentPath.join("/") !== parentPath.join("/")) return;
    setTaskOptions(p => {
      const root = p[taskId] ?? [];
      const siblings = getTaskOptsAt(root, parentPath);
      const from = siblings.findIndex(o => o.id === dragTaskOpt.optId);
      const to   = siblings.findIndex(o => o.id === toOptId);
      if (from === -1 || to === -1) return p;
      return { ...p, [taskId]: reorderTaskOptsAt(root, parentPath, from, to) };
    });
    setDragTaskOpt(null); setOverTaskOptId(null);
  };

  const handleWfOptDrop = (toOptId: string, wfId: string, parentPath: string[]) => {
    if (!dragWfOpt || dragWfOpt.wfId !== wfId || dragWfOpt.optId === toOptId) return;
    if (dragWfOpt.parentPath.join("/") !== parentPath.join("/")) return;
    setWfOptions(p => {
      const root = p[wfId] ?? [];
      const siblings = getWfOptsAt(root, parentPath);
      const from = siblings.findIndex(o => o.id === dragWfOpt.optId);
      const to   = siblings.findIndex(o => o.id === toOptId);
      if (from === -1 || to === -1) return p;
      return { ...p, [wfId]: reorderWfOptsAt(root, parentPath, from, to) };
    });
    setDragWfOpt(null); setOverWfOptId(null);
  };

  const handleWfOptTaskDrop = (toTaskId: string, wfId: string, optPath: string[]) => {
    if (!dragWfOptTask || dragWfOptTask.optPath.join("/") !== optPath.join("/") || dragWfOptTask.taskId === toTaskId) return;
    setWfOptions(p => ({
      ...p,
      [wfId]: updateWfOptAtPath(p[wfId] ?? [], optPath, o => {
        const from = o.tasks.findIndex(t => t.id === dragWfOptTask.taskId);
        const to   = o.tasks.findIndex(t => t.id === toTaskId);
        if (from === -1 || to === -1) return o;
        return { ...o, tasks: reorder([...o.tasks], from, to) };
      }),
    }));
    setDragWfOptTask(null); setOverWfOptTaskId(null);
  };

  const closePanel = () => setPanel(null);

  const handleSave = (data: SaveData) => {
    if (!panel) return;
    if (panel.mode === "new-workflow") {
      addWorkflow({ name: data.name, taskIds: [] });
      setTimeout(() => {
        const wfs = useManufacturingStore.getState().workflows;
        const last = wfs[wfs.length - 1];
        if (last) setExpandedWfs(s => new Set([...s, last.id]));
      }, 0);
    } else if (panel.mode === "edit-workflow") {
      useManufacturingStore.setState(s => ({
        workflows: s.workflows.map(w => w.id === panel.wfId ? { ...w, name: data.name } : w),
      }));
    } else if (panel.mode === "new-task" && data.maxDuration && data.optionSet && data.meta) {
      const newId = `t-${Date.now()}`;
      useManufacturingStore.setState(s => ({
        tasks: [...s.tasks, { id: newId, name: data.name, duration: data.maxDuration!, optionSet: data.optionSet! }],
        workflows: s.workflows.map(w => w.id === panel.targetWfId ? { ...w, taskIds: [...w.taskIds, newId] } : w),
      }));
      setTaskMeta(m => ({ ...m, [newId]: data.meta! }));
    } else if (panel.mode === "edit-task" && data.maxDuration && data.optionSet && data.meta) {
      updateTask(panel.taskId, { name: data.name, duration: data.maxDuration, optionSet: data.optionSet });
      setTaskMeta(m => ({ ...m, [panel.taskId]: data.meta! }));
    } else if (panel.mode === "new-task-option" && data.maxDuration && data.optionSet && data.meta) {
      const id = `topt-${Date.now()}`;
      const newOpt: LocalTask = { id, name: data.name, duration: data.maxDuration!, optionSet: data.optionSet!, meta: data.meta!, options: [] };
      setTaskOptions(p => ({ ...p, [panel.taskId]: addTaskOpt(p[panel.taskId] ?? [], panel.parentPath, newOpt) }));
    } else if (panel.mode === "edit-task-option" && data.maxDuration && data.optionSet && data.meta) {
      setTaskOptions(p => ({ ...p, [panel.taskId]: updateTaskOptById(p[panel.taskId] ?? [], panel.parentPath, panel.optId, o => ({ ...o, name: data.name, duration: data.maxDuration!, optionSet: data.optionSet!, meta: data.meta! })) }));
    } else if (panel.mode === "new-workflow-option") {
      const id = `wfopt-${Date.now()}`;
      setWfOptions(p => ({ ...p, [panel.wfId]: addWfOpt(p[panel.wfId] ?? [], panel.parentPath, { id, name: data.name, tasks: [], options: [] }) }));
    } else if (panel.mode === "edit-workflow-option") {
      setWfOptions(p => ({ ...p, [panel.wfId]: updateWfOptById(p[panel.wfId] ?? [], panel.parentPath, panel.optId, o => ({ ...o, name: data.name })) }));
    } else if (panel.mode === "new-task-in-wf-option" && data.maxDuration && data.optionSet && data.meta) {
      const id = `topt-${Date.now()}`;
      const newTask: LocalTask = { id, name: data.name, duration: data.maxDuration!, optionSet: data.optionSet!, meta: data.meta!, options: [] };
      setWfOptions(p => ({ ...p, [panel.wfId]: updateWfOptAtPath(p[panel.wfId] ?? [], panel.optPath, o => ({ ...o, tasks: [...o.tasks, newTask] })) }));
    } else if (panel.mode === "edit-task-in-wf-option" && data.maxDuration && data.optionSet && data.meta) {
      setWfOptions(p => ({ ...p, [panel.wfId]: updateWfOptAtPath(p[panel.wfId] ?? [], panel.optPath, o => ({ ...o, tasks: o.tasks.map(t => t.id === panel.taskId ? { ...t, name: data.name, duration: data.maxDuration!, optionSet: data.optionSet!, meta: data.meta! } : t) })) }));
    }
    closePanel();
  };

  const totalTime = tasks.reduce((s, t) => s + t.duration, 0);

  /* ── Recursive option renderers ─────────────────────────────── */
  const renderTaskOptions = (opts: LocalTask[], taskId: string, parentPath: string[], depth: number): React.ReactNode =>
    opts.map((opt, oi) => {
      const letter  = String.fromCharCode(66 + oi);
      const isHov   = hoveredTaskOpt === opt.id;
      const isDrag  = dragTaskOpt?.optId === opt.id && dragTaskOpt.taskId === taskId;
      const isOver  = overTaskOptId === opt.id && dragTaskOpt?.taskId === taskId && dragTaskOpt.parentPath.join("/") === parentPath.join("/");
      return (
        <React.Fragment key={opt.id}>
          <div
            draggable
            onDragStart={e => { e.stopPropagation(); setDragTaskOpt({ taskId, parentPath, optId: opt.id }); }}
            onDragEnd={() => { setDragTaskOpt(null); setOverTaskOptId(null); }}
            onDragOver={e => { if (dragTaskOpt?.taskId === taskId && dragTaskOpt.parentPath.join("/") === parentPath.join("/") && dragTaskOpt.optId !== opt.id) { e.preventDefault(); setOverTaskOptId(opt.id); } }}
            onDragLeave={() => setOverTaskOptId(null)}
            onDrop={() => handleTaskOptDrop(opt.id, taskId, parentPath)}
            onMouseEnter={() => setHoveredTaskOpt(opt.id)}
            onMouseLeave={() => setHoveredTaskOpt(null)}
            style={{ ...s.taskRow, backgroundColor: isOver ? "rgba(245,99,0,0.08)" : `rgba(245,99,0,${Math.min(0.03 + depth * 0.02, 0.1)})`, borderBottom: "1px solid var(--border)", paddingLeft: 28 + depth * 12, opacity: isDrag ? 0.4 : 1, transition: "background-color 0.1s, opacity 0.15s" }}>
            <GripVertical size={12} color="var(--text-tertiary)" style={{ cursor: "grab", flexShrink: 0 }} />
            <span style={s.optionBadge}>{letter}</span>
            {opt.options.length > 0 && <span style={s.optionBadge}>A</span>}
            <span style={s.taskName}>{opt.name}</span>
            <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "2px 6px", flexShrink: 0, backgroundColor: opt.optionSet === "machine" ? "rgba(37,99,235,0.12)" : "rgba(5,150,105,0.12)", color: opt.optionSet === "machine" ? "#2563EB" : "#059669" }}>{opt.optionSet}</span>
            <span style={s.taskDur}>{fmtMin(opt.duration)}</span>
            <button style={{ ...s.actionBtn, opacity: isHov ? 1 : 0, transition: "opacity 0.12s", color: "var(--accent)" }}
              onClick={() => setPanel({ mode: "new-task-option", taskId, parentPath: [...parentPath, opt.id] })}
              title="Add sub-option"><GitBranch size={11} /></button>
            <button style={{ ...s.actionBtn, opacity: isHov ? 1 : 0, transition: "opacity 0.12s" }}
              onClick={() => setPanel({ mode: "edit-task-option", taskId, parentPath, optId: opt.id, name: opt.name, maxDuration: String(opt.duration), optionSet: opt.optionSet, meta: opt.meta })}
              title="Edit option"><Pencil size={11} /></button>
            <button style={{ ...s.actionBtn, opacity: isHov ? 1 : 0, transition: "opacity 0.12s" }}
              onClick={() => setTaskOptions(p => ({ ...p, [taskId]: removeTaskOptById(p[taskId] ?? [], parentPath, opt.id) }))}
              title="Remove option"><X size={11} /></button>
          </div>
          {renderTaskOptions(opt.options, taskId, [...parentPath, opt.id], depth + 1)}
        </React.Fragment>
      );
    });

  const renderWfOptions = (opts: WfOption[], wfId: string, parentPath: string[], depth: number): React.ReactNode =>
    opts.map((opt, oi) => {
      const letter    = String.fromCharCode(66 + oi);
      const isOptOpen = expandedWfOpts.has(opt.id);
      const isHov     = hoveredWfOpt === opt.id;
      const isDrag    = dragWfOpt?.optId === opt.id && dragWfOpt.wfId === wfId;
      const isOver    = overWfOptId === opt.id && dragWfOpt?.wfId === wfId && dragWfOpt.parentPath.join("/") === parentPath.join("/");
      const optPath   = [...parentPath, opt.id];
      return (
        <React.Fragment key={opt.id}>
          <div
            draggable
            onDragStart={e => { e.stopPropagation(); setDragWfOpt({ wfId, parentPath, optId: opt.id }); }}
            onDragEnd={() => { setDragWfOpt(null); setOverWfOptId(null); }}
            onDragOver={e => { if (dragWfOpt?.wfId === wfId && dragWfOpt.parentPath.join("/") === parentPath.join("/") && dragWfOpt.optId !== opt.id) { e.preventDefault(); setOverWfOptId(opt.id); } }}
            onDragLeave={() => setOverWfOptId(null)}
            onDrop={() => handleWfOptDrop(opt.id, wfId, parentPath)}
            onMouseEnter={() => setHoveredWfOpt(opt.id)}
            onMouseLeave={() => setHoveredWfOpt(null)}
            style={{ margin: `0 10px 8px`, marginLeft: 10 + depth * 12, border: `1.5px dashed ${isOver ? "#F56300" : "#F5630055"}`, borderRadius: 8, overflow: "hidden", opacity: isDrag ? 0.4 : 1, transition: "opacity 0.15s, border-color 0.1s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", backgroundColor: `rgba(245,99,0,${Math.min(0.04 + depth * 0.02, 0.12)})` }}>
              <GripVertical size={14} color="var(--text-tertiary)" style={{ cursor: "grab", flexShrink: 0 }} />
              <button onClick={() => setExpandedWfOpts(prev => { const n = new Set(prev); n.has(opt.id) ? n.delete(opt.id) : n.add(opt.id); return n; })} style={s.chevron}>
                {isOptOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
              <span style={s.optionBadge}>{letter}</span>
              {opt.options.length > 0 && <span style={s.optionBadge}>A</span>}
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{opt.name}</span>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{opt.tasks.length} tasks</span>
              <button style={{ ...s.actionBtn, opacity: isHov ? 1 : 0, transition: "opacity 0.12s", color: "var(--accent)" }}
                onClick={() => setPanel({ mode: "new-workflow-option", wfId, parentPath: optPath })}
                title="Add sub-option"><GitBranch size={12} /></button>
              <button style={{ ...s.actionBtn, opacity: isHov ? 1 : 0, transition: "opacity 0.12s" }}
                onClick={() => setPanel({ mode: "edit-workflow-option", wfId, parentPath, optId: opt.id, name: opt.name })}
                title="Edit option"><Pencil size={12} /></button>
              <button style={s.actionBtn}
                onClick={() => setWfOptions(p => ({ ...p, [wfId]: removeWfOptById(p[wfId] ?? [], parentPath, opt.id) }))}
                title="Remove option"><X size={12} /></button>
            </div>
            {isOptOpen && (
              <div style={{ borderTop: "1px dashed #F5630033" }}>
                {opt.tasks.map((ot, ti) => (
                  <div key={ot.id}
                    draggable
                    onDragStart={e => { e.stopPropagation(); setDragWfOptTask({ wfId, optPath, taskId: ot.id }); }}
                    onDragEnd={() => { setDragWfOptTask(null); setOverWfOptTaskId(null); }}
                    onDragOver={e => { if (dragWfOptTask?.optPath.join("/") === optPath.join("/") && dragWfOptTask.taskId !== ot.id) { e.preventDefault(); setOverWfOptTaskId(ot.id); } }}
                    onDragLeave={() => setOverWfOptTaskId(null)}
                    onDrop={() => handleWfOptTaskDrop(ot.id, wfId, optPath)}
                    onMouseEnter={() => setHoveredWfOptTask(ot.id)}
                    onMouseLeave={() => setHoveredWfOptTask(null)}
                    style={{ ...s.taskRow, borderBottom: "1px solid var(--border)", opacity: dragWfOptTask?.taskId === ot.id ? 0.4 : 1, backgroundColor: overWfOptTaskId === ot.id ? "rgba(245,99,0,0.05)" : "transparent", transition: "opacity 0.15s, background-color 0.1s" }}>
                    <GripVertical size={12} color="var(--text-tertiary)" style={{ cursor: "grab", flexShrink: 0 }} />
                    <span style={s.taskIdx}>{ti + 1}</span>
                    <span style={s.taskName}>{ot.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "2px 6px", flexShrink: 0, backgroundColor: ot.optionSet === "machine" ? "rgba(37,99,235,0.12)" : "rgba(5,150,105,0.12)", color: ot.optionSet === "machine" ? "#2563EB" : "#059669" }}>{ot.optionSet}</span>
                    <span style={s.taskDur}>{fmtMin(ot.duration)}</span>
                    <button style={{ ...s.actionBtn, opacity: hoveredWfOptTask === ot.id ? 1 : 0, transition: "opacity 0.12s" }}
                      onClick={() => setPanel({ mode: "edit-task-in-wf-option", wfId, optPath, taskId: ot.id, name: ot.name, maxDuration: String(ot.duration), optionSet: ot.optionSet, meta: ot.meta })}
                      title="Edit task"><Pencil size={11} /></button>
                    <button style={{ ...s.actionBtn, opacity: hoveredWfOptTask === ot.id ? 1 : 0, transition: "opacity 0.12s" }}
                      onClick={() => setWfOptions(p => ({ ...p, [wfId]: updateWfOptAtPath(p[wfId] ?? [], optPath, o => ({ ...o, tasks: o.tasks.filter(x => x.id !== ot.id) })) }))}
                      title="Remove task"><X size={11} /></button>
                  </div>
                ))}
                <button style={s.addTaskSkeleton} onClick={() => setPanel({ mode: "new-task-in-wf-option", wfId, optPath })}>
                  <Plus size={13} strokeWidth={2} /> Add task to option
                </button>
              </div>
            )}
          </div>
          {renderWfOptions(opt.options, wfId, optPath, depth + 1)}
        </React.Fragment>
      );
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: hideHeader ? undefined : "calc(100vh - 100px)", gap: 0 }}>

      {/* Header */}
      {!hideHeader && (
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/processes" style={s.back}>
            <ArrowLeft size={15} strokeWidth={2} /> Processes
          </Link>
          <h2 style={s.title}>Task Manager</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={s.pill}><Clock size={11} color="var(--text-secondary)" /><span>{fmtMin(totalTime)} total</span></div>
          <div style={s.pill}><Workflow size={11} color="var(--text-secondary)" /><span>{workflows.length} workflows</span></div>
        </div>
      </div>
      )}

      {/* Section intro */}
      <div style={{ flexShrink: 0, marginBottom: 16 }}>
        <h3 style={s.sectionTitle}>Workflows</h3>
        <p style={s.sectionSub}>Group tasks into workflows. Drag a workflow onto a station node in the Planner to assign all its tasks at once.</p>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {workflows.map(wf => {
            const wfTasks  = tasks.filter(t => wf.taskIds.includes(t.id));
            const wfTime   = wfTasks.reduce((sum, t) => sum + t.duration, 0);
            const isWfOpen = expandedWfs.has(wf.id);
            const hovered  = hoveredWf === wf.id;

            return (
              <div key={wf.id}
                style={{
                  ...s.wfCard,
                  opacity:   dragWfId === wf.id ? 0.4 : 1,
                  boxShadow: overWfId === wf.id && dragWfId !== wf.id ? "0 0 0 2px var(--accent)" : "none",
                  transition: "opacity 0.15s, box-shadow 0.1s",
                }}
                onMouseEnter={() => setHoveredWf(wf.id)}
                onMouseLeave={() => setHoveredWf(null)}
                onDragOver={e => { if (dragWfId && dragWfId !== wf.id) { e.preventDefault(); setOverWfId(wf.id); } }}
                onDragLeave={() => setOverWfId(null)}
                onDrop={() => handleWfDrop(wf.id)}
              >

                {/* Workflow header row */}
                <div
                  draggable
                  onDragStart={e => { e.stopPropagation(); setDragWfId(wf.id); }}
                  onDragEnd={() => { setDragWfId(null); setOverWfId(null); }}
                  style={s.wfHead}
                >
                  <GripVertical size={14} color="var(--text-tertiary)" style={{ cursor: "grab", flexShrink: 0, marginRight: -4 }} />
                  <button onClick={() => toggleWf(wf.id)} style={s.chevron}>
                    {isWfOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <Workflow size={14} color="#F56300" />
                  <span style={s.wfName}>{wf.name}</span>
                  {(wfOptions[wf.id] ?? []).length > 0 && (
                    <span style={s.optionBadge}>A</span>
                  )}
                  <span style={s.wfMeta}>{wfTasks.length} tasks · {fmtMin(wfTime)} max</span>
                  <div style={{ flex: 1 }} />
                  <button
                    style={{ ...s.actionBtn, opacity: hovered ? 1 : 0, transition: "opacity 0.12s", color: "var(--accent)" }}
                    onClick={() => setPanel({ mode: "new-workflow-option", wfId: wf.id, parentPath: [] })}
                    title="Add workflow option"
                  >
                    <GitBranch size={12} />
                  </button>
                  <button
                    style={{ ...s.actionBtn, opacity: hovered ? 1 : 0, transition: "opacity 0.12s" }}
                    onClick={() => setPanel({ mode: "edit-workflow", wfId: wf.id, name: wf.name })}
                    title="Edit workflow"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    style={{ ...s.actionBtn, opacity: hovered ? 1 : 0, transition: "opacity 0.12s" }}
                    onClick={() => removeWorkflow(wf.id)}
                    title="Remove workflow"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Expanded tasks */}
                {isWfOpen && (
                  <div style={{ borderTop: "1px solid var(--border)" }}>
                    {wfTasks.map((t, idx) => {
                      const isTaskOpen = expandedTasks.has(t.id);
                      const taskHov    = hoveredTask === t.id;
                      const meta       = taskMeta[t.id] ?? blankMeta();
                      const hasMeta    = meta.sopFiles.length > 0 || meta.machFiles.length > 0 || meta.materials.length > 0 || (t.optionSet === "human" && meta.numPeople > 1);

                      return (
                        <div key={t.id}
                          draggable
                          onDragStart={e => { e.stopPropagation(); const info = { wfId: wf.id, taskId: t.id }; dragTaskRef.current = info; setDragTask(info); }}
                          onDragEnd={() => { dragTaskRef.current = null; setDragTask(null); setOverTaskId(null); }}
                          onDragOver={e => { const dt = dragTaskRef.current; if (dt?.wfId === wf.id && dt.taskId !== t.id) { e.preventDefault(); setOverTaskId(t.id); } }}
                          onDragLeave={() => setOverTaskId(null)}
                          onDrop={() => handleTaskDrop(t.id, wf.id)}
                          style={{ opacity: dragTask?.taskId === t.id ? 0.4 : 1, backgroundColor: overTaskId === t.id && dragTask?.wfId === wf.id ? "rgba(245,99,0,0.05)" : "transparent", transition: "opacity 0.15s, background-color 0.1s" }}
                          onMouseEnter={() => setHoveredTask(t.id)}
                          onMouseLeave={() => setHoveredTask(null)}>

                          {/* Task row */}
                          <div style={{ ...s.taskRow, borderBottom: isTaskOpen ? "none" : "1px solid var(--border)" }}>
                            <GripVertical size={12} color="var(--text-tertiary)" style={{ cursor: "grab", flexShrink: 0 }} />
                            <button onClick={() => toggleTask(t.id)} style={s.chevron}>
                              {isTaskOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                            <span style={s.taskIdx}>{idx + 1}</span>
                            <span style={s.taskName}>{t.name}</span>
                            {(taskOptions[t.id] ?? []).length > 0 && (
                              <span style={s.optionBadge}>A</span>
                            )}
                            <span style={{
                              fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "2px 6px", flexShrink: 0,
                              backgroundColor: t.optionSet === "machine" ? "rgba(37,99,235,0.12)" : "rgba(5,150,105,0.12)",
                              color: t.optionSet === "machine" ? "#2563EB" : "#059669",
                            }}>
                              {t.optionSet}
                            </span>
                            <span style={s.taskDur}>{fmtMin(t.duration)}</span>
                            <button
                              style={{ ...s.actionBtn, opacity: taskHov ? 1 : 0, transition: "opacity 0.12s", color: "var(--accent)" }}
                              onClick={() => setPanel({ mode: "new-task-option", taskId: t.id, parentPath: [] })}
                              title="Add option"
                            >
                              <GitBranch size={11} />
                            </button>
                            <button
                              style={{ ...s.actionBtn, opacity: taskHov ? 1 : 0, transition: "opacity 0.12s" }}
                              onClick={() => setPanel({ mode: "edit-task", taskId: t.id, name: t.name, maxDuration: String(t.duration), optionSet: t.optionSet, meta })}
                              title="Edit task"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              style={{ ...s.actionBtn, opacity: taskHov ? 1 : 0, transition: "opacity 0.12s" }}
                              onClick={() => removeTaskFromWorkflow(wf.id, t.id)}
                              title="Remove task"
                            >
                              <X size={12} />
                            </button>
                          </div>

                          {/* Task options — recursive */}
                          {renderTaskOptions(taskOptions[t.id] ?? [], t.id, [], 0)}

                          {/* Expanded task detail */}
                          {isTaskOpen && (
                            <div style={s.taskDetail}>
                              {t.optionSet === "human" && (
                                <div style={s.detailRow}>
                                  <Users size={11} color="var(--text-tertiary)" />
                                  <span style={s.detailLabel}>People required</span>
                                  <span style={s.detailVal}>{meta.numPeople}</span>
                                </div>
                              )}
                              {/* SOPs */}
                              <div style={s.detailRow}>
                                <FileText size={11} color="var(--text-tertiary)" />
                                <span style={s.detailLabel}>SOPs</span>
                                {meta.sopFiles.length === 0
                                  ? <span style={s.detailEmpty}>None — click ✏ to attach</span>
                                  : <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                      {meta.sopFiles.map((f, i) => (
                                        <span key={f.id} style={s.detailFile}><span style={s.fileNumBadge}>{i + 1}</span>{f.name}</span>
                                      ))}
                                    </div>
                                }
                              </div>
                              {/* Machining files */}
                              {t.optionSet === "machine" && (
                                <div style={s.detailRow}>
                                  <Cpu size={11} color="var(--text-tertiary)" />
                                  <span style={s.detailLabel}>Machining files</span>
                                  {meta.machFiles.length === 0
                                    ? <span style={s.detailEmpty}>None — click ✏ to attach</span>
                                    : <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        {meta.machFiles.map((f, i) => {
                                          const mt = MACH_TYPES.find(m => m.key === f.machType);
                                          return (
                                            <span key={f.id} style={s.detailFile}>
                                              <span style={s.fileNumBadge}>{i + 1}</span>
                                              {mt && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 3, backgroundColor: `${mt.color}18`, color: mt.color }}>{mt.label}</span>}
                                              {f.name}
                                            </span>
                                          );
                                        })}
                                      </div>
                                  }
                                </div>
                              )}
                              {/* Materials */}
                              <div style={s.detailRow}>
                                <Package size={11} color="var(--text-tertiary)" />
                                <span style={s.detailLabel}>Materials</span>
                                {meta.materials.length === 0
                                  ? <span style={s.detailEmpty}>None — click ✏ to add</span>
                                  : <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                      {meta.materials.map(m => (
                                        <span key={m.id} style={s.matChip}>
                                          <span style={{ ...s.typePill, backgroundColor: m.partType === "OS" ? "rgba(59,130,246,0.12)" : "rgba(147,51,234,0.12)", color: m.partType === "OS" ? "#3B82F6" : "#9333EA" }}>
                                            {m.partType}
                                          </span>
                                          {m.name} <span style={{ color: "var(--text-tertiary)" }}>×{m.qty}</span>
                                        </span>
                                      ))}
                                    </div>
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add task skeleton */}
                    <button style={s.addTaskSkeleton} onClick={() => setPanel({ mode: "new-task", targetWfId: wf.id })}>
                      <Plus size={13} strokeWidth={2} /> Add task
                    </button>

                    {/* Workflow options — recursive */}
                    {renderWfOptions(wfOptions[wf.id] ?? [], wf.id, [], 0)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add workflow skeleton */}
          <button style={s.addWfSkeleton} onClick={() => setPanel({ mode: "new-workflow" })}>
            <Plus size={14} strokeWidth={2} /> Add Workflow
          </button>
        </div>
      </div>

      <SlidePanel panel={panel} parts={partResources as PartRes[]} onClose={closePanel} onSave={handleSave} />
    </div>
  );
}

/* ── Page styles ────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  header:      { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 0 14px", flexShrink: 0 },
  back:        { display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", textDecoration: "none", fontSize: 13, fontWeight: 500 },
  title:       { fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" },
  pill:        { display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: 999, fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 },
  sectionTitle:{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" },
  sectionSub:  { fontSize: 12, color: "var(--text-secondary)", marginTop: 3, maxWidth: 480 },
  /* Workflow card */
  wfCard:      { backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" },
  wfHead:      { display: "flex", alignItems: "center", gap: 10, padding: "11px 14px" },
  wfName:      { fontSize: 14, fontWeight: 700, color: "var(--text-primary)" },
  wfMeta:      { fontSize: 12, color: "var(--text-secondary)" },
  chevron:     { background: "none", border: "none", cursor: "pointer", display: "flex", color: "var(--text-tertiary)", padding: 2, flexShrink: 0 },
  actionBtn:   { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", padding: 4, borderRadius: 4, flexShrink: 0, pointerEvents: "auto" },
  /* Task rows */
  taskRow:     { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px" },
  taskIdx:     { width: 20, height: 20, borderRadius: "50%", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-secondary)", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  taskName:    { flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 },
  taskDur:     { fontSize: 11, color: "var(--text-tertiary)", width: 44, textAlign: "right", flexShrink: 0 },
  /* Task detail expand */
  taskDetail:  { padding: "10px 14px 12px 48px", backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 },
  detailRow:   { display: "flex", alignItems: "flex-start", gap: 8 },
  detailLabel: { fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", width: 110, flexShrink: 0, paddingTop: 1, textTransform: "uppercase", letterSpacing: "0.05em" },
  detailVal:   { fontSize: 13, color: "var(--text-primary)", fontWeight: 500 },
  detailEmpty: { fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic" },
  detailFile:  { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-primary)" },
  fileNumBadge:{ fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: "50%", backgroundColor: "var(--border)", color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  matChip:     { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 999, border: "1px solid var(--border)", backgroundColor: "var(--bg)", fontSize: 12, color: "var(--text-primary)" },
  typePill:    { fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 3 },
  /* Option badge */
  optionBadge: { fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, backgroundColor: "rgba(245,99,0,0.15)", color: "#F56300", flexShrink: 0, letterSpacing: "0.04em" },
  /* Skeleton buttons */
  addTaskSkeleton: { width: "100%", height: 36, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "1.5px dashed var(--border)", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)", margin: "6px 0" },
  addWfSkeleton:   { width: "100%", height: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "2px dashed var(--border)", borderRadius: 12, background: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--text-tertiary)" },
};

/* ── Panel styles ───────────────────────────────────────────────── */
const sp: Record<string, React.CSSProperties> = {
  iconBtn:       { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", padding: 6, borderRadius: 6 },
  field:         { display: "flex", flexDirection: "column", gap: 6 },
  label:         { fontSize: 13, fontWeight: 500, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 4 },
  input:         { height: 38, border: "1px solid var(--input-border)", borderRadius: 8, padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none", width: "100%", boxSizing: "border-box" },
  typeBtn:       { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flex: 1, height: 36, backgroundColor: "var(--bg)", border: "1px solid var(--input-border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" },
  typeBtnHuman:  { backgroundColor: "rgba(5,150,105,0.1)", borderColor: "#059669", color: "#059669" },
  typeBtnMachine:{ backgroundColor: "rgba(37,99,235,0.1)", borderColor: "#2563EB", color: "#2563EB" },
  section:       { display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", backgroundColor: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" },
  sectionHead:   { display: "flex", alignItems: "center", gap: 7, marginBottom: 2 },
  sectionTitle:  { fontSize: 13, fontWeight: 600, color: "var(--text-primary)" },
  sectionSub:    { fontSize: 10, color: "var(--text-tertiary)", marginLeft: "auto" },
  fileRow:       { display: "flex", alignItems: "center", gap: 6, padding: "5px 6px", borderRadius: 6, backgroundColor: "var(--bg)", border: "1px solid var(--border)" },
  fileIdx:       { fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: "50%", backgroundColor: "var(--border)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fileName:      { flex: 1, fontSize: 12, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  fileRemove:    { background: "none", border: "none", cursor: "pointer", display: "flex", color: "var(--text-tertiary)", padding: 2, flexShrink: 0 },
  attachBtn:     { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 32, width: "100%", border: "1.5px dashed var(--border)", borderRadius: 7, background: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" },
  dropdown:      { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, zIndex: 60, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" },
  dropItem:      { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", fontSize: 13, color: "var(--text-primary)", background: "none", border: "none", cursor: "pointer", textAlign: "left" },
  typePill:      { fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 3, flexShrink: 0 },
  matRow:        { display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 6, backgroundColor: "var(--bg)", border: "1px solid var(--border)" },
  typeSmall:     { height: 28, padding: "0 10px", borderRadius: 6, border: "1.5px solid", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center" },
  primaryBtn:    { height: 40, padding: "0 20px", backgroundColor: "var(--btn-primary)", color: "var(--btn-primary-text)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  cancelBtn:     { height: 40, padding: "0 14px", backgroundColor: "var(--bg)", border: "1px solid var(--input-border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" },
};

export default function TasksPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  return <TasksContent productId={productId} />;
}
