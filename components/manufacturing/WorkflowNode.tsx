"use client";

import { Handle, Position } from "@xyflow/react";
import { Clock, User2, Cpu, Workflow } from "lucide-react";

interface WfTask {
  id: string;
  name: string;
  duration: number;
  optionSet: "machine" | "human";
}

interface WorkflowNodeData {
  workflow: { id: string; name: string; taskIds: string[] };
  tasks: WfTask[];
}

const fmtMin = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
};

export function WorkflowNode({ data }: { data: WorkflowNodeData }) {
  const { workflow, tasks } = data;
  const totalTime = tasks.reduce((s, t) => s + t.duration, 0);

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 10, height: 10, background: "#F56300", border: "2px solid #fff" }}
      />

      <div style={{
        backgroundColor: "#fff",
        border: "1px solid #E5E5EA",
        borderTop: "3px solid #F56300",
        borderRadius: 10,
        minWidth: 210,
        maxWidth: 260,
        boxShadow: "0 2px 14px rgba(0,0,0,0.09)",
        overflow: "hidden",
        cursor: "grab",
      }}>
        {/* Header */}
        <div style={{
          padding: "9px 14px 8px",
          borderBottom: "1px solid #F0F0F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          backgroundColor: "#FAFAFA",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <Workflow size={12} color="#F56300" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {workflow.name}
            </span>
          </div>
          {totalTime > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#888", fontWeight: 600, flexShrink: 0 }}>
              <Clock size={10} />{fmtMin(totalTime)}
            </span>
          )}
        </div>

        {/* Task list */}
        <div style={{ padding: "6px 0 4px" }}>
          {tasks.length === 0 ? (
            <p style={{ fontSize: 11, color: "#bbb", padding: "4px 14px", fontStyle: "italic", margin: 0 }}>
              No tasks assigned
            </p>
          ) : (
            tasks.map((t, i) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 14px" }}>
                <span style={{ fontSize: 10, color: "#ccc", width: 14, flexShrink: 0, fontWeight: 700, textAlign: "right" }}>
                  {i + 1}
                </span>
                {t.optionSet === "machine"
                  ? <Cpu  size={10} color="#2563EB" style={{ flexShrink: 0 }} />
                  : <User2 size={10} color="#059669" style={{ flexShrink: 0 }} />
                }
                <span style={{ flex: 1, fontSize: 12, color: "#1a1a1a", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.name}
                </span>
                <span style={{ fontSize: 10, color: "#aaa", fontWeight: 600, flexShrink: 0 }}>
                  {fmtMin(t.duration)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 10, height: 10, background: "#F56300", border: "2px solid #fff" }}
      />
    </>
  );
}
