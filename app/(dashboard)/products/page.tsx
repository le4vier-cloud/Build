"use client";

import { useState } from "react";
import {
  ShoppingBag, Plus, Trash2, ClipboardList, BarChart3,
  Workflow, Tag, ChevronRight, Package, TrendingUp, Users, Calendar,
} from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";
import { RightPanel } from "@/components/ui/right-panel";
import { SectionFilter } from "@/components/ui/section-filter";
import { RangeHistogram } from "@/components/ui/range-histogram";
import { useSelection } from "@/hooks/useSelection";
import { SelectCheckbox } from "@/components/ui/select-checkbox";
import { RowActions } from "@/components/ui/row-actions";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { exportToCsv } from "@/lib/csv-export";

/* ── Types ──────────────────────────────────────────────── */
type Product = {
  id: string;
  name: string;
  model: string;
  description: string;
  color: string;
  basePrice: number;
  baseCost: number;
};

type BomLine = { id: string; productId: string; partName: string; qty: number; unitCost: number };
type ProductOption = { id: string; productId: string; stage: number; label: string; priceDelta: number };
type SaleRecord = { id: string; productId: string; client: string; date: string; amount: number; status: string };

/* ── Seed data ──────────────────────────────────────────── */
const SEED_PRODUCTS: Product[] = [
  { id: "p1", name: "Ingane - 1.0",    model: "ING-1.0", description: "Compact modular baby cot with integrated storage.", color: "#F56300", basePrice: 4200, baseCost: 2350 },
  { id: "p2", name: "Standard Build",  model: "STD-B1",  description: "Entry-level configurable furniture frame.",         color: "#4A90E2", basePrice: 2800, baseCost: 1600 },
];

const SEED_BOM: BomLine[] = [
  { id: "b1", productId: "p1", partName: "COMPRESSION LATCH", qty: 4,  unitCost: 100     },
  { id: "b2", productId: "p1", partName: "M5 WASHER SMALL",   qty: 12, unitCost: 10      },
  { id: "b3", productId: "p1", partName: "E3 FRIDGE DOOR",    qty: 1,  unitCost: 1206.25 },
  { id: "b4", productId: "p2", partName: "M5 LOCKNUT",        qty: 8,  unitCost: 10      },
  { id: "b5", productId: "p2", partName: "M5 NUTCAP",         qty: 8,  unitCost: 10      },
];

const SEED_OPTIONS: ProductOption[] = [
  { id: "o1", productId: "p1", stage: 1, label: "Oak Finish",        priceDelta: 350 },
  { id: "o2", productId: "p1", stage: 1, label: "Walnut Finish",     priceDelta: 480 },
  { id: "o3", productId: "p1", stage: 1, label: "White Gloss",       priceDelta: 200 },
  { id: "o4", productId: "p1", stage: 2, label: "Standard Storage",  priceDelta: 0   },
  { id: "o5", productId: "p1", stage: 2, label: "Extended Storage",  priceDelta: 620 },
  { id: "o6", productId: "p2", stage: 1, label: "Pine",              priceDelta: 0   },
  { id: "o7", productId: "p2", stage: 1, label: "Birch Ply",         priceDelta: 300 },
];

const SEED_SALES: SaleRecord[] = [
  { id: "s1", productId: "p1", client: "Divan Oelerman",  date: "2025-08-25", amount: 4550, status: "In Progress"    },
  { id: "s2", productId: "p1", client: "Sarah Naidoo",    date: "2026-01-12", amount: 4820, status: "In Progress"    },
  { id: "s3", productId: "p2", client: "Riaan Botha",     date: "2026-01-06", amount: 2800, status: "Awaiting Parts" },
  { id: "s4", productId: "p1", client: "Marlene Kruger",  date: "2025-03-03", amount: 4200, status: "Completed"      },
];

