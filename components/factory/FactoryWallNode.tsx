"use client";

import { NodeResizeControl } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useState } from "react";
import { useFactoryStore } from "@/stores/useFactoryStore";
import { WALL_CONFIG, type FactoryWall } from "@/types/factory";

export function FactoryWallNode({ id, data, selected }: NodeProps) {
  const wall   = data.wall as FactoryWall;
  const config = WALL_CONFIG[wall.wallType];
  const isWall = wall.wallType === "wall";
  const isH    = wall.orientation === "horizontal";

  const { resizeWall } = useFactoryStore();
  const [hovered, setHovered] = useState(false);

  /* ── Shared resize-end handler ─────────────────────────────────────
     Only invoked by length-axis end handles — thickness is read-only
     from the canvas (controlled exclusively from the properties panel).
  ──────────────────────────────────────────────────────────────────── */
  const onResizeEnd = (_e: unknown, params: { x: number; y: number; width: number; height: number }) => {
    resizeWall(
      id,
      { x: params.x, y: params.y },
      { width: params.width, height: params.height },
    );
  };

  /* ── Shared NodeResizeControl props ── */
  const ctrlBase = {
    /* Lock the thickness axis so only the length can change:
       horizontal walls → fix height; vertical walls → fix width */
    ...(isH
      ? { minHeight: wall.thickness, maxHeight: wall.thickness, minWidth: 40 }
      : { minWidth:  wall.thickness, maxWidth:  wall.thickness, minHeight: 40 }),
    onResizeEnd,
    style: {
      width:           10,
      height:          10,
      backgroundColor: "#F56300",
      border:          "2px solid #0F0F14",
      borderRadius:    2,
      cursor:          isH ? "ew-resize" : "ns-resize",
    } satisfies React.CSSProperties,
    color: "#F56300",
  };

  /* ── Background fill patterns ── */
  const wallBg = isWall
    /* diagonal hatch — structural / masonry convention */
    ? "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.07) 3px, rgba(255,255,255,0.07) 4px)"
    /* gentle diagonal stripe — open passage */
    : "repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(60,120,200,0.07) 10px, rgba(60,120,200,0.07) 11px)";

  const borderColor = selected
    ? "#F56300"
    : isWall
      ? (hovered ? "#646464" : "#484848")
      : (hovered ? "#5A9FD4" : "#3A78B0");

  const borderStyle = `${selected ? "1.5px" : isWall ? "1.5px" : "2px"} ${isWall ? "solid" : selected ? "solid" : "dashed"} ${borderColor}`;

  /* ── Capsule ends ───────────────────────────────────────────────────
     borderRadius: 999px gives semicircular end-caps.
     When two segment tips snap to the same grid point,
     the overlapping rounded caps merge and look joined.
  ──────────────────────────────────────────────────────────────────── */

  return (
    <>
      {/* ── Resize handles on LENGTH axis ends only ─────────────────────
          No handles exist on the thickness axis — that is panel-only.
          Horizontal walls: left ↔ right end caps
          Vertical walls:   top  ↕ bottom end caps
      ──────────────────────────────────────────────────────────────── */}
      {selected && isH && (
        <>
          <NodeResizeControl position="left"  {...ctrlBase} />
          <NodeResizeControl position="right" {...ctrlBase} />
        </>
      )}
      {selected && !isH && (
        <>
          <NodeResizeControl position="top"    {...ctrlBase} />
          <NodeResizeControl position="bottom" {...ctrlBase} />
        </>
      )}

      {/* Segment body — no connection Handles; ends are purely visual */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width:           "100%",
          height:          "100%",
          backgroundColor: isWall ? "#3A3A3A" : "rgba(50,110,170,0.10)",
          backgroundImage: wallBg,
          border:          borderStyle,
          /* 999px collapses to 50% on the short axis → perfect semicircular caps */
          borderRadius:    "999px",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          overflow:        "hidden",
          boxShadow: selected
            ? "0 0 0 1px #F56300, 0 0 14px rgba(245,99,0,0.18)"
            : isWall
              ? "0 1px 6px rgba(0,0,0,0.35)"
              : "none",
          transition:  "border-color 0.15s, box-shadow 0.15s",
          cursor:      "default",
          userSelect:  "none",
        }}
      >
        <span
          style={{
            fontSize:      7,
            fontWeight:    800,
            color:         isWall ? "rgba(255,255,255,0.28)" : "rgba(60,120,200,0.48)",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            fontFamily:    "monospace",
            whiteSpace:    "nowrap",
            pointerEvents: "none",
            transform:     isH ? "none" : "rotate(-90deg)",
          }}
        >
          {config.label}
        </span>
      </div>
    </>
  );
}
