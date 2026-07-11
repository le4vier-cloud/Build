"use client";

import { useMemo } from "react";

interface RangeHistogramProps {
  label: string;
  values: number[];
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  format?: (n: number) => string;
}

const BUCKETS = 14;

export function RangeHistogram({ label, values, min, max, value, onChange, format = (n) => String(n) }: RangeHistogramProps) {
  const span = max - min || 1;

  const buckets = useMemo(() => {
    const arr = new Array(BUCKETS).fill(0);
    for (const v of values) {
      let idx = Math.floor(((v - min) / span) * BUCKETS);
      idx = Math.max(0, Math.min(BUCKETS - 1, idx));
      arr[idx]++;
    }
    const peak = Math.max(...arr, 1);
    return arr.map(c => c / peak);
  }, [values, min, span]);

  const pct = (v: number) => ((v - min) / span) * 100;
  // Native range thumbs are inset by half their width so they never clip outside
  // the input box; the CSS track must use the same inset or it visibly overshoots
  // the thumbs at the extremes.
  const THUMB = 12, HALF = THUMB / 2;
  const trackPos = (p: number) => `calc((100% - ${THUMB}px) * ${p / 100} + ${HALF}px)`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "monospace" }}>{format(value[0])} – {format(value[1])}</span>
      </div>

      <div style={{ position: "relative", height: 38, marginTop: 2 }}>
        {/* Histogram bars */}
        <div style={{ position: "absolute", left: HALF, right: HALF, bottom: 16, height: 20, display: "flex", alignItems: "flex-end", gap: 2, pointerEvents: "none" }}>
          {buckets.map((h, i) => {
            const bucketStart = min + (i / BUCKETS) * span;
            const bucketEnd = min + ((i + 1) / BUCKETS) * span;
            const inRange = bucketEnd >= value[0] && bucketStart <= value[1];
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max(h * 100, 8)}%`,
                  backgroundColor: inRange ? "var(--accent)" : "var(--text-tertiary)",
                  opacity: inRange ? 0.9 : 0.3,
                  borderRadius: 1,
                  transition: "background-color 0.15s, opacity 0.15s",
                }}
              />
            );
          })}
        </div>

        {/* Track */}
        <div style={{ position: "absolute", left: HALF, right: HALF, bottom: 7, height: 2, backgroundColor: "var(--border)", borderRadius: 1, pointerEvents: "none" }} />
        <div
          style={{
            position: "absolute", bottom: 7, height: 2, backgroundColor: "var(--accent)", borderRadius: 1,
            left: trackPos(pct(value[0])), right: trackPos(100 - pct(value[1])), pointerEvents: "none",
          }}
        />

        {/* Dual range inputs */}
        <input
          type="range" min={min} max={max} value={value[0]}
          onChange={e => { const v = Math.min(Number(e.target.value), value[1]); onChange([v, value[1]]); }}
          className="rh-slider"
          style={sliderInputStyle}
        />
        <input
          type="range" min={min} max={max} value={value[1]}
          onChange={e => { const v = Math.max(Number(e.target.value), value[0]); onChange([value[0], v]); }}
          className="rh-slider"
          style={sliderInputStyle}
        />
      </div>

      <style>{`
        .rh-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          pointer-events: none;
        }
        .rh-slider::-webkit-slider-runnable-track { background: transparent; }
        .rh-slider::-moz-range-track { background: transparent; }
        .rh-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          pointer-events: auto;
          width: 12px; height: 12px; border-radius: 50%;
          background: var(--accent);
          border: 2px solid var(--bg);
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
          cursor: pointer;
          margin-top: -5px;
        }
        .rh-slider::-moz-range-thumb {
          pointer-events: auto;
          width: 12px; height: 12px; border-radius: 50%;
          background: var(--accent);
          border: 2px solid var(--bg);
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

const sliderInputStyle: React.CSSProperties = {
  position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: 16,
  margin: 0,
};
