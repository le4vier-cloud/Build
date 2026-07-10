"use client";

import { useState } from "react";
import { Warehouse, MapPin, Plus, Mail, Phone, ExternalLink } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";
import { RightPanel } from "@/components/ui/right-panel";
import { MultiInput } from "@/components/ui/multi-input";

/* ── Types ──────────────────────────────────────────────── */
type Supplier = {
  id: string;
  name: string;
  address: string;
  emails: string[];
  cell_numbers: string[];
};

/* ── Seed data ──────────────────────────────────────────── */
const SEED_SUPPLIERS: Supplier[] = [
  {
    id: "s1",
    name: "Economic Motor Spares",
    address: "47 Main Street, Paarl, 7646, Western Cape, South Africa",
    emails: ["orders@ems.co.za"],
    cell_numbers: ["021 872 3456"],
  },
  {
    id: "s2",
    name: "Steel Direct SA",
    address: "12 Alfa Street, Techno Park, Stellenbosch, 7600, South Africa",
    emails: ["info@steeldirect.co.za"],
    cell_numbers: ["021 887 1234"],
  },
  {
    id: "s3",
    name: "Cape Hardware Supplies",
    address: "143 Voortrekker Road, Bellville, Cape Town, 7530, South Africa",
    emails: ["sales@capehardware.co.za"],
    cell_numbers: ["021 948 5678"],
  },
];

/* ── Helpers ────────────────────────────────────────────── */
function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).join("").slice(0, 2);
}

function staticMapUrl(address: string, zoom = 15, w = 200, h = 200) {
  if (!address) return "";
  const parts = [
    `center=${encodeURIComponent(address)}`,
    `zoom=${zoom}`,
    `size=${w}x${h}`,
    `scale=2`,
    `maptype=satellite`,
  ];
  return `/api/maps/static?${parts.join("&")}`;
}

function allSuppliersMapUrl(suppliers: Supplier[], w = 800, h = 400) {
  if (suppliers.length === 0) return "";
  const markerParts = suppliers.map(
    s => `markers=color:0x8B0000%7Clabel:${getInitials(s.name)[0]}%7C${encodeURIComponent(s.address)}`
  );
  const parts = [`size=${w}x${h}`, `scale=2`, `maptype=satellite`, ...markerParts];
  return `/api/maps/static?${parts.join("&")}`;
}

function openInMaps(address: string) {
  window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, "_blank");
}

function openAllInMaps(suppliers: Supplier[]) {
  if (suppliers.length === 0) return;
  // Opens a Google Maps search for all addresses in the area
  const query = suppliers.map(s => s.address).join(" | ");
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank");
}

/* ── Sub-nav ────────────────────────────────────────────── */
const SUB_NAV = [
  { key: "list", label: "Suppliers", icon: <Warehouse size={15} strokeWidth={1.8} /> },
  { key: "map",  label: "Map",       icon: <MapPin    size={15} strokeWidth={1.8} /> },
];

/* ── Page ───────────────────────────────────────────────── */
export default function SuppliersPage() {
  const [view, setView]           = useState("list");
  const [suppliers, setSuppliers] = useState<Supplier[]>(SEED_SUPPLIERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", emails: [] as string[], cell_numbers: [] as string[] });
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function handleSave() {
    if (!form.name.trim()) return;
    setSuppliers(prev => [...prev, { id: crypto.randomUUID(), ...form }]);
    setPanelOpen(false);
    setForm({ name: "", address: "", emails: [], cell_numbers: [] });
  }

  return (
    <>
      <ModuleLayout title="Suppliers" subNav={SUB_NAV} activeView={view} onViewChange={setView}>
        {view === "list" && (
          <SupplierList
            suppliers={suppliers}
            onAdd={() => setPanelOpen(true)}
          />
        )}
        {view === "map" && (
          <AllSuppliersMap suppliers={suppliers} onAdd={() => setPanelOpen(true)} />
        )}
      </ModuleLayout>

      <RightPanel open={panelOpen} onClose={() => setPanelOpen(false)} title="New Supplier">
        <div style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Supplier Name *</label>
            <input value={form.name} placeholder="e.g. Economic Motor Spares"
              onChange={e => set("name", e.target.value)} style={s.input} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Street Address *</label>
            <input value={form.address} placeholder="e.g. 47 Main Street, Paarl, 7646, South Africa"
              onChange={e => set("address", e.target.value)} style={s.input} />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
              Include street number and postal code for map accuracy
            </span>
          </div>
          <MultiInput label="Email Addresses" values={form.emails}
            onChange={v => set("emails", v)} placeholder="name@company.co.za" type="email" />
          <MultiInput label="Cell Numbers" values={form.cell_numbers}
            onChange={v => set("cell_numbers", v)} placeholder="012 345 6789" type="tel" />
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            style={{ ...s.saveBtn, opacity: !form.name.trim() ? 0.45 : 1 }}
          >
            Save Supplier
          </button>
        </div>
      </RightPanel>
    </>
  );
}

/* ── Supplier list ──────────────────────────────────────── */
function SupplierList({ suppliers, onAdd }: { suppliers: Supplier[]; onAdd: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {suppliers.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No suppliers yet.</p>
      )}

      {suppliers.map(s => <SupplierCard key={s.id} supplier={s} />)}

      <button
        onClick={onAdd}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", padding: "10px", borderRadius: 8,
          border: "1.5px dashed var(--border)", backgroundColor: "transparent",
          color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <Plus size={15} /> Add Supplier
      </button>
    </div>
  );
}

