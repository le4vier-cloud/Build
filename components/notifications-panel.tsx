"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, Package, ShoppingCart, Zap, AlertTriangle, Check, ChevronDown } from "lucide-react";

type NotifType = "low_stock" | "order" | "process" | "system";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  href: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "0", type: "low_stock", title: "Low Stock Alert",  body: "Compression Latch is at minimum stock level — 50 left (min: 50)", time: "Just now",   read: false, href: "/inventory" },
  { id: "1", type: "low_stock", title: "Low Stock Alert",  body: "Mild Steel 3mm is running low — 2 units left (min: 5)",    time: "1h ago",     read: false, href: "/inventory" },
  { id: "2", type: "low_stock", title: "Low Stock Alert",  body: "M8 Bolts have hit minimum stock level — 10 left",           time: "3h ago",     read: false, href: "/inventory" },
  { id: "3", type: "order",     title: "New Order",        body: "Divan Oelerman placed an order for Ingane 1.0",             time: "5h ago",     read: false, href: "/orders" },
  { id: "4", type: "process",   title: "Task Completed",   body: "Frame Assembly on Core Build marked complete",              time: "Yesterday",  read: true,  href: "/processes" },
  { id: "5", type: "low_stock", title: "Low Stock Alert",  body: "Angle Grinder Discs running low — 3 left (min: 8)",        time: "Yesterday",  read: true,  href: "/inventory" },
  { id: "6", type: "system",    title: "Plan Saved",       body: "Standard Build for Ingane was updated and saved",          time: "2 days ago", read: true,  href: "/settings" },
];

const ICONS: Record<NotifType, React.ReactNode> = {
  low_stock: <AlertTriangle size={14} strokeWidth={2} />,
  order:     <ShoppingCart  size={14} strokeWidth={2} />,
  process:   <Zap          size={14} strokeWidth={2} />,
  system:    <Package      size={14} strokeWidth={2} />,
};

const ICON_COLOR: Record<NotifType, string> = {
  low_stock: "#F59E0B",
  order:     "#60A5FA",
  process:   "#F56300",
  system:    "var(--text-tertiary)",
};

const OPTIONS = ["Mark as Read", "Flag", "Archive", "Delete"] as const;

const blurStyle: React.CSSProperties = {
  position: "absolute",
  top: -28,
  left: -18,
  right: -18,
  bottom: -28,
  backdropFilter: "blur(30px) saturate(160%)",
  WebkitBackdropFilter: "blur(30px) saturate(160%)",
  backgroundColor: "rgba(10, 10, 14, 0.66)",
  borderRadius: 36,
  WebkitMaskImage: [
    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 7%, black 18%, black 82%, rgba(0,0,0,0.6) 93%, transparent 100%)",
    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 6%, black 15%, black 85%, rgba(0,0,0,0.6) 94%, transparent 100%)",
  ].join(", "),
  maskImage: [
    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 7%, black 18%, black 82%, rgba(0,0,0,0.6) 93%, transparent 100%)",
    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 6%, black 15%, black 85%, rgba(0,0,0,0.6) 94%, transparent 100%)",
  ].join(", "),
  WebkitMaskComposite: "source-in",
  maskComposite: "intersect",
  pointerEvents: "none",
};

