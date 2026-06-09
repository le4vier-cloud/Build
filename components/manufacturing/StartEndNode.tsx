"use client";

import { Handle, Position } from "@xyflow/react";
import { Play, CheckCheck } from "lucide-react";

interface StartEndNodeProps {
  data: { label: string; type: "start" | "end" };
}

export const StartEndNode = ({ data }: StartEndNodeProps) => {
  const isStart = data.type === "start";

  return (
    <>
      {isStart && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: "#F56300", border: "2px solid #fff", width: 10, height: 10 }}
        />
      )}

      <div
        style={{
          padding: "10px 22px",
          borderRadius: 999,
          backgroundColor: isStart ? "#F56300" : "#1D1D1F",
          color: "#FFFFFF",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 7,
          boxShadow: isStart
            ? "0 4px 18px rgba(245,99,0,0.45)"
            : "0 4px 14px rgba(0,0,0,0.3)",
          userSelect: "none",
          whiteSpace: "nowrap",
          cursor: "default",
        }}
      >
        {isStart ? (
          <Play size={12} fill="#fff" color="#fff" />
        ) : (
          <CheckCheck size={12} color="#fff" />
        )}
        {data.label}
      </div>

      {!isStart && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: "#1D1D1F", border: "2px solid #fff", width: 10, height: 10 }}
        />
      )}
    </>
  );
};
