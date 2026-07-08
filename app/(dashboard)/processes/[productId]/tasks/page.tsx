"use client";

import { use, useEffect, useRef, useState } from "react";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import {
  ArrowLeft, Plus, X, Clock, Cpu, User2, Users,
  Workflow, BarChart3, Pencil,
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
const blankMeta = (): TaskMeta => ({ numPeople: 1, sopFiles: [], machFiles: [], materials: [] });

type PanelState =
  | { mode: "new-workflow" }
  | { mode: "edit-workflow"; wfId: string; name: string }
  | { mode: "new-task"; targetWfId: string }
  | { mode: "edit-task"; taskId: string; name: string; maxDuration: string; optionSet: "human" | "machine"; meta: TaskMeta }
  | null;

interface SaveData { name: string; maxDuration?: number; optionSet?: "human" | "machine"; meta?: TaskMeta; }

const fmtMin = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
};
function reorder<T>(arr: T[], from: number, to: number): T[] {
  const r = [...arr]; const [item] = r.splice(from, 1); r.splice(to, 0, item); return r;
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
  const [newPartName, setNewPartName] = useState("");
  const [newPartType, setNewPartType] = useState<"OS" | "IM">("OS");
  const [partFilter,  setPartFilter]  = useState<"all" | "OS" | "IM">("all");
  const [sopDrag,     setSopDrag]     = useState<number | null>(null);
  const [machDrag,    setMachDrag]    = useState<number | null>(null);

  const sopRef  = useRef<HTMLInputElement>(null);
  const machRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!panel) return;
    if (panel.mode === "edit-workflow") {
      setName(panel.name); setMaxDuration(""); setOptionSet("human");
      setNumPeople("1"); setSopFiles([]); setMachFiles([]); setMaterials([]);
    } else if (panel.mode === "edit-task") {
      setName(panel.name); setMaxDuration(panel.maxDuration); setOptionSet(panel.optionSet);
      setNumPeople(String(panel.meta.numPeople || 1));
      setSopFiles(panel.meta.sopFiles); setMachFiles(panel.meta.machFiles);
      setMaterials(panel.meta.materials);
    } else {
      setName(""); setMaxDuration(""); setOptionSet("human");
      setNumPeople("1"); setSopFiles([]); setMachFiles([]); setMaterials([]);
    }
    setPartQuery(""); setShowDrop(false); setAddingPart(false);
    setPartFilter("all"); setSelMach(null);
  }, [panel]);

  const isOpen     = panel !== null;
  const isWf       = panel?.mode === "new-workflow" || panel?.mode === "edit-workflow";
  const isEdit     = panel?.mode === "edit-workflow" || panel?.mode === "edit-task";
  const isMachine  = optionSet === "machine";

  const title =
    panel?.mode === "new-workflow" ? "New Workflow"
    : panel?.mode === "edit-workflow" ? "Edit Workflow"
    : panel?.mode === "new-task"     ? "New Task"
    : panel?.mode === "edit-task"    ? "Edit Task" : "";

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
    if (!newPartName.trim()) return;
    const newId = `part-${Date.now()}`;
    useManufacturingStore.setState(s => ({
      partResources: [...s.partResources, { id: newId, name: newPartName.trim(), unitCost: 0, type: newPartType }],
    }));
    setMaterials(m => [...m, { id: `mat-${Date.now()}`, partId: newId, name: newPartName.trim(), partType: newPartType, qty: 1 }]);
    setNewPartName(""); setAddingPart(false); setPartQuery(""); setShowDrop(false);
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
        position: "fixed", top: 0, right: 0, height: "100vh", width: 400, zIndex: 50,
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

              {/* New part inline form */}
              {addingPart && (
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6, padding: "10px 12px", backgroundColor: "rgba(245,99,0,0.06)", borderRadius: 8, border: "1px solid rgba(245,99,0,0.2)" }}>
                  <input value={newPartName} onChange={e => setNewPartName(e.target.value)}
                    placeholder="Part name…" autoFocus
                    style={{ ...sp.input, flex: 1, height: 32, fontSize: 13 }} />
                  {/* type toggle — locked if filter is set, toggleable if "all" */}
                  {partFilter === "all"
                    ? (
                        <button type="button" onClick={() => setNewPartType(t => t === "OS" ? "IM" : "OS")}
                          style={{ ...sp.typeSmall, backgroundColor: newPartType === "OS" ? "rgba(59,130,246,0.12)" : "rgba(147,51,234,0.12)", color: newPartType === "OS" ? "#3B82F6" : "#9333EA", borderColor: newPartType === "OS" ? "#3B82F6" : "#9333EA" }}>
                          {newPartType}
                        </button>
                      )
                    : (
                        <span style={{ ...sp.typeSmall, backgroundColor: newPartType === "OS" ? "rgba(59,130,246,0.12)" : "rgba(147,51,234,0.12)", color: newPartType === "OS" ? "#3B82F6" : "#9333EA", borderColor: newPartType === "OS" ? "#3B82F6" : "#9333EA", cursor: "default" }}>
                          {newPartType}
                        </span>
                      )
                  }
                  <button type="button" onClick={handleNewPart}
                    style={{ ...sp.typeSmall, backgroundColor: "var(--btn-primary)", color: "var(--btn-primary-text)", borderColor: "var(--btn-primary)" }}>
                    Add
                  </button>
                  <button type="button" onClick={() => setAddingPart(false)} style={sp.iconBtn}><X size={12} /></button>
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
export default function TasksPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const [panel,        setPanel]        = useState<PanelState>(null);
  const [expandedWfs,  setExpandedWfs]  = useState<Set<string>>(new Set());
  const [expandedTasks,setExpandedTasks]= useState<Set<string>>(new Set());
  const [hoveredWf,    setHoveredWf]    = useState<string | null>(null);
  const [hoveredTask,  setHoveredTask]  = useState<string | null>(null);
  const [taskMeta,     setTaskMeta]     = useState<Record<string, TaskMeta>>({});
  const [dragWfId,     setDragWfId]     = useState<string | null>(null);
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
    }
    closePanel();
  };

  const totalTime = tasks.reduce((s, t) => s + t.duration, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)", gap: 0 }}>

      {/* Header */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/processes" style={s.back}>
            <ArrowLeft size={15} strokeWidth={2} /> Processes
          </Link>
          <h2 style={s.title}>Task Manager</h2>
          <Link href={`/processes/${productId}/planner`} style={{ ...s.back, color: "var(--text-secondary)", fontSize: 12 }}>
            <BarChart3 size={13} /> Production Planner
          </Link>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={s.pill}><Clock size={11} color="var(--text-secondary)" /><span>{fmtMin(totalTime)} total</span></div>
          <div style={s.pill}><Workflow size={11} color="var(--text-secondary)" /><span>{workflows.length} workflows</span></div>
        </div>
      </div>

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
                  <span style={s.wfMeta}>{wfTasks.length} tasks · {fmtMin(wfTime)} max</span>
                  <div style={{ flex: 1 }} />
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
                            <span style={{
                              fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "2px 6px", flexShrink: 0,
                              backgroundColor: t.optionSet === "machine" ? "rgba(37,99,235,0.12)" : "rgba(5,150,105,0.12)",
                              color: t.optionSet === "machine" ? "#2563EB" : "#059669",
                            }}>
                              {t.optionSet}
                            </span>
                            <span style={s.taskDur}>{fmtMin(t.duration)}</span>
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
