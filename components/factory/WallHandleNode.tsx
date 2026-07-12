"use client";

import type { NodeProps } from "@xyflow/react";
import { useFactoryStore } from "@/stores/useFactoryStore";

/* The node's own bounding box is padded well past the visible dot (see the
   size given to this node type in FactoryFloorBuilder) so there's a real
   margin around each endpoint where the cursor changes and the dot reveals
   itself — without it, the dot only appeared once the wall underneath was
   already hovered, and there was no cue at all that a point was draggable
   until the cursor landed exactly on a 12px circle. */
export function WallHandleNode({ data, selected, dragging }: NodeProps) {
  /* neighbors = how many compass directions are occupied at this point:
     1 = free end, 2 = L-corner, 3 = T, 4 = X (four-way — nothing left to
     drag out, so the dot never shows there and the margin isn't draggable). */
  const { wallId, neighbors = 1 } = data as { wallId: string; neighbors?: number };
  const draggable = neighbors < 4;

  /* Fine-grained store subscriptions — only the handles belonging to the
     hovered/selected wall re-render, instead of rebuilding the whole
     node tree on every hover tick (which was the source of the flicker). */
  const isHot = useFactoryStore(
    (s) => s.hoveredWallId === wallId || s.selectedNodeId === wallId,
  );
  const setHoveredWallId = useFactoryStore((s) => s.setHoveredWallId);
  const visible = isHot && draggable && !dragging;

  return (
    <div
      onMouseEnter={() => draggable && setHoveredWallId(wallId)}
      onMouseLeave={() => setHoveredWallId(null)}
      style={{
        width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: draggable ? "crosshair" : "default",
      }}
    >
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
          transition:      "transform 0.1s, box-shadow 0.1s, opacity 0.12s",
          transform:       selected ? "scale(1.35)" : "scale(1)",
          opacity:         visible ? 1 : 0,
          pointerEvents:   "none",
        }}
      />
    </div>
  );
}