/* ── Supplier card ──────────────────────────────────────── */
function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <div style={{
      backgroundColor: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      overflow: "hidden",
      display: "flex",
      flexDirection: "row",
      alignItems: "stretch",
      minHeight: 88,
    }}>
      {/* Info — left */}
      <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 5, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{supplier.name}</span>

        {supplier.address && (
          <div style={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
            <MapPin size={11} strokeWidth={1.8} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{supplier.address}</span>
          </div>
        )}

        {supplier.emails.slice(0, 1).map(e => (
          <div key={e} style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <Mail size={11} strokeWidth={1.8} color="var(--text-tertiary)" />
            <a href={`mailto:${e}`} style={{ fontSize: 11, color: "var(--text-secondary)", textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e}</a>
          </div>
        ))}

        {supplier.cell_numbers.slice(0, 1).map(n => (
          <div key={n} style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <Phone size={11} strokeWidth={1.8} color="var(--text-tertiary)" />
            <a href={`tel:${n}`} style={{ fontSize: 11, color: "var(--text-secondary)", textDecoration: "none" }}>{n}</a>
          </div>
        ))}
      </div>

      {/* Map — right */}
      <SupplierMapBlock supplier={supplier} />
    </div>
  );
}

/* ── Map thumbnail (right side of card) ─────────────────── */
function SupplierMapBlock({ supplier }: { supplier: Supplier }) {
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const initials = getInitials(supplier.name);
  const mapUrl = staticMapUrl(supplier.address);

  return (
    <div
      onClick={e => { e.stopPropagation(); supplier.address && openInMaps(supplier.address); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: 100,
        flexShrink: 0,
        cursor: supplier.address ? "pointer" : "default",
        overflow: "hidden",
        borderLeft: "1px solid var(--border)",
        backgroundColor: "var(--bg)",
      }}
    >
      {mapUrl && !imgFailed ? (
        <img
          src={mapUrl}
          alt={`Map of ${supplier.address}`}
          onError={() => setImgFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: hovered ? "brightness(0.8)" : "none", transition: "filter 0.15s" }}
          draggable={false}
        />
      ) : (
        <MapPlaceholder address="" />
      )}

      {/* Pin */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, calc(-50% - 8px))",
        pointerEvents: "none",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
      }}>
        <MapPinSVG initials={initials} size={28} />
      </div>

      {/* Hover overlay */}
      {supplier.address && hovered && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.18)",
          pointerEvents: "none",
        }}>
          <ExternalLink size={16} color="#fff" strokeWidth={2} style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} />
        </div>
      )}
    </div>
  );
}

/* ── Custom SVG map pin ─────────────────────────────────── */
function MapPinSVG({ initials, size = 36 }: { initials: string; size?: number }) {
  const h = Math.round(size * 56 / 44);
  return (
    <svg viewBox="0 0 44 56" width={size} height={h} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22 0C9.85 0 0 9.85 0 22c0 14.25 22 34 22 34S44 36.25 44 22C44 9.85 34.15 0 22 0z"
        fill="#8B1A1A"
      />
      <circle cx="22" cy="22" r="13" fill="#A52020" />
      <text
        x="22" y="27"
        textAnchor="middle"
        fill="white"
        fontSize={initials.length > 1 ? "11" : "14"}
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="0.5"
      >
        {initials}
      </text>
    </svg>
  );
}