const SUB_NAV = [
  { key: "list",       label: "Products",   icon: <ShoppingBag  size={15} strokeWidth={1.8} /> },
  { key: "bom",         label: "BOM",        icon: <ClipboardList size={15} strokeWidth={1.8} /> },
  { key: "analytics",   label: "Analytics",  icon: <BarChart3    size={15} strokeWidth={1.8} /> },
  { key: "options",     label: "Options",    icon: <Workflow     size={15} strokeWidth={1.8} /> },
  { key: "pricelist",   label: "Price List", icon: <Tag          size={15} strokeWidth={1.8} /> },
];

const BLANK_FORM = { name: "", model: "", description: "", basePrice: "", baseCost: "" };
const COLORS = ["#F56300", "#4A90E2", "#3CC86A", "#7B6CF6", "#E55F1F", "#20B2AA"];

function fmtR(n: number) {
  const rounded = Math.round(n * 100) / 100;
  const [intPart, decPart] = rounded.toFixed(rounded % 1 === 0 ? 0 : 2).split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `R${withCommas}${decPart ? `.${decPart}` : ""}`;
}

/* ── Page ───────────────────────────────────────────────── */
export default function ProductsPage() {
  const [view, setView]           = useState("list");
  const [products, setProducts]   = useState<Product[]>(SEED_PRODUCTS);
  const [bom]                     = useState<BomLine[]>(SEED_BOM);
  const [options, setOptions]     = useState<ProductOption[]>(SEED_OPTIONS);
  const [sales]                   = useState<SaleRecord[]>(SEED_SALES);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState(BLANK_FORM);
  const [search, setSearch]       = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 99999]);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const sel = useSelection<string>();

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (p.basePrice < priceRange[0] || p.basePrice > priceRange[1]) return false;
    return true;
  });

  function openAdd() { setEditingId(null); setForm(BLANK_FORM); setPanelOpen(true); }
  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({ name: p.name, model: p.model, description: p.description, basePrice: String(p.basePrice), baseCost: String(p.baseCost) });
    setPanelOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (editingId) {
      setProducts(prev => prev.map(p => p.id === editingId ? {
        ...p, name: form.name.trim(), model: form.model.trim(), description: form.description.trim(),
        basePrice: parseFloat(form.basePrice) || 0, baseCost: parseFloat(form.baseCost) || 0,
      } : p));
    } else {
      setProducts(prev => [...prev, {
        id: crypto.randomUUID(), name: form.name.trim(), model: form.model.trim(), description: form.description.trim(),
        basePrice: parseFloat(form.basePrice) || 0, baseCost: parseFloat(form.baseCost) || 0,
        color: COLORS[prev.length % COLORS.length],
      }]);
    }
    setPanelOpen(false);
    setEditingId(null);
    setForm(BLANK_FORM);
  }

  function deleteOne(id: string) {
    if (!window.confirm("Delete this product?")) return;
    setProducts(prev => prev.filter(p => p.id !== id));
    sel.clear();
  }

  function deleteSelected() {
    setProducts(prev => prev.filter(p => !sel.isSelected(p.id)));
    sel.clear();
  }

  function exportSelected() {
    const rows = products.filter(p => sel.isSelected(p.id));
    exportToCsv("products", rows.map(p => ({
      Name: p.name, Model: p.model, BasePrice: p.basePrice, BaseCost: p.baseCost,
      Margin: (p.basePrice - p.baseCost).toFixed(2),
    })));
  }

  function editSelected() {
    const p = products.find(x => sel.isSelected(x.id));
    if (p) openEdit(p);
  }

  return (
    <>
      <ModuleLayout title="Products" subNav={SUB_NAV} activeView={view} onViewChange={setView} onBackgroundClick={view === "list" ? sel.clear : undefined}>
        {view === "list" && (
          <ProductList
            products={filtered} allProducts={products} sales={sales}
            onAdd={openAdd} onEdit={openEdit} onDelete={deleteOne} sel={sel}
            search={search} onSearchChange={setSearch}
            priceRange={priceRange} onPriceRangeChange={setPriceRange}
          />
        )}
        {view === "bom"       && <BomView products={products} bom={bom} />}
        {view === "analytics" && <AnalyticsView products={products} sales={sales} bom={bom} />}
        {view === "options"   && <OptionsView products={products} options={options} setOptions={setOptions} />}
        {view === "pricelist" && <PriceListView products={products} setProducts={setProducts} options={options} setOptions={setOptions} />}
      </ModuleLayout>

      <RightPanel open={panelOpen} onClose={() => { setPanelOpen(false); setEditingId(null); }} title={editingId ? "Edit Product" : "New Product"}>
        <div style={s.form}>
          <div style={s.imageUpload}>
            <span style={s.imageText}>Click to upload an image</span>
          </div>
          <div style={s.field}>
            <label style={s.label}>Product Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Type here..." style={s.input} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Model</label>
            <input value={form.model} onChange={e => set("model", e.target.value)} placeholder="Type here..." style={s.input} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Type here..." rows={3} style={s.textarea} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>Base Cost (R)</label>
              <input type="number" value={form.baseCost} onChange={e => set("baseCost", e.target.value)} placeholder="0.00" style={s.input} />
            </div>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>Base Price (R)</label>
              <input type="number" value={form.basePrice} onChange={e => set("basePrice", e.target.value)} placeholder="0.00" style={s.input} />
            </div>
          </div>
          <button onClick={handleSave} disabled={!form.name.trim()} style={{ ...s.saveBtn, opacity: !form.name.trim() ? 0.45 : 1 }}>
            {editingId ? "Save Changes" : "Save Product"}
          </button>
        </div>
      </RightPanel>

      {view === "list" && !panelOpen && (
        <BulkActionBar
          count={sel.count}
          entityLabel="product"
          onEdit={sel.count === 1 ? editSelected : undefined}
          onExport={exportSelected}
          onDelete={deleteSelected}
          onClear={sel.clear}
        />
      )}
    </>
  );
}

