"use client";

import { useState } from "react";
import { UserCircle, Plus, MapPin, Mail, Phone } from "lucide-react";
import { ModuleLayout } from "@/components/ui/module-layout";
import { RightPanel } from "@/components/ui/right-panel";
import { MultiInput } from "@/components/ui/multi-input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { SectionFilter } from "@/components/ui/section-filter";
import { useSelection } from "@/hooks/useSelection";
import { SelectCheckbox } from "@/components/ui/select-checkbox";
import { RowActions } from "@/components/ui/row-actions";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { exportToCsv } from "@/lib/csv-export";

type Client = {
  id: string;
  name: string;
  address: string;
  emails: string[];
  cell_numbers: string[];
};

const SEED_CLIENTS: Client[] = [
  {
    id: "c1",
    name: "Divan Oelerman",
    address: "Still Bay West, Western Cape, South Africa",
    emails: ["divanoelerman@gmail.com"],
    cell_numbers: ["098 764 5634"],
  },
  {
    id: "c2",
    name: "Marlene Kruger",
    address: "22 Bree Street, Cape Town, 8001, South Africa",
    emails: ["marlene.k@gmail.com"],
    cell_numbers: ["082 456 7890"],
  },
  {
    id: "c3",
    name: "Riaan Botha",
    address: "9 Kerk Street, Worcester, 6850, South Africa",
    emails: ["riaan.botha@outlook.com", "riaan.work@company.co.za"],
    cell_numbers: ["083 112 2334"],
  },
];

const SUB_NAV = [
  { key: "list", label: "Clients", icon: <UserCircle size={15} strokeWidth={1.8} /> },
];

const BLANK_FORM = { name: "", address: "", emails: [] as string[], cell_numbers: [] as string[] };

export default function ClientsPage() {
  const [view, setView]           = useState("list");
  const [clients, setClients]     = useState<Client[]>(SEED_CLIENTS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [form, setForm] = useState(BLANK_FORM);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const sel = useSelection<string>();

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.address.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setEditingId(null);
    setForm(BLANK_FORM);
    setPanelOpen(true);
  }

  function openEdit(client: Client) {
    setEditingId(client.id);
    setForm({ name: client.name, address: client.address, emails: client.emails, cell_numbers: client.cell_numbers });
    setPanelOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (editingId) {
      setClients(prev => prev.map(c => c.id === editingId ? { id: editingId, ...form } : c));
    } else {
      setClients(prev => [...prev, { id: crypto.randomUUID(), ...form }]);
    }
    setPanelOpen(false);
    setEditingId(null);
    setForm(BLANK_FORM);
  }

  function deleteOne(id: string) {
    if (!window.confirm("Delete this client?")) return;
    setClients(prev => prev.filter(c => c.id !== id));
    sel.clear();
  }

  function deleteSelected() {
    setClients(prev => prev.filter(c => !sel.isSelected(c.id)));
    sel.clear();
  }

  function exportSelected() {
    const rows = clients.filter(c => sel.isSelected(c.id));
    exportToCsv("clients", rows.map(c => ({
      Name: c.name, Address: c.address, Emails: c.emails.join("; "), Cells: c.cell_numbers.join("; "),
    })));
  }

  function editSelected() {
    const c = clients.find(x => sel.isSelected(x.id));
    if (c) openEdit(c);
  }

  return (
    <>
      <ModuleLayout title="Clients" subNav={SUB_NAV} activeView={view} onViewChange={setView} onBackgroundClick={sel.clear}>
        {view === "list" && (
          <ClientList
            clients={filtered}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={deleteOne}
            sel={sel}
            search={search}
            onSearchChange={setSearch}
          />
        )}
      </ModuleLayout>

      <RightPanel open={panelOpen} onClose={() => { setPanelOpen(false); setEditingId(null); }} title={editingId ? "Edit Client" : "New Client"}>
        <div style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Client Name *</label>
            <input value={form.name} placeholder="Type here..."
              onChange={(e) => set("name", e.target.value)} style={s.input} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Address</label>
            <AddressAutocomplete
              value={form.address}
              onChange={v => set("address", v)}
              placeholder="Search for an address..."
            />
          </div>
          <MultiInput label="Email Addresses" required values={form.emails}
            onChange={(v) => set("emails", v)} placeholder="Type here..." type="email" />
          <MultiInput label="Cell Numbers" required values={form.cell_numbers}
            onChange={(v) => set("cell_numbers", v)} placeholder="Type here..." type="tel" />
          <button onClick={handleSave} disabled={!form.name.trim()} style={{ ...s.saveBtn, opacity: !form.name.trim() ? 0.45 : 1 }}>
            {editingId ? "Save Changes" : "Save"}
          </button>
        </div>
      </RightPanel>

      {!panelOpen && (
        <BulkActionBar
          count={sel.count}
          entityLabel="client"
          onEdit={sel.count === 1 ? editSelected : undefined}
          onExport={exportSelected}
          onDelete={deleteSelected}
          onClear={sel.clear}
        />
      )}
    </>
  );
}

function ClientList({ clients, onAdd, onEdit, onDelete, sel, search, onSearchChange }: {
  clients: Client[];
  onAdd: () => void;
  onEdit: (c: Client) => void;
  onDelete: (id: string) => void;
  sel: ReturnType<typeof useSelection<string>>;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) sel.clear(); }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SectionFilter search={search} onSearchChange={onSearchChange} searchPlaceholder="Search clients..." />
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
        onClick={(e) => { if (e.target === e.currentTarget) sel.clear(); }}
      >
        {clients.length === 0 && (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No clients yet.</p>
        )}
        {clients.map(c => <ClientCard key={c.id} client={c} onEdit={onEdit} onDelete={onDelete} sel={sel} />)}
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
        <Plus size={15} /> Add Client
      </button>
    </div>
  );
}

function ClientCard({ client, onEdit, onDelete, sel }: {
  client: Client;
  onEdit: (c: Client) => void;
  onDelete: (id: string) => void;
  sel: ReturnType<typeof useSelection<string>>;
}) {
  const [hovered, setHovered] = useState(false);
  const selected = sel.isSelected(client.id);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        minHeight: 72,
      }}
    >
      <SelectCheckbox checked={selected} visible={hovered || sel.count > 0} onChange={() => sel.toggle(client.id)} />

      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        backgroundColor: "var(--bg)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: "var(--text-secondary)",
      }}>
        {client.name.split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join("")}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{client.name}</span>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {client.address && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
              <MapPin size={11} strokeWidth={1.8} color="var(--text-tertiary)" /> {client.address}
            </span>
          )}
          {client.emails.slice(0, 1).map(e => (
            <span key={e} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
              <Mail size={11} strokeWidth={1.8} color="var(--text-tertiary)" /> {e}
            </span>
          ))}
          {client.cell_numbers.slice(0, 1).map(n => (
            <span key={n} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
              <Phone size={11} strokeWidth={1.8} color="var(--text-tertiary)" /> {n}
            </span>
          ))}
        </div>
      </div>

      <RowActions visible={hovered} onEdit={() => onEdit(client)} onDelete={() => onDelete(client.id)} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  form:    { display: "flex", flexDirection: "column", gap: 20 },
  field:   { display: "flex", flexDirection: "column", gap: 6 },
  label:   { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  input:   { height: 38, border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)", padding: "0 12px", fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface)", outline: "none", width: "100%", boxSizing: "border-box" } as React.CSSProperties,
  saveBtn: { height: 40, padding: "0 28px", backgroundColor: "var(--btn-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-full, 9999px)", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8 },
};