/* ── No-key placeholder ─────────────────────────────────── */
function MapPlaceholder({ address }: { address: string }) {
  return (
    <div style={{
      width: "100%", height: "100%",
      backgroundColor: "#e5e3df",
      backgroundImage: [
        "linear-gradient(rgba(200,196,190,0.6) 1px, transparent 1px)",
        "linear-gradient(90deg, rgba(200,196,190,0.6) 1px, transparent 1px)",
      ].join(", "),
      backgroundSize: "28px 28px",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center", padding: "0 16px" }}>
        <MapPin size={18} color="#999" strokeWidth={1.5} style={{ margin: "0 auto 4px" }} />
        <p style={{ fontSize: 11, color: "#888", margin: 0, lineHeight: 1.4 }}>
          {address || "No address"}
        </p>
      </div>
    </div>
  );
}

/* ── All-suppliers map view ─────────────────────────────── */
function AllSuppliersMap({ suppliers, onAdd }: { suppliers: Supplier[]; onAdd: () => void }) {
  const withAddr = suppliers.filter(s => s.address);
  const mapUrl   = allSuppliersMapUrl(withAddr, 1200, 500);
  const [hovered, setHovered]     = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Map */}
      <div
        onClick={() => withAddr.length > 0 && openAllInMaps(withAddr)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          borderRadius: 14,
          overflow: "hidden",
          height: 420,
          cursor: withAddr.length > 0 ? "pointer" : "default",
          border: "1px solid var(--border)",
        }}
      >
        {mapUrl && !imgFailed ? (
          <img
            src={mapUrl}
            alt="All suppliers map"
            onError={() => setImgFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: hovered ? "brightness(0.88)" : "none", transition: "filter 0.15s" }}
            draggable={false}
          />
        ) : (
          <MapPlaceholder address={withAddr.map(s => s.address).join(", ")} />
        )}

        {/* Hover pill */}
        {withAddr.length > 0 && (
          <div style={{
            position: "absolute",
            top: 12, left: "50%",
            transform: `translateX(-50%) translateY(${hovered ? 0 : -4}px)`,
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s, transform 0.15s",
            backgroundColor: "rgba(255,255,255,0.96)",
            color: "#1a1a1a",
            fontSize: 12, fontWeight: 600,
            borderRadius: 20,
            padding: "6px 14px",
            display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}>
            Open all in Maps <ExternalLink size={11} strokeWidth={2.5} />
          </div>
        )}

        {/* Supplier count badge */}
        {withAddr.length > 0 && (
          <div style={{
            position: "absolute", bottom: 12, right: 12,
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: 11, fontWeight: 600,
            borderRadius: 20,
            padding: "4px 10px",
            backdropFilter: "blur(6px)",
          }}>
            {withAddr.length} supplier{withAddr.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Supplier chips */}
      {suppliers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {suppliers.map(sup => (
            <div
              key={sup.id}
              onClick={() => sup.address && openInMaps(sup.address)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px",
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                cursor: sup.address ? "pointer" : "default",
              }}
            >
              {/* Initials circle */}
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                backgroundColor: "#8B1A1A",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "0.5px" }}>
                  {getInitials(sup.name)}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>{sup.name}</p>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sup.address || "No address"}</p>
              </div>
              {sup.address && <ExternalLink size={14} strokeWidth={1.8} color="var(--text-tertiary)" />}
            </div>
          ))}
        </div>
      )}

      {suppliers.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-tertiary)", fontSize: 14 }}>
          No suppliers yet.
        </div>
      )}

      <button
        onClick={onAdd}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", padding: "10px", borderRadius: 8,
          border: "1.5px dashed var(--border)", backgroundColor: "transparent",
          color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <Plus size={15} /> Add Supplier
      </button>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  form:    { display: "flex", flexDirection: "column", gap: 20 },
  field:   { display: "flex", flexDirection: "column", gap: 6 },
  label:   { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input:   { height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none", width: "100%", boxSizing: "border-box" } as React.CSSProperties,
  saveBtn: { height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8 },
};
