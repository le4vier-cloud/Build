"use client";

import { useState } from "react";
import { AlertCircle, Plus, X, Trash2, Package, Share2, Copy, Check, FileText, Upload } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";
import { useSelection } from "@/hooks/useSelection";
import { SelectCheckbox } from "@/components/ui/select-checkbox";
import { RowActions } from "@/components/ui/row-actions";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { SectionFilter } from "@/components/ui/section-filter";
import { RangeHistogram } from "@/components/ui/range-histogram";
import { exportToCsv } from "@/lib/csv-export";

type StockType = "all" | "outsourced" | "internal";
type ActiveForm = "os" | "im" | null;

interface SubComponent { id: string; name: string; qty: number }

interface BuildPackStep { id: string; name: string; instructions: string }
interface BuildPackFile { id: string; name: string; sizeKb: number }
interface BuildPack {
  steps:  BuildPackStep[];
  files:  BuildPackFile[];
  shared: boolean;
  notes:  string;
}

interface Part {
  id: string;
  name: string;
  barcode: string;
  serial: string;
  qty: number;
  min: number;
  type: "Out Sourced" | "Internally Manufactured";
  supplier: string;
  reorder: boolean;
  cost: number;
  sale: number;
  buildPack?: BuildPack;
}

const MOCK_INVENTORY: Part[] = [
  { id: "1", name: "COMPRESSION LATCH", barcode: "1111", serial: "1111", qty: 50,  min: 50, type: "Out Sourced",            supplier: "Economic motor spares", reorder: true,  cost: 100,     sale: 130     },
  { id: "2", name: "M5 WASHER SMALL",   barcode: "1111", serial: "1111", qty: 100, min: 50, type: "Out Sourced",            supplier: "Economic motor spares", reorder: false, cost: 10,      sale: 13      },
  { id: "3", name: "M5 LOCKNUT",        barcode: "1111", serial: "1111", qty: 100, min: 50, type: "Out Sourced",            supplier: "Economic motor spares", reorder: false, cost: 10,      sale: 13      },
  { id: "4", name: "M5 NUTCAP",         barcode: "1111", serial: "1111", qty: 100, min: 50, type: "Out Sourced",            supplier: "Economic motor spares", reorder: false, cost: 10,      sale: 13      },
  { id: "5", name: "E3 FRIDGE DOOR",    barcode: "1111", serial: "1111", qty: 10,  min: 5,  type: "Internally Manufactured", supplier: "—",                    reorder: false, cost: 1206.25, sale: 1568.13 },
];

