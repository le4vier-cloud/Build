"use client";

import { NodeResizer, Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useState } from "react";
import { useFactoryStore } from "@/stores/useFactoryStore";
import {
  Cpu, Wrench, CheckCheck, Archive,
  Truck, Briefcase, Package, Send,
} from "lucide-react";
import { ZONE_COLORS, ZONE_LABELS, ZoneType, FactoryZone } from "@/types/factory";

const ICONS: Record<ZoneType, React.ReactNode> = {
  machining:     <Cpu     size={10} strokeWidth={1.8} />,
  assembly:      <Wrench  size={10} strokeWidth={1.8} />,
  quality:       <CheckCheck size={10} strokeWidth={1.8} />,
  storage:       <Archive size={10} strokeWidth={1.8} />,
  logistics:     <Truck   size={10} strokeWidth={1.8} />,
  office:        <Briefcase size={10} strokeWidth={1.8} />,
  raw_materials: <Package size={10} strokeWidth={1.8} />,
  dispatch:      <Send    size={10} strokeWidth={1.8} />,
};

export function FactoryZoneNode({ id, data, selected }: NodeProps) {
  const zone = data.zone as FactoryZone;
  const { resizeNode } = useFactoryStore();
  const [hovered, setHovered] = useState(false);
  const colors = ZONE_COLORS[zone.type];
  const label  = ZONE_LABELS[zone.type];
  const icon   = ICONS[zone.type];

  const handleStyle: React.CSSProperties = {
    width: 8, height: 8,
    backgroundColor: colors.border,
    border: "1.5px solid #0F0F14",
    borderRadius: "50%",
    opacity: hovered || selected ? 1 : 0,
    transition: "opacity 0.15s",
    zIndex: 10,
  };

  return (
    <>
      {/* ── Resize handles ── */}
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={60}
        lineStyle={{ stroke: "#F56300", strokeWidth: 1.5, strokeDasharray: "none" }}
        handleStyle={{
          width: 9, height: 9,
          backgroundColor: "#F56300",
          border: "2px solid #0F0F14",
          borderRadius: 2,
        }}
        onResizeEnd={(_e, params) => {
          /* params carries the updated x/y when a left or top handle is dragged —
             we must save position alongside dimensions or the node jumps back. */
          resizeNode(
            id,
            { x: params.x, y: params.y },
            { width: params.width, height: params.height },
          );
        }}
      />

      {/* ── Connection handles (all 4 sides) ── */}
      <Handle type="source" position={Position.Top}    id="t" style={handleStyle} />
      <Handle type="source" position={Position.Right}  id="r" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="b" style={handleStyle} />
      <Handle type="source" position={Position.Left}   id="l" style={handleStyle} />

      {/* ── Zone body ── */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: colors.bg,
          border: `1.5px solid ${selected ? "#F56300" : (hovered ? colors.border + "CC" : colors.border + "66")}`,
          borderRadius: 3,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: selected
            ? `0 0 0 1px #F56300, 0 0 20px rgba(245,99,0,0.15), inset 0 0 30px ${colors.border}08`
            : `0 2px 12px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.2)`,
          transition: "border-color 0.15s, box-shadow 0.15s",
          cursor: "default",
          userSelect: "none",
        }}
      >
        {/* Type header strip */}
        <div style={{
          height: 22,
          backgroundColor: colors.border + "1A",
          borderBottom: `1px solid ${colors.border}33`,
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "0 8px",
          flexShrink: 0,
        }}>
          <span style={{ color: colors.text, display: "flex", opacity: 0.9 }}>{icon}</span>
          <span style={{
            fontSize: 8,
            fontWeight: 800,
            color: colors.text,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            opacity: 0.8,
            fontFamily: "monospace",
          }}>
            {label}
          </span>
        </div>

        {/* Zone name */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "6px 10px",
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#E8E8F2",
            textAlign: "center",
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}>
            {zone.name}
          </span>
        </div>

        {/* Footer: capacity */}
        {zone.capacity && zone.capacity > 0 && (
          <div style={{
            height: 16,
            borderTop: `1px solid ${colors.border}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 7px",
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: 8,
              color: colors.text + "77",
              fontFamily: "monospace",
              letterSpacing: "0.05em",
            }}>
              CAP {zone.capacity}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