/* ── Product list ───────────────────────────────────────── */
function ProductList({
  products, allProducts, sales, onAdd, onEdit, onDelete, sel, search, onSearchChange, priceRange, onPriceRangeChange,
}: {
  products: Product[]; allProducts: Product[]; sales: SaleRecord[];
  onAdd: () => void; onEdit: (p: Product) => void; onDelete: (id: string) => void;
  sel: ReturnType<typeof useSelection<string>>;
  search: string; onSearchChange: (v: string) => void;
  priceRange: [number, number]; onPriceRangeChange: (v: [number, number]) => void;
}) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) sel.clear(); }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SectionFilter
          search={search} onSearchChange={onSearchChange} searchPlaceholder="Search products..."
          active={priceRange[0] > 0 || priceRange[1] < 99999}
        >
          <RangeHistogram
            label="Base Price"
            values={allProducts.map(p => p.basePrice)}
            min={0} max={Math.max(...allProducts.map(p => p.basePrice), 100)}
            value={priceRange} onChange={onPriceRangeChange}
            format={(n) => `R${n}`}
          />
        </SectionFilter>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {products.map(p => (
          <ProductCard key={p.id} product={p} sales={sales.filter(s => s.productId === p.id)} onEdit={onEdit} onDelete={onDelete} sel={sel} />
        ))}
      </div>

      <button
        onClick={onAdd}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", padding: "10px", borderRadius: 8,
          border: "1.5px dashed var(--border)", backgroundColor: "transparent",
          color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <Plus size={15} /> Add Product
      </button>
    </div>
  );
}