export default function InventoryPage() {
  const [items,      setItems]      = useState<Part[]>(MOCK_INVENTORY);
  const [typeFilter, setTypeFilter] = useState<StockType>("all");
  const [search,     setSearch]     = useState("");
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [hoveredId,  setHoveredId]  = useState<string | null>(null);
  const [buildPackPartId, setBuildPackPartId] = useState<string | null>(null);

  const qtyMax  = Math.max(...items.map(i => i.qty), 100);
  const costMax = Math.max(...items.map(i => i.cost), 100);
  const [qtyRange,  setQtyRange]  = useState<[number, number]>(() => [0, qtyMax]);
  const [costRange, setCostRange] = useState<[number, number]>(() => [0, costMax]);
  const sel = useSelection<string>();

  const filtered = items.filter((item) => {
    if (typeFilter === "outsourced" && item.type !== "Out Sourced") return false;
    if (typeFilter === "internal"   && item.type !== "Internally Manufactured") return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (item.qty < qtyRange[0] || item.qty > qtyRange[1]) return false;
    if (item.cost < costRange[0] || item.cost > costRange[1]) return false;
    return true;
  });

  function closeForm() {
    setActiveForm(null);
    setEditingPart(null);
  }

  function openEdit(part: Part) {
    setEditingPart(part);
    setActiveForm(part.type === "Out Sourced" ? "os" : "im");
  }

  function handleSavePart(part: Part) {
    setItems(prev => {
      const exists = prev.some(p => p.id === part.id);
      return exists ? prev.map(p => p.id === part.id ? part : p) : [...prev, part];
    });
    closeForm();
  }

  function deleteOne(id: string) {
    if (!window.confirm("Delete this part?")) return;
    setItems(prev => prev.filter(p => p.id !== id));
    sel.clear();
  }

  function deleteSelected() {
    setItems(prev => prev.filter(p => !sel.isSelected(p.id)));
    sel.clear();
  }

  function exportSelected() {
    const rows = items.filter(p => sel.isSelected(p.id));
    exportToCsv("parts", rows.map(p => ({
      Name: p.name, Barcode: p.barcode, Serial: p.serial, Qty: p.qty, Min: p.min,
      Type: p.type, Supplier: p.supplier, Cost: p.cost, Sale: p.sale,
    })));
  }

  function editSelected() {
    const part = items.find(p => sel.isSelected(p.id));
    if (part) openEdit(part);
  }

  function saveBuildPack(partId: string, buildPack: BuildPack) {
    setItems(prev => prev.map(p => p.id === partId ? { ...p, buildPack } : p));
  }

  const buildPackPart = buildPackPartId ? items.find(p => p.id === buildPackPartId) ?? null : null;

  const allVisibleSelected = filtered.length > 0 && filtered.every(p => sel.isSelected(p.id));

  return (
    <ModuleLayout title="Parts" subNav={[]} activeView={null} onViewChange={() => {}} onBackgroundClick={sel.clear}>
    <div style={s.page} onClick={(e) => { if (e.target === e.currentTarget) sel.clear(); }}>
      <div style={s.topBar}>
        <div style={{ flex: 1 }} />
        <SectionFilter
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search parts..."
          active={typeFilter !== "all" || qtyRange[0] > 0 || qtyRange[1] < qtyMax || costRange[0] > 0 || costRange[1] < costMax}
        >
          <RangeHistogram
            label="Qty in Stock"
            values={items.map(i => i.qty)}
            min={0} max={qtyMax}
            value={qtyRange}
            onChange={setQtyRange}
          />
          <RangeHistogram
            label="Cost Price"
            values={items.map(i => i.cost)}
            min={0} max={costMax}
            value={costRange}
            onChange={setCostRange}
            format={(n) => `R${n}`}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Stock Item Type</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <FilterChip label="Out Sourced"             active={typeFilter === "outsourced"} onClick={() => setTypeFilter(typeFilter === "outsourced" ? "all" : "outsourced")} />
              <FilterChip label="Internally Manufactured" active={typeFilter === "internal"}   onClick={() => setTypeFilter(typeFilter === "internal"   ? "all" : "internal")}   />
            </div>
          </div>
        </SectionFilter>
        <div style={s.btnGroup}>
          <button style={s.addBtn} onClick={() => { setEditingPart(null); setActiveForm(activeForm === "os" ? null : "os"); }}>
            <Plus size={14} strokeWidth={2.5} /> OS Part
          </button>
          <button style={s.addBtn} onClick={() => { setEditingPart(null); setActiveForm(activeForm === "im" ? null : "im"); }}>
            <Plus size={14} strokeWidth={2.5} /> IM Part
          </button>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: 36 }}>
                  <SelectCheckbox
                    checked={allVisibleSelected}
                    visible={sel.count > 0 || filtered.length > 0}
                    onChange={() => sel.toggleAll(filtered.map(p => p.id))}
                  />
                </th>
                {["#", "Part Name", "Barcode", "Serial Number", "Amount In Stock", "Minimum Threshold", "Stock Item Type", "Supplier", "Re-Order Alert", "Cost Price", "Sale Price"].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
                <th style={{ ...s.th, width: 108 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const selected = sel.isSelected(item.id);
                const hovered  = hoveredId === item.id;
                return (
                  <tr
                    key={item.id}
                    style={s.tr}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <td style={s.td}>
                      <SelectCheckbox checked={selected} visible={hovered || sel.count > 0} onChange={() => sel.toggle(item.id)} />
                    </td>
                    <td style={s.td}>{i + 1}</td>
                    <td style={{ ...s.td, fontWeight: 500 }}>{item.name}</td>
                    <td style={s.td}>{item.barcode}</td>
                    <td style={s.td}>{item.serial}</td>
                    <td style={s.td}>{item.qty}</td>
                    <td style={s.td}>{item.min}</td>
                    <td style={s.td}>{item.type}</td>
                    <td style={s.td}><span style={s.supplierChip}>{item.supplier}</span></td>
                    <td style={s.td}>
                      <div style={s.alertCell}>
                        <span style={{ ...s.dot, backgroundColor: item.qty > item.min ? "var(--success)" : "var(--warning)" }} />
                        {item.qty <= item.min && <AlertCircle size={14} color="var(--danger)" />}
                      </div>
                    </td>
                    <td style={s.td}>R{item.cost.toFixed(2)}</td>
                    <td style={s.td}>R{item.sale.toFixed(2)}</td>
                    <td style={s.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {item.type === "Out Sourced" && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setBuildPackPartId(item.id); }}
                            title={item.buildPack?.steps.length ? "Edit Supplier Build Pack" : "Add Supplier Build Pack"}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                              border: `1px solid ${item.buildPack?.steps.length ? "var(--accent)" : "var(--border)"}`,
                              backgroundColor: item.buildPack?.steps.length ? "rgba(245,99,0,0.1)" : "var(--surface)",
                              color: item.buildPack?.steps.length ? "var(--accent)" : "var(--text-secondary)",
                              cursor: "pointer",
                              opacity: hovered || item.buildPack?.steps.length ? 1 : 0,
                              transition: "opacity 0.12s",
                            }}
                          >
                            <Package size={13} strokeWidth={1.8} />
                          </button>
                        )}
                        <RowActions visible={hovered} onEdit={() => openEdit(item)} onDelete={() => deleteOne(item.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {activeForm && <div style={f.backdrop} onClick={closeForm} />}
      {activeForm === "os" && <AddOSPartForm initial={editingPart} onClose={closeForm} onSave={handleSavePart} />}
      {activeForm === "im" && <AddIMPartForm initial={editingPart} onClose={closeForm} onSave={handleSavePart} />}

      {buildPackPart && <div style={f.backdrop} onClick={() => setBuildPackPartId(null)} />}
      {buildPackPart && (
        <BuildPackPanel
          part={buildPackPart}
          onClose={() => setBuildPackPartId(null)}
          onSave={(bp) => saveBuildPack(buildPackPart.id, bp)}
        />
      )}

      {!activeForm && (
        <BulkActionBar
          count={sel.count}
          entityLabel="part"
          onEdit={sel.count === 1 ? editSelected : undefined}
          onExport={exportSelected}
          onDelete={deleteSelected}
          onClear={sel.clear}
        />
      )}
    </div>
    </ModuleLayout>
  );
}

