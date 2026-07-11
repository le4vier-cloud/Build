"use client";

import type { NodeProps } from "@xyflow/react";
import { useState } from "react";
import { WALL_CONFIG, type FactoryWall } from "@/types/factory";

export function FactoryWallNode({ data, selected }: NodeProps) {
  const {
    wall, wallLength, angle,
    startRounded = true, endRounded = true,
    isPreview = false, onHoverChange,
  } = data as {
    wall:       FactoryWall;
    wallLength: number;
    angle:      number;
    startRounded?: boolean;
    endRounded?:   boolean;
    isPreview?:    boolean;
    onHoverChange?: (hovered: boolean) => void;
  };

  const config  = WALL_CONFIG[wall.wallType];
  const isWall  = wall.wallType === "wall";
  const [hov, setHov] = useState(false);

  const wallBg = isWall
    ? "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.07) 3px, rgba(255,255,255,0.07) 4px)"
    : "repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(60,120,200,0.07) 10px, rgba(60,120,200,0.07) 11px)";

  const borderColor = selected
    ? "#F56300"
    : isWall
      ? (hov ? "#646464" : "#484848")
      : (hov ? "#5A9FD4" : "#3A78B0");

  const borderWidth = selected ? "1.5px" : isWall ? "1.5px" : "2px";
  const borderType  = isWall || selected ? "solid" : "dashed";
  const angleDeg    = angle * (180 / Math.PI);

  /* Per-end rounding — local x=0 (left, pre-rotation) is always the wall's
     start side and local x=wallLength (right) is always the end side,
     regardless of the segment's actual on-canvas orientation, since the
     rotation is applied to the whole box afterwards. A capped end fully
     rounds into a semicircle; a flat end stays square. */
  const capR      = wall.thickness / 2;
  const startR    = startRounded ? capR : 0;
  const endR      = endRounded   ? capR : 0;

  return (
    /* Transparent AABB — the whole node's hit area */
    <div
      onMouseEnter={() => { setHov(true); onHoverChange?.(true); }}
      onMouseLeave={() => { setHov(false); onHoverChange?.(false); }}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      {/* Rotated capsule — the actual visual */}
      <div
        style={{
          position:        "absolute",
          left:            "50%",
          top:             "50%",
          width:           wallLength,
          height:          wall.thickness,
          transform:       `translate(-50%, -50%) rotate(${angleDeg}deg)`,
          backgroundColor: isWall ? "#3A3A3A" : "rgba(50,110,170,0.10)",
          backgroundImage: wallBg,
          border:          `${borderWidth} ${borderType} ${borderColor}`,
          borderTopLeftRadius:     startR,
          borderBottomLeftRadius:  startR,
          borderTopRightRadius:    endR,
          borderBottomRightRadius: endR,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          overflow:        "hidden",
          opacity:         isPreview ? 0.4 : 1,
          boxShadow:       selected
            ? "0 0 0 1px #F56300, 0 0 14px rgba(245,99,0,0.18)"
            : isWall
              ? "0 1px 6px rgba(0,0,0,0.35)"
              : "none",
          transition:      isPreview ? "none" : "border-color 0.15s, box-shadow 0.15s, border-radius 0.1s",
          cursor:          "default",
          userSelect:      "none",
          pointerEvents:   "none",
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
          }}
        >
          {config.label}
        </span>
      </div>
    </div>
  );
}
