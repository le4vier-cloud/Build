"use client";

import type { NodeProps } from "@xyflow/react";

export function WallHandleNode({ data, selected }: NodeProps) {
  const { visible = true } = data as { visible?: boolean };

  return (
    <div
      style={{
        width:           12,
        height:          12,
        borderRadius:    "50%",
        backgroundColor: "#22C55E",
        border:          "2px solid #0F0F14",
        boxShadow:       selected
          ? "0 0 0 2px #22C55E88, 0 0 8px rgba(34,197,94,0.6)"
          : "0 0 0 1px #22C55E44, 0 0 4px rgba(34,197,94,0.35)",
        cursor:          "crosshair",
        transition:      "transform 0.1s, box-shadow 0.1s, opacity 0.12s",
        transform:       selected ? "scale(1.35)" : "scale(1)",
        opacity:         visible ? 1 : 0,
        pointerEvents:   visible ? "auto" : "none",
      }}
    />
  );
}