/* ── OS Part Form ───────────────────────────────────────────────── */
function AddOSPartForm({ initial, onClose, onSave }: { initial: Part | null; onClose: () => void; onSave: (p: Part) => void }) {
  const isEdit = !!initial;
  const [name,          setName]          = useState(initial?.name ?? "");
  const [supplier,      setSupplier]      = useState(initial?.supplier ?? "");
  const [barcode,       setBarcode]       = useState(initial?.barcode ?? "");
  const [serial,        setSerial]        = useState(initial?.serial ?? "");
  const [qty,           setQty]           = useState(initial ? String(initial.qty) : "");
  const [min,           setMin]           = useState(initial ? String(initial.min) : "");
  const [cost,          setCost]          = useState(initial ? String(initial.cost) : "");
  const [sale,          setSale]          = useState(initial ? String(initial.sale) : "");
  const [lowStockAlert,    setLowStockAlert]    = useState(initial?.reorder ?? false);
  const [alertThreshold,   setAlertThreshold]   = useState("");

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      supplier: supplier.trim(),
      barcode: barcode.trim(),
      serial: serial.trim(),
      qty: parseFloat(qty) || 0,
      min: parseFloat(min) || 0,
      type: "Out Sourced",
      reorder: lowStockAlert,
      cost: parseFloat(cost) || 0,
      sale: parseFloat(sale) || 0,
    });
  }

  return (
    <div style={f.panel}>
      <div style={f.header}>
        <span style={f.headerTitle}>{isEdit ? "Edit OS Part" : "Add OS Part"}</span>
        <button onClick={onClose} style={f.closeBtn}><X size={16} /></button>
      </div>
      <div style={f.body}>
        <Field label="Part Name *">
          <input value={name} onChange={e => setName(e.target.value)} style={f.inp} placeholder="e.g. M5 Bolt" />
        </Field>
        <Field label="Supplier">
          <input value={supplier} onChange={e => setSupplier(e.target.value)} style={f.inp} placeholder="Supplier name" />
        </Field>
        <Field label="Barcode">
          <input value={barcode} onChange={e => setBarcode(e.target.value)} style={f.inp} placeholder="Scan or enter barcode" />
        </Field>
        <Field label="Serial Number">
          <input value={serial} onChange={e => setSerial(e.target.value)} style={f.inp} placeholder="Serial number" />
        </Field>
        <div style={f.row}>
          <Field label="Qty in Stock" flex>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} style={f.inp} placeholder="0" min={0} />
          </Field>
          <Field label="Min Threshold" flex>
            <input type="number" value={min} onChange={e => setMin(e.target.value)} style={f.inp} placeholder="0" min={0} />
          </Field>
        </div>
        <div style={f.row}>
          <Field label="Cost Price (R)" flex>
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} style={f.inp} placeholder="0.00" min={0} step={0.01} />
          </Field>
          <Field label="Sale Price (R)" flex>
            <input type="number" value={sale} onChange={e => setSale(e.target.value)} style={f.inp} placeholder="0.00" min={0} step={0.01} />
          </Field>
        </div>
        <div style={f.toggleRow}>
          <span style={f.lbl}>Low Stock Alert</span>
          <Toggle on={lowStockAlert} onChange={v => { setLowStockAlert(v); if (!v) setAlertThreshold(""); }} />
        </div>
        {lowStockAlert && (
          <Field label="Alert when stock falls below">
            <input
              type="number"
              value={alertThreshold}
              onChange={e => setAlertThreshold(e.target.value)}
              style={f.inp}
              placeholder="e.g. 10"
              min={0}
              autoFocus
            />
          </Field>
        )}
      </div>
      <div style={f.footer}>
        <button onClick={onClose} style={f.cancelBtn}>Cancel</button>
        <button onClick={handleSave} style={f.saveBtn}>{isEdit ? "Save Changes" : "Add Part"}</button>
      </div>
    </div>
  );
}

