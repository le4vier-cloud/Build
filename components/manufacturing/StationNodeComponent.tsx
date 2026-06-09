"use client";

import { Handle, Position } from "@xyflow/react";
import { StationNode, NodeStaff, NodeMaterial, NodeTool } from "@/types/manufacturing";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import { Clock, Zap, Users, Package, Wrench } from "lucide-react";

interface StationNodeProps {
  data: { stationNode: StationNode };
}

export const StationNodeComponent = ({ data }: StationNodeProps) => {
  const { stationNode } = data;
  const {
    stations, setSelectedNode, currentProcess,
    getStageGroups, getNodeDuration,
    assignTaskToStation, assignWorkflowToStation,
    assignStaffToStation, assignMaterialToStation, assignToolToStation,
  } = useManufacturingStore();

  const station = stations.find((s) => s.id === stationNode.stationId);
  if (!station) return null;

  const duration = getNodeDuration(stationNode);
  const isCritical = currentProcess?.criticalPath.includes(station.id);
  const stageGroups = getStageGroups();
  const currentStage = stageGroups.find((g) => g.stations.some((s) => s.id === stationNode.id));
  const lagTime = currentStage ? currentStage.maxDuration - duration : 0;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const resourceType = e.dataTransfer.getData("resourceType");
    const payloadRaw = e.dataTransfer.getData("resourcePayload");
    if (resourceType && payloadRaw) {
      try {
        const payload = JSON.parse(payloadRaw);
        if (resourceType === "task")     assignTaskToStation(stationNode.id, payload.id);
        if (resourceType === "workflow") assignWorkflowToStation(stationNode.id, payload.id);
        if (resourceType === "staff")    assignStaffToStation(stationNode.id, payload as NodeStaff);
        if (resourceType === "material") assignMaterialToStation(stationNode.id, { ...payload, qty: payload.qty ?? 1 } as NodeMaterial);
        if (resourceType === "tool")     assignToolToStation(stationNode.id, payload as NodeTool);
        return;
      } catch { /* fallthrough */ }
    }
    // Legacy
    const type = e.dataTransfer.getData("type");
    const id   = e.dataTransfer.getData("id");
    if (type === "task")     assignTaskToStation(stationNode.id, id);
    if (type === "workflow") assignWorkflowToStation(stationNode.id, id);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };

  const taskCount  = stationNode.assignedTasks.length + stationNode.assignedWorkflows.length;
  const staffCount = stationNode.assignedStaff?.length ?? 0;
  const matCount   = stationNode.assignedMaterials?.length ?? 0;
  const toolCount  = stationNode.assignedTools?.length ?? 0;

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: "#7B2FBE" }} />

      <div
        onClick={() => setSelectedNode(stationNode.id)}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          minWidth: 180,
          padding: "10px 14px",
          borderRadius: 10,
          border: `2px solid ${isCritical ? "#EF4444" : "#E5E5EA"}`,
          backgroundColor: isCritical ? "rgba(239,68,68,0.04)" : "#FFFFFF",
          cursor: "pointer",
          boxShadow: isCritical ? "0 0 16px rgba(239,68,68,0.2)" : "0 1px 6px rgba(0,0,0,0.06)",
          transition: "box-shadow 0.2s ease",
        }}
      >
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{station.name}</span>
          {isCritical && <Zap size={13} color="#EF4444" fill="#EF4444" />}
        </div>

        {/* Time */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8, color: "#8E8E93" }}>
          <Clock size={11} strokeWidth={1.8} />
          <span style={{ fontSize: 11 }}>{duration} min</span>
          {lagTime > 0 && (
            <span style={{ fontSize: 10, backgroundColor: "#FEF3C7", color: "#D97706", borderRadius: 4, padding: "1px 5px", marginLeft: 4 }}>
              wait {lagTime}m
            </span>
          )}
        </div>

        {/* Resource badges */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {taskCount > 0  && <Pill icon={<Clock size={9} />}   count={taskCount}  color="#7B2FBE" label="tasks" />}
          {staffCount > 0 && <Pill icon={<Users size={9} />}   count={staffCount} color="#2563EB" label="staff" />}
          {matCount > 0   && <Pill icon={<Package size={9} />} count={matCount}   color="#059669" label="parts" />}
          {toolCount > 0  && <Pill icon={<Wrench size={9} />}  count={toolCount}  color="#D97706" label="tools" />}
          {taskCount === 0 && staffCount === 0 && matCount === 0 && toolCount === 0 && (
            <span style={{ fontSize: 10, color: "#AEAEB2" }}>Drop resources here</span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: "#7B2FBE" }} />
    </>
  );
};

function Pill({ icon, count, color, label }: { icon: React.ReactNode; count: number; color: string; label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 3,
      padding: "2px 6px", borderRadius: 4,
      backgroundColor: color + "18", color,
      fontSize: 10, fontWeight: 600,
    }}>
      {icon} {count} {label}
    </div>
  );
}