export function NotificationsPanel() {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [items, setItems]         = useState(MOCK_NOTIFICATIONS);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [optionsId, setOptionsId] = useState<string | null>(null);

  const unread = items.filter(n => !n.read).length;

  function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  }

  function handleOption(id: string, action: typeof OPTIONS[number]) {
    setOptionsId(null);
    setHoveredId(null);
    if (action === "Mark as Read") {
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } else if (action === "Delete" || action === "Archive") {
      setItems(prev => prev.filter(n => n.id !== id));
    }
  }

  function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setItems(prev => prev.filter(n => n.id !== id));
  }

  function navigate(href: string) {
    setOpen(false);
    setOptionsId(null);
    router.push(href);
  }

  return (
    <>
      {/* Bell */}
      <button
        onClick={() => { setOpen(v => !v); setOptionsId(null); }}
        style={{
          position: "relative", width: 34, height: 34,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "var(--radius-sm)",
          backgroundColor: open ? "var(--bg)" : "transparent",
          border: "none", cursor: "pointer", flexShrink: 0,
        }}
        aria-label="Notifications"
      >
        <Bell size={18} color={open ? "var(--text-primary)" : "var(--text-secondary)"} strokeWidth={1.8} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 5, right: 5,
            width: 8, height: 8, borderRadius: "50%",
            backgroundColor: "#F56300",
            border: "2px solid var(--surface)",
          }} />
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => { setOpen(false); setOptionsId(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 199 }}
        />
      )}

      {/* Panel — soft blur, no hard edge */}
      {open && (
        <div style={{ position: "fixed", top: 58, right: 16, width: "min(360px, calc(100vw - 32px))", maxHeight: "calc(100vh - 80px)", zIndex: 200, display: "flex", flexDirection: "column" }}>

          {/* Blur backdrop — extracted to const to avoid inline type cast issues */}
          <div style={blurStyle} />

          {/* Content */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "var(--font-geist-pixel-square)", letterSpacing: "0.02em" }}>
                Notifications
                {unread > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, fontFamily: "inherit", backgroundColor: "#F56300", color: "#fff", borderRadius: 99, padding: "1px 7px" }}>
                    {unread}
                  </span>
                )}
              </span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ fontSize: 11, fontWeight: 600, color: "#F56300", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}>
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", padding: 2 }}>
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ overflowY: "auto", flex: 1, padding: "4px 10px 10px", WebkitMaskImage: "linear-gradient(to bottom, transparent, black 20px, black calc(100% - 24px), transparent)", maskImage: "linear-gradient(to bottom, transparent, black 20px, black calc(100% - 24px), transparent)" }}>
              {items.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <Check size={22} color="rgba(255,255,255,0.25)" style={{ margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>All caught up</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map(notif => {
                    const hovered  = hoveredId === notif.id;
                    const optOpen  = optionsId === notif.id;
                    const overlayBg = notif.read ? "rgba(18,18,22,0.96)" : "rgba(28,18,10,0.96)";

                    return (
                      <div
                        key={notif.id}
                        style={{ position: "relative" }}
                        onMouseEnter={() => setHoveredId(notif.id)}
                        onMouseLeave={() => { setHoveredId(null); if (!optOpen) setOptionsId(null); }}
                      >
                        {/* Fixed-height card */}
                        <div
                          onClick={() => navigate(notif.href)}
                          style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "12px 14px", height: 72,
                            boxSizing: "border-box", overflow: "hidden",
                            borderRadius: 12, cursor: "pointer", position: "relative",
                            backgroundColor: notif.read ? "rgba(255,255,255,0.05)" : "rgba(245,99,0,0.09)",
                            border: `1px solid ${notif.read ? "rgba(255,255,255,0.07)" : "rgba(245,99,0,0.2)"}`,
                          }}
                        >
                          {!notif.read && (
                            <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 28, borderRadius: "0 2px 2px 0", backgroundColor: "#F56300" }} />
                          )}
                          <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: ICON_COLOR[notif.type] }}>
                            {ICONS[notif.type]}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{notif.title}</span>
                              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap", marginLeft: 8, flexShrink: 0 }}>{notif.time}</span>
                            </div>
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.4, overflow: "hidden" }}>{notif.body}</p>
                          </div>
                        </div>

                        {/* Hover overlay — zero layout impact */}
                        {hovered && (
                          <div style={{ position: "absolute", top: 1, right: 1, bottom: 1, display: "flex", alignItems: "center", gap: 5, paddingRight: 8, borderRadius: "0 11px 11px 0", background: `linear-gradient(to right, transparent, ${overlayBg} 36%)`, zIndex: 5 }}>
                            <div style={{ position: "relative" }}>
                              <button
                                onClick={e => { e.stopPropagation(); setOptionsId(optOpen ? null : notif.id); }}
                                style={{ height: 26, padding: "0 8px", display: "flex", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)", cursor: "pointer" }}
                              >
                                Options <ChevronDown size={10} strokeWidth={2.5} />
                              </button>
                              {optOpen && (
                                <div
                                  onClick={e => e.stopPropagation()}
                                  style={{ position: "absolute", right: 0, top: "calc(100% + 5px)", backgroundColor: "rgba(26,26,30,0.98)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 11, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", overflow: "hidden", zIndex: 20, minWidth: 154 }}
                                >
                                  {OPTIONS.map((opt, i) => (
                                    <button
                                      key={opt}
                                      onClick={() => handleOption(notif.id, opt)}
                                      style={{ display: "block", width: "100%", padding: "9px 14px", textAlign: "left", background: "none", border: "none", borderBottom: i < OPTIONS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", fontSize: 13, fontWeight: opt === "Delete" ? 600 : 400, color: opt === "Delete" ? "#FF453A" : "rgba(255,255,255,0.82)", cursor: "pointer" }}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={e => dismiss(notif.id, e)}
                              style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
                            >
                              <X size={11} strokeWidth={2.5} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