/* ── IM Part Form ───────────────────────────────────────────────── */
function AddIMPartForm({ initial, onClose, onSave }: { initial: Part | null; onClose: () => void; onSave: (p: Part) => void }) {
  const isEdit = !!initial;
  const [name,       setName]       = useState(initial?.name ?? "");
  const [serial,     setSerial]     = useState(initial?.serial ?? "");
  const [qty,        setQty]        = useState(initial ? String(initial.qty) : "");
  const [min,        setMin]        = useState(initial ? String(initial.min) : "");
  const [taskName,   setTaskName]   = useState("");
  const [taskDesc,      setTaskDesc]      = useState("");
  const [maxTime,       setMaxTime]       = useState("");
  const [labourCost,    setLabourCost]    = useState("");
  const [components,    setComponents]    = useState<SubComponent[]>([]);
  const [compName,      setCompName]      = useState("");
  const [compQty,       setCompQty]       = useState("1");

  function addComponent() {
    if (!compName.trim()) return;
    setComponents(prev => [...prev, { id: Date.now().toString(), name: compName.trim(), qty: parseInt(compQty) || 1 }]);
    setCompName("");
    setCompQty("1");
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      supplier: "—",
      barcode: initial?.barcode ?? "",
      serial: serial.trim(),
      qty: parseFloat(qty) || 0,
      min: parseFloat(min) || 0,
      type: "Internally Manufactured",
      reorder: initial?.reorder ?? false,
      cost: initial?.cost ?? 0,
      sale: initial?.sale ?? 0,
    });
  }

  return (
    <div style={f.panel}>
      <div style={f.header}>
        <span style={f.headerTitle}>{isEdit ? "Edit IM Part" : "Add IM Part"}</span>
        <button onClick={onClose} style={f.closeBtn}><X size={16} /></button>
      </div>
      <div style={f.body}>
        <div style={f.sectionLabel}>Part Info</div>
        <Field label="Part Name *">
          <input value={name} onChange={e => setName(e.target.value)} style={f.inp} placeholder="e.g. E3 Fridge Door" />
        </Field>
        <Field label="Serial Number">
          <input value={serial} onChange={e => setSerial(e.target.value)} style={f.inp} placeholder="Serial number" />
        </Field>
        <div style={f.row}>
          <Field label="Qty in Stock" flex>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} style={f.inp} placeholder="0" min={0} />
          </Field>
          <Field label="Min Threshold" flex>
            <input type="number" value={min} onChange={e => setMin(e.target.value)} style={f.inp} placeholder="0" min={0} />
          </Field>
        </div>
        <div style={{ ...f.sectionLabel, marginTop: 20 }}>Assembly</div>
        <Field label="Assembly Task Name">
          <input value={taskName} onChange={e => setTaskName(e.target.value)} style={f.inp} placeholder="e.g. Door Assembly" />
        </Field>
        <Field label="Description">
          <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)}
            style={{ ...f.inp, height: 72, resize: "vertical" as const }}
            placeholder="Steps to assemble this part..." />
        </Field>
        <div style={f.row}>
          <Field label="Max Time (min)" flex>
            <input type="number" value={maxTime} onChange={e => setMaxTime(e.target.value)} style={f.inp} placeholder="0" min={0} />
          </Field>
          <Field label="Labour Cost (R/hr)" flex>
            <input type="number" value={labourCost} onChange={e => setLabourCost(e.target.value)} style={f.inp} placeholder="0.00" min={0} step={0.01} />
          </Field>
        </div>

        <div style={{ ...f.sectionLabel, marginTop: 20 }}>OS Sub-Components</div>
        {components.map(c => (
          <div key={c.id} style={f.compRow}>
            <span style={f.compName}>{c.name}</span>
            <span style={f.compQty}>×{c.qty}</span>
            <button onClick={() => setComponents(prev => prev.filter(x => x.id !== c.id))} style={f.removeBtn}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <div style={f.addCompRow}>
          <input
            value={compName}
            onChange={e => setCompName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addComponent()}
            style={{ ...f.inp, flex: 1, minWidth: 0 }}
            placeholder="Part name"
          />
          <input
            type="number"
            value={compQty}
            onChange={e => setCompQty(e.target.value)}
            style={{ ...f.inp, width: 60 }}
            placeholder="Qty"
            min={1}
          />
          <button onClick={addComponent} style={f.addCompBtn}><Plus size={14} /></button>
        </div>
      </div>
      <div style={f.footer}>
        <button onClick={onClose} style={f.cancelBtn}>Cancel</button>
        <button onClick={handleSave} style={f.saveBtn}>{isEdit ? "Save Changes" : "Add Part"}</button>
      </div>
    </div>
  );
}

/* ── Supplier Build Pack panel ──────────────────────────────────── */
function BuildPackPanel({ part, onClose, onSave }: {
  part: Part;
  onClose: () => void;
  onSave: (bp: BuildPack) => void;
}) {
  const initial = part.buildPack;
  const [steps,  setSteps]  = useState<BuildPackStep[]>(initial?.steps ?? []);
  const [files,  setFiles]  = useState<BuildPackFile[]>(initial?.files ?? []);
  const [shared, setShared] = useState(initial?.shared ?? false);
  const [notes,  setNotes]  = useState(initial?.notes ?? "");
  const [stepName, setStepName] = useState("");
  const [stepInst, setStepInst] = useState("");
  const [copied, setCopied] = useState(false);

  function addStep() {
    if (!stepName.trim()) return;
    setSteps(prev => [...prev, { id: crypto.randomUUID(), name: stepName.trim(), instructions: stepInst.trim() }]);
    setStepName("");
    setStepInst("");
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setFiles(prev => [...prev, ...picked.map(f => ({ id: crypto.randomUUID(), name: f.name, sizeKb: Math.round(f.size / 1024) }))]);
    e.target.value = "";
  }

  function copyLink() {
    const link = `https://build.app/supplier/${part.id}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleSave() {
    onSave({ steps, files, shared, notes });
    onClose();
  }

  return (
    <div style={{ ...f.panel, width: "min(440px, 100vw)" }}>
      <div style={f.header}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={f.headerTitle}>Supplier Build Pack</span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{part.name}</span>
        </div>
        <button onClick={onClose} style={f.closeBtn}><X size={16} /></button>
      </div>
      <div style={f.body}>
        <div style={f.sectionLabel}>SOP Steps</div>
        {steps.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic", marginTop: 0 }}>No steps yet — add the build sequence below.</p>
        )}
        {steps.map((step, i) => (
          <div key={step.id} style={bp.stepRow}>
            <span style={bp.stepIndex}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{step.name}</div>
              {step.instructions && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.5 }}>{step.instructions}</div>}
            </div>
            <button onClick={() => setSteps(prev => prev.filter(x => x.id !== step.id))} style={f.removeBtn}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px", backgroundColor: "var(--bg)", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 20 }}>
          <input
            value={stepName}
            onChange={e => setStepName(e.target.value)}
            style={f.inp}
            placeholder="Step name — e.g. Cut & prep materials"
          />
          <textarea
            value={stepInst}
            onChange={e => setStepInst(e.target.value)}
            style={{ ...f.inp, height: 56, resize: "vertical" as const }}
            placeholder="Instructions (optional)"
          />
          <button onClick={addStep} style={{ ...f.addCompBtn, width: "100%", borderRadius: "var(--radius-sm)" }}>
            <Plus size={14} /> Add Step
          </button>
        </div>

        <div style={f.sectionLabel}>Files & Drawings</div>
        {files.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic", marginTop: 0 }}>No files attached.</p>
        )}
        {files.map(file => (
          <div key={file.id} style={f.compRow}>
            <FileText size={13} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
            <span style={f.compName}>{file.name}</span>
            <span style={f.compQty}>{file.sizeKb}kb</span>
            <button onClick={() => setFiles(prev => prev.filter(x => x.id !== file.id))} style={f.removeBtn}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <label style={{ ...bp.uploadBtn, marginBottom: 20 }}>
          <Upload size={14} /> Upload Files
          <input type="file" multiple onChange={onPickFiles} style={{ display: "none" }} />
        </label>

        <div style={f.sectionLabel}>Supplier Access</div>
        <div style={f.toggleRow}>
          <span style={f.lbl}>Share with {part.supplier || "supplier"}</span>
          <Toggle on={shared} onChange={setShared} />
        </div>
        {shared && (
          <div style={bp.shareBox}>
            <Share2 size={13} color="var(--accent)" style={{ flexShrink: 0 }} />
            <span style={bp.shareLink}>{`build.app/supplier/${part.id}`}</span>
            <button onClick={copyLink} style={bp.copyBtn} title="Copy link">
              {copied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
            </button>
          </div>
        )}
        <Field label="Notes for Supplier">
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            style={{ ...f.inp, height: 64, resize: "vertical" as const }}
            placeholder="Tolerances, packaging, delivery instructions..." />
        </Field>
      </div>
      <div style={f.footer}>
        <button onClick={onClose} style={f.cancelBtn}>Cancel</button>
        <button onClick={handleSave} style={f.saveBtn}>Save Build Pack</button>
      </div>
    </div>
  );
}

/* ── Shared primitives ──────────────────────────────────────────── */
function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12, ...(flex ? { flex: 1, minWidth: 0 } : {}) }}>
      <label style={f.lbl}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{ ...f.toggle, ...(on ? f.toggleOn : {}) }}>
      <span style={{ ...f.toggleThumb, ...(on ? f.toggleThumbOn : {}) }} />
    </button>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ ...s.chip, ...(active ? s.chipActive : {}) }}>
      {label}
    </button>
  );
}

/* ── Page styles ────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page:         { position: "relative", display: "flex", flexDirection: "column", gap: 16 },
  topBar:       { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title:        { fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-pixel-square)" },
  btnGroup:     { display: "flex", gap: 8 },
  addBtn:       { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", backgroundColor: "var(--btn-primary)", color: "var(--btn-primary-text, #fff)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  card:         { backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden" },
  filterSection:{ padding: "16px 20px", borderBottom: "1px solid var(--border)" },
  filterHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  filterLabel:  { fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" },
  filterChips:  { display: "flex", gap: 8, flexWrap: "wrap" },
  chip:         { padding: "6px 14px", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: "var(--radius-full, 9999px)", backgroundColor: "transparent", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" },
  chipActive:   { backgroundColor: "var(--accent)", color: "#fff", borderColor: "var(--accent)" },
  searchRow:    { padding: "12px 20px", borderBottom: "1px solid var(--border)" },
  search:       { width: 280, height: 36, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--bg)", outline: "none" },
  tableWrap:    { overflowX: "auto" },
  table:        { width: "100%", borderCollapse: "collapse", minWidth: 980 },
  th:           { padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)", whiteSpace: "nowrap" },
  tr:           { borderBottom: "1px solid var(--border)" },
  td:           { padding: "11px 14px", fontSize: 13, color: "var(--text-primary)", whiteSpace: "nowrap" },
  supplierChip: { fontSize: 11, backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px" },
  alertCell:    { display: "flex", alignItems: "center", gap: 6 },
  dot:          { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
};

/* ── Drawer / form styles ───────────────────────────────────────── */
const f: Record<string, React.CSSProperties> = {
  backdrop:      { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", zIndex: 100 },
  panel:         { position: "fixed", top: 0, right: 0, bottom: 0, width: "min(380px, 100vw)", backgroundColor: "var(--surface)", borderLeft: "1px solid var(--border)", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)", zIndex: 101, display: "flex", flexDirection: "column" },
  header:        { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 },
  headerTitle:   { fontSize: 15, fontWeight: 700, color: "var(--text-primary)" },
  closeBtn:      { background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", padding: 4 },
  body:          { flex: 1, overflowY: "auto", padding: "20px 20px 0" },
  footer:        { padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0 },
  sectionLabel:  { fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 },
  lbl:           { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" },
  inp:           { width: "100%", height: 34, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0 10px", fontSize: 13, color: "var(--text-primary)", backgroundColor: "var(--bg)", outline: "none", boxSizing: "border-box" },
  row:           { display: "flex", gap: 10 },
  toggleRow:     { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  toggle:        { width: 36, height: 20, borderRadius: 10, backgroundColor: "var(--border)", border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" },
  toggleOn:      { backgroundColor: "var(--accent)" },
  toggleThumb:   { position: "absolute", top: 2, left: 2, width: 16, height: 16, borderRadius: "50%", backgroundColor: "#fff", transition: "left 0.2s" },
  toggleThumbOn: { left: 18 },
  compRow:       { display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 6 },
  compName:      { flex: 1, fontSize: 13, color: "var(--text-primary)" },
  compQty:       { fontSize: 12, color: "var(--text-secondary)", minWidth: 28 },
  removeBtn:     { background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex", alignItems: "center", padding: 2 },
  addCompRow:    { display: "flex", gap: 8, marginBottom: 20, alignItems: "center" },
  addCompBtn:    { height: 34, width: 34, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", flexShrink: 0 },
  cancelBtn:     { flex: 1, height: 36, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" },
  saveBtn:       { flex: 2, height: 36, backgroundColor: "var(--btn-primary)", color: "var(--btn-primary-text, #fff)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};

/* ── Build Pack panel styles ────────────────────────────────────── */
const bp: Record<string, React.CSSProperties> = {
  stepRow:    { display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 6 },
  stepIndex:  { fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", width: 16, flexShrink: 0, textAlign: "center", marginTop: 1 },
  uploadBtn:  { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "9px", borderRadius: "var(--radius-sm)", border: "1.5px dashed var(--border)", backgroundColor: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  shareBox:   { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", backgroundColor: "rgba(245,99,0,0.08)", border: "1px solid rgba(245,99,0,0.25)", borderRadius: "var(--radius-sm)", marginTop: 10, marginBottom: 20 },
  shareLink:  { flex: 1, minWidth: 0, fontSize: 12, color: "var(--text-primary)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  copyBtn:    { display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-secondary)", cursor: "pointer", flexShrink: 0 },
};
