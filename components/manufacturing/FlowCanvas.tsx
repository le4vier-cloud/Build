"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import { StationNodeComponent } from "./StationNodeComponent";
import { StartEndNode } from "./StartEndNode";

const nodeTypes = {
  station: StationNodeComponent,
  startEnd: StartEndNode,
};

export const FlowCanvas = () => {
  const {
    stationNodes, stations, currentProcess,
    updateStationPosition, calculateTiming, getNodeDuration,
  } = useManufacturingStore();

  const [startPos, setStartPos] = useState({ x: 60, y: 220 });
  const [endPos,   setEndPos]   = useState({ x: 900, y: 220 });

  const buildNodes = (): Node[] => [
    {
      id: "start",
      type: "startEnd",
      position: startPos,
      data: { label: "Start", type: "start" },
      draggable: true,
    },
    ...stationNodes.map((node) => ({
      id: node.id,
      type: "station" as const,
      position: node.position,
      data: { stationNode: node },
    })),
    {
      id: "end",
      type: "startEnd",
      position: endPos,
      data: { label: "End", type: "end" },
      draggable: true,
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  /* Sync store → canvas whenever stationNodes change */
  useEffect(() => {
    setNodes(buildNodes());
    calculateTiming();
    // Push end-node rightward when stations are added
    if (stationNodes.length > 0) {
      const rightmost = stationNodes.reduce(
        (max, n) => (n.position.x > max ? n.position.x : max),
        0
      );
      setEndPos({ x: Math.max(rightmost + 280, 900), y: 220 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationNodes]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: false,
            style: { stroke: "#F56300", strokeWidth: 2 },
            markerEnd: { type: "arrowclosed" as const, color: "#F56300" },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeDragStop = useCallback(
    (_event: unknown, node: Node) => {
      if (node.type === "station") {
        updateStationPosition(node.id, node.position);
      } else if (node.id === "start") {
        setStartPos(node.position);
      } else if (node.id === "end") {
        setEndPos(node.position);
      }
    },
    [updateStationPosition]
  );

  const bottleneckStation = (() => {
    if (!currentProcess?.criticalPath.length) return null;
    const id = currentProcess.criticalPath[0];
    const st = stations.find((s) => s.id === id);
    const node = stationNodes.find((n) => n.stationId === id);
    if (!st || !node) return null;
    const dur = getNodeDuration(node);
    return { name: st.name, duration: dur };
  })();

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#FAFAFA" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.2}
          color="#D1D1D6"
        />
        <Controls
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E5EA",
            borderRadius: 8,
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          }}
        />
        <MiniMap
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E5EA",
            borderRadius: 8,
          }}
          nodeColor={(node) => {
            if (node.type === "startEnd") return "#F56300";
            return "#E5E5EA";
          }}
          maskColor="rgba(245,245,247,0.7)"
        />

        {/* Bottleneck banner */}
        {bottleneckStation && (
          <Panel position="top-center">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                backgroundColor: "#FFF0E6",
                border: "1px solid #F56300",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                color: "#C44D00",
                boxShadow: "0 2px 8px rgba(245,99,0,0.15)",
              }}
            >
              <span style={{ fontSize: 14 }}>⚡</span>
              Bottleneck: {bottleneckStation.name}
              <span
                style={{
                  backgroundColor: "#F56300",
                  color: "#fff",
                  borderRadius: 4,
                  padding: "1px 7px",
                  fontWeight: 700,
                  fontSize: 11,
                }}
              >
                {bottleneckStation.duration} min
              </span>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};
