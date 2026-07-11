"use client";

import type { NodeProps } from "@xyflow/react";
import { useFactoryStore } from "@/stores/useFactoryStore";

type Dir = "up" | "down" | "left" | "right";

/**
 * Two independently-bordered rectangles overlapping at a junction can't
 * blend into one seamless outline — their borders cross and leave a visible
 * seam. This renders a small opaque patch over the junction with a border
 * only on the sides that face open space, rounding a corner only when BOTH
 * of its adjacent sides are open (an L). A T's one open side stays flat,
 * flush with the through-wall's own edge; an X has no open side at all.
 */
export function WallJoinCapNode({ data }: NodeProps) {
  const { occupied, thickness, isWall, wallIds } = data as {
    occupied:  Dir[];
    thickness: number;
    isWall:    boolean;
    wallIds:   string[];
  };

  const isHot = useFactoryStore((s) =>
    wallIds.some((id) => id === s.hoveredWallId || id === s.selectedNodeId),
  );

  const free = (d: Dir) => !occupied.includes(d);
  const capR = thickness / 2;

  const wallBg = isWall
    ? "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.07) 3px, rgba(255,255,255,0.07) 4px)"
    : "repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(60,120,200,0.07) 10px, rgba(60,120,200,0.07) 11px)";
  const borderColor = isHot
    ? (isWall ? "#646464" : "#5A9FD4")
    : (isWall ? "#484848" : "#3A78B0");
  const borderWidth = isWall ? "1.5px" : "2px";
  const side = (open: boolean) => (open ? `${borderWidth} solid ${borderColor}` : "none");

  return (
    <div
      style={{
        width: "100%", height: "100%",
        backgroundColor: isWall ? "#3A3A3A" : "rgba(50,110,170,0.10)",
        backgroundImage: wallBg,
        borderTop:    side(free("up")),
        borderBottom: side(free("down")),
        borderLeft:   side(free("left")),
        borderRight:  side(free("right")),
        borderTopLeftRadius:     free("up") && free("left")  ? capR : 0,
        borderTopRightRadius:    free("up") && free("right") ? capR : 0,
        borderBottomLeftRadius:  free("down") && free("left")  ? capR : 0,
        borderBottomRightRadius: free("down") && free("right") ? capR : 0,
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    />
  );
}