function ProductCard({ product, sales, onEdit, onDelete, sel }: {
  product: Product; sales: SaleRecord[];
  onEdit: (p: Product) => void; onDelete: (id: string) => void;
  sel: ReturnType<typeof useSelection<string>>;
}) {
  const [hovered, setHovered] = useState(false);
  const selected = sel.isSelected(product.id);
  const margin = product.basePrice - product.baseCost;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
        overflow: "hidden", display: "flex", flexDirection: "column",
      }}
    >
      {/* Image placeholder */}
      <div style={{ position: "relative", height: 120, backgroundColor: product.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <SelectCheckbox checked={selected} visible={hovered || sel.count > 0} onChange={() => sel.toggle(product.id)} />
        </div>
        <Package size={36} color="rgba(255,255,255,0.85)" strokeWidth={1.5} />
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <RowActions visible={hovered} onEdit={() => onEdit(product)} onDelete={() => onDelete(product.id)} style={{ backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 8, padding: 3 }} />
        </div>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{product.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "monospace" }}>{product.model || "—"}</div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, padding: "6px 10px", backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cost</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>{fmtR(product.baseCost)}</div>
          </div>
          <div style={{ flex: 1, padding: "6px 10px", backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Price</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{fmtR(product.basePrice)}</div>
          </div>
          <div style={{ flex: 1, padding: "6px 10px", backgroundColor: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.3)", borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: "#34C759", textTransform: "uppercase", letterSpacing: "0.05em" }}>Margin</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#34C759" }}>{fmtR(margin)}</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Order History ({sales.length})
          </div>
          {sales.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}>No orders yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {sales.slice(0, 2).map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.client}</span>
                  <span style={{ color: "var(--text-tertiary)", flexShrink: 0, marginLeft: 8 }}>{fmtR(s.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── BOM view ───────────────────────────────────────────── */
function BomView({ products, bom }: { products: Product[]; bom: BomLine[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const lines = bom.filter(b => b.productId === productId);
  const total = lines.reduce((sum, l) => sum + l.qty * l.unitCost, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <select value={productId} onChange={e => setProductId(e.target.value)} style={{ ...s.input, maxWidth: 280 }}>
        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {lines.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--text-tertiary)" }}>No BOM lines for this product.</p>
      ) : (
        <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Part", "Qty", "Unit Cost", "Line Total"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{l.partName}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: "var(--text-secondary)" }}>×{l.qty}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{fmtR(l.unitCost)}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{fmtR(l.qty * l.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", backgroundColor: "var(--bg)", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Total BOM Cost</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{fmtR(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Analytics view ─────────────────────────────────────── */
function AnalyticsView({ products, sales, bom }: { products: Product[]; sales: SaleRecord[]; bom: BomLine[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const productSales = sales.filter(s => s.productId === productId);
  const totalRevenue = productSales.reduce((sum, s) => sum + s.amount, 0);
  const avgOrder = productSales.length > 0 ? totalRevenue / productSales.length : 0;
  const bomCost = bom.filter(b => b.productId === productId).reduce((sum, b) => sum + b.qty * b.unitCost, 0);
  const maxAmount = Math.max(...productSales.map(s => s.amount), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <select value={productId} onChange={e => setProductId(e.target.value)} style={{ ...s.input, maxWidth: 280 }}>
        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <StatTile icon={<Users size={14} />}      label="Total Orders"     value={String(productSales.length)} />
        <StatTile icon={<TrendingUp size={14} />} label="Total Revenue"    value={fmtR(totalRevenue)} accent />
        <StatTile icon={<Tag size={14} />}        label="Avg Order Value"  value={fmtR(avgOrder)} />
      </div>

      <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Sales by Order</div>
        {productSales.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>No sales yet for this product.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {productSales.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 120, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.client}</span>
                <div style={{ flex: 1, height: 8, backgroundColor: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(s.amount / maxAmount) * 100}%`, backgroundColor: "var(--accent)", borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", width: 70, textAlign: "right", flexShrink: 0 }}>{fmtR(s.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10 }}>
        <Calendar size={14} color="var(--text-tertiary)" />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Current BOM cost: <strong style={{ color: "var(--text-primary)" }}>{fmtR(bomCost)}</strong> — margin per unit at base price is {fmtR((products.find(p => p.id === productId)?.basePrice ?? 0) - bomCost)}</span>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-tertiary)" }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 700, color: accent ? "var(--accent)" : "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

/* ── Options view — static node flow ────────────────────── */
function OptionsView({ products, options }: { products: Product[]; options: ProductOption[]; setOptions: React.Dispatch<React.SetStateAction<ProductOption[]>> }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find(p => p.id === productId);
  const productOptions = options.filter(o => o.productId === productId);
  const stages = Array.from(new Set(productOptions.map(o => o.stage))).sort((a, b) => a - b);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
      <select value={productId} onChange={e => setProductId(e.target.value)} style={{ ...s.input, maxWidth: 280 }}>
        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}>
        Static preview of the option flow a client steps through when configuring this product.
      </p>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 4, overflowX: "auto", padding: "8px 0" }}>
        {/* Base product node */}
        <FlowStage label="Base Product">
          <FlowNode label={product?.name ?? "—"} sub={product ? fmtR(product.basePrice) : undefined} base />
        </FlowStage>

        {stages.length > 0 && <FlowArrow />}

        {stages.map((stage, i) => (
          <div key={stage} style={{ display: "flex", alignItems: "flex-start" }}>
            <FlowStage label={`Step ${i + 1}`}>
              {productOptions.filter(o => o.stage === stage).map(o => (
                <FlowNode key={o.id} label={o.label} sub={o.priceDelta > 0 ? `+${fmtR(o.priceDelta)}` : "Included"} />
              ))}
            </FlowStage>
            {i < stages.length - 1 && <FlowArrow />}
          </div>
        ))}

        {stages.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No configurable options for this product yet.</p>
        )}
      </div>
    </div>
  );
}

function FlowStage({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>{label}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function FlowNode({ label, sub, base }: { label: string; sub?: string; base?: boolean }) {
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 10, minWidth: 148,
      backgroundColor: base ? "var(--accent)" : "var(--surface)",
      border: `1px solid ${base ? "var(--accent)" : "var(--border)"}`,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: base ? "#fff" : "var(--text-primary)" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: base ? "rgba(255,255,255,0.8)" : "var(--text-tertiary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function FlowArrow() {
  return (
    <div style={{ display: "flex", alignItems: "center", height: 40, marginTop: 22, flexShrink: 0, padding: "0 4px" }}>
      <ChevronRight size={18} color="var(--text-tertiary)" />
    </div>
  );
}

/* ── Price list view ────────────────────────────────────── */
function PriceListView({ products, setProducts, options, setOptions }: {
  products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  options: ProductOption[]; setOptions: React.Dispatch<React.SetStateAction<ProductOption[]>>;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find(p => p.id === productId);
  const productOptions = options.filter(o => o.productId === productId);

  function updateBasePrice(v: string) {
    const price = parseFloat(v) || 0;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, basePrice: price } : p));
  }

  function updateOptionDelta(id: string, v: string) {
    const delta = parseFloat(v) || 0;
    setOptions(prev => prev.map(o => o.id === id ? { ...o, priceDelta: delta } : o));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
      <select value={productId} onChange={e => setProductId(e.target.value)} style={{ ...s.input, maxWidth: 280 }}>
        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{product?.name} — Base Price</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>R</span>
            <input
              type="number" value={product?.basePrice ?? 0}
              onChange={e => updateBasePrice(e.target.value)}
              style={{ ...s.input, width: 100, height: 32, textAlign: "right" }}
            />
          </div>
        </div>

        {productOptions.length === 0 ? (
          <p style={{ padding: 16, fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>No options priced for this product.</p>
        ) : (
          productOptions.map(o => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{o.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>+R</span>
                <input
                  type="number" value={o.priceDelta}
                  onChange={e => updateOptionDelta(o.id, e.target.value)}
                  style={{ ...s.input, width: 90, height: 32, textAlign: "right" }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Shared styles ──────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  form:        { display: "flex", flexDirection: "column", gap: 20 },
  imageUpload: { width: 120, height: 120, border: "1px dashed var(--input-border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backgroundColor: "var(--bg)" },
  imageText:   { fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" as const, padding: 8 },
  field:       { display: "flex", flexDirection: "column", gap: 6 },
  label:       { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input:       { height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none", width: "100%", boxSizing: "border-box" as const },
  textarea:    { border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none", resize: "vertical" as const, fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const },
  saveBtn:     { height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "var(--btn-primary-text, #fff)", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8 },
};
