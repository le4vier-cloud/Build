"use client";

import { NodeResizer, Handle, Position } from "@xyflow/react";
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

  /* ── NodeResizer constraints ────────────────────────
     For a horizontal segment:
       • width  = length  → unrestricted (min 40)
       • height = thickness → clamped to [min, max]
     For a vertical segment:
       • width  = thickness → clamped to [min, max]
       • height = length  → unrestricted (min 40)
  ─────────────────────────────────────────────────── */
  const resizerProps = isH
    ? { minWidth: 40,                  minHeight: config.minThickness, maxHeight: config.maxThickness }
    : { minHeight: 40, minWidth: config.minThickness, maxWidth: config.maxThickness };

  const endHandleStyle: React.CSSProperties = {
    width: 8, height: 8,
    backgroundColor: isWall ? "#787878" : "#4A90C8",
    border: `2px solid ${isWall ? "#1E1E1E" : "#183050"}`,
    borderRadius: "50%",
    opacity: (hovered || selected) ? 1 : 0,
    transition: "opacity 0.15s",
    zIndex: 10,
  };

  /* ── Background patterns ── */
  const wallBg = isWall
    /* diagonal hatch — structural/masonry convention */
    ? "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.07) 3px, rgba(255,255,255,0.07) 4px)"
    /* gentle diagonal stripe — open passage */
    : "repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(60,120,200,0.07) 10px, rgba(60,120,200,0.07) 11px)";

  const borderColor = selected
    ? "#F56300"
    : isWall
      ? (hovered ? "#646464" : "#484848")
      : (hovered ? "#5A9FD4" : "#3A78B0");

  const borderStyle = `${selected ? "1.5px" : (isWall ? "1.5px" : "2px")} ${isWall ? "solid" : (selected ? "solid" : "dashed")} ${borderColor}`;

  return (
    <>
      {/* ── Resize handles ── */}
      <NodeResizer
        isVisible={selected}
        {...resizerProps}
        lineStyle={{ stroke: "#F56300", strokeWidth: 1.5 }}
        handleStyle={{
          width: 8, height: 8,
          backgroundColor: "#F56300",
          border: "2px solid #0F0F14",
          borderRadius: 2,
        }}
        onResizeEnd={(_e, params) => {
          resizeWall(
            id,
            { x: params.x, y: params.y },
            { width: params.width, height: params.height },
          );
        }}
      />

      {/* ── Endpoint connection handles (one at each end) ── */}
      {isH ? (
        <>
          <Handle type="source" position={Position.Left}  id="start" style={endHandleStyle} />
          <Handle type="source" position={Position.Right} id="end"   style={endHandleStyle} />
        </>
      ) : (
        <>
          <Handle type="source" position={Position.Top}    id="start" style={endHandleStyle} />
          <Handle type="source" position={Position.Bottom} id="end"   style={endHandleStyle} />
        </>
      )}

      {/* ── Segment body ── */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width:  "100%",
          height: "100%",
          backgroundColor: isWall ? "#3A3A3A" : "rgba(50,110,170,0.10)",
          backgroundImage: wallBg,
          border:          borderStyle,
          borderRadius:    isWall ? 1 : 4,
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
        {/* Label — visible only when the segment is thick enough */}
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
            /* Rotate label to match the segment's long axis */
            transform:     isH ? "none" : "rotate(-90deg)",
          }}
        >
          {config.label}
        </span>
      </div>
    </>
  );
}
