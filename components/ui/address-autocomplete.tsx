"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface Prediction {
  place_id: string;
  description: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}

export function AddressAutocomplete({ value, onChange, placeholder = "Search for an address..." }: AddressAutocompleteProps) {
  const [query, setQuery]           = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleInput(v: string) {
    setQuery(v);
    onChange(v);
    setActiveIndex(-1);

    if (debounce.current) clearTimeout(debounce.current);

    if (v.trim().length < 3) {
      setPredictions([]);
      setOpen(false);
      return;
    }

    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/maps/autocomplete?input=${encodeURIComponent(v)}`);
        const data = await res.json();
        setPredictions(data.predictions ?? []);
        setOpen(true);
      } catch {
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function selectPrediction(p: Prediction) {
    setQuery(p.description);
    onChange(p.description);
    setPredictions([]);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || predictions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, predictions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) selectPrediction(predictions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <MapPin size={14} strokeWidth={1.8} color="var(--text-tertiary)"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => predictions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            height: 38, width: "100%", boxSizing: "border-box",
            border: "1px solid var(--input-border)", borderRadius: "var(--radius-sm)",
            padding: "0 34px 0 34px", fontSize: 14, color: "var(--text-primary)",
            backgroundColor: "var(--surface)", outline: "none",
          }}
        />
        {loading && (
          <Loader2 size={14} color="var(--text-tertiary)"
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(0deg)", animation: "address-autocomplete-spin 0.8s linear infinite" }} />
        )}
      </div>

      {open && predictions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30,
          backgroundColor: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)", boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          overflow: "hidden", maxHeight: 220, overflowY: "auto",
        }}>
          {predictions.map((p, i) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => selectPrediction(p)}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "9px 12px", textAlign: "left",
                background: activeIndex === i ? "var(--bg)" : "transparent",
                border: "none", borderBottom: i < predictions.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer", fontSize: 13, color: "var(--text-primary)",
              }}
            >
              <MapPin size={13} strokeWidth={1.8} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes address-autocomplete-spin { to { transform: translateY(-50%) rotate(360deg); } }
      `}</style>
    </div>
  );
}
