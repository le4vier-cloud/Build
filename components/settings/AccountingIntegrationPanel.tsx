"use client";

import { useState, useEffect } from "react";
import { Check, AlertCircle, Loader2, Link2Off } from "lucide-react";

const PROVIDERS = [
  { value: "count",       label: "Count",       hint: "Copy the webhook URL and secret from Count → Settings → Connected Apps → Build." },
  { value: "xero",        label: "Xero",        hint: "Create a custom connection in Xero and paste the API URL and OAuth token." },
  { value: "quickbooks",  label: "QuickBooks",  hint: "Create an app at developer.intuit.com and paste the API URL and OAuth token." },
  { value: "sage",        label: "Sage",        hint: "Contact Sage support for your API webhook endpoint and signing secret." },
];

interface Status {
  connected:       boolean;
  provider?:       string;
  webhookUrl?:     string;
  accountingOrgId?: string;
  connectedAt?:    string;
  lastUsedAt?:     string;
}

export default function AccountingIntegrationPanel({ source }: { source: "build" | "transport" }) {
  const [status,    setStatus]    = useState<Status | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [provider,  setProvider]  = useState("count");
  const [url,       setUrl]       = useState("");
  const [secret,    setSecret]    = useState("");
  const [orgId,     setOrgId]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const [testing,   setTesting]   = useState(false);
  const [testResult,setTestResult]= useState<{ ok: boolean; error?: string } | null>(null);
  const [msg,       setMsg]       = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/integrations/accounting")
      .then(r => r.json())
      .then(d => { setStatus(d); if (d.connected) setProvider(d.provider ?? "count"); })
      .catch(() => setStatus({ connected: false }))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!url || !secret) return;
    setSaving(true); setMsg(null); setTestResult(null);
    const res = await fetch("/api/integrations/accounting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, webhookUrl: url, webhookSecret: secret, accountingOrgId: orgId || undefined }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) {
      setMsg("Connected successfully.");
      setStatus({ connected: true, provider, webhookUrl: url, connectedAt: new Date().toISOString() });
      setSecret(""); // clear — don't hold in state after save
    } else {
      setMsg(data.error ?? "Save failed.");
    }
  }

  async function test() {
    setTesting(true); setTestResult(null);
    const res  = await fetch("/api/integrations/accounting/test", { method: "POST" });
    const data = await res.json();
    setTesting(false);
    setTestResult(data);
  }

  async function disconnect() {
    await fetch("/api/integrations/accounting", { method: "DELETE" });
    setStatus({ connected: false });
    setUrl(""); setSecret(""); setOrgId(""); setMsg(null); setTestResult(null);
  }

  const hint = PROVIDERS.find(p => p.value === provider)?.hint;

  if (loading) return <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Loading…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Connection banner */}
      {status?.connected && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A", flexShrink: 0 }} />
          <span style={{ flex: 1, color: "var(--text-primary)", fontWeight: 600 }}>
            {PROVIDERS.find(p => p.value === status.provider)?.label ?? status.provider} connected
          </span>
          {status.lastUsedAt && (
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Last used {new Date(status.lastUsedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={s.label}>Accounting software</label>
          <select value={provider} onChange={e => setProvider(e.target.value)} style={s.input}>
            {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        {hint && (
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>{hint}</p>
        )}

        <div>
          <label style={s.label}>Webhook URL</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://yourcount.app/api/webhooks/accounting-event"
            style={s.input}
          />
        </div>

        <div>
          <label style={s.label}>Webhook secret</label>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder={status?.connected ? "Enter new secret to rotate…" : "whsec_…"}
            autoComplete="new-password"
            style={s.input}
          />
          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Stored encrypted on our servers. Never sent to your browser after saving.
          </p>
        </div>

        {provider !== "count" && (
          <div>
            <label style={s.label}>{provider === "xero" ? "Xero Tenant ID" : provider === "quickbooks" ? "QuickBooks Realm ID" : "Organisation ID"}</label>
            <input
              type="text"
              value={orgId}
              onChange={e => setOrgId(e.target.value)}
              placeholder="e.g. a1b2c3d4-…"
              style={s.input}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={save}
          disabled={saving || !url || !secret}
          style={{ ...s.btn, opacity: (!url || !secret) ? 0.5 : 1 }}
        >
          {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
          {status?.connected ? "Update" : "Connect"}
        </button>

        {status?.connected && (
          <>
            <button onClick={test} disabled={testing} style={s.btnSecondary}>
              {testing ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : null}
              Test connection
            </button>
            <button onClick={disconnect} style={{ ...s.btnSecondary, color: "#C0392B" }}>
              <Link2Off size={13} />
              Disconnect
            </button>
          </>
        )}
      </div>

      {/* Feedback */}
      {msg && (
        <p style={{ fontSize: 13, color: msg.includes("success") ? "#16A34A" : "#C0392B", margin: 0 }}>{msg}</p>
      )}
      {testResult && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: testResult.ok ? "#16A34A" : "#C0392B" }}>
          {testResult.ok
            ? <><Check size={14} /> Test event sent successfully — check your accounting software.</>
            : <><AlertCircle size={14} /> Test failed: {testResult.error}</>
          }
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const s = {
  label: {
    display: "block" as const,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  input: {
    width: "100%",
    height: 36,
    padding: "0 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    color: "var(--text-primary)",
    background: "var(--bg)",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    height: 36,
    padding: "0 18px",
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    height: 36,
    padding: "0 14px",
    background: "transparent",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};
