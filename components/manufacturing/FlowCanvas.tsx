"use client";

import { useCallback, useEffect, useRef } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useManufacturingStore } from "@/stores/useManufacturingStore";
import { useDarkMode, FACTORY_DARK, FACTORY_LIGHT } from "@/components/factory/FactoryFloorBuilder";
import { StartEndNode } from "./StartEndNode";
import { WorkflowNode } from "./WorkflowNode";

const nodeTypes = {
  startEnd: StartEndNode,
  workflowNode: WorkflowNode,
};

const EDGE_STYLE = { stroke: "#F56300", strokeWidth: 2 };
const EDGE_MARKER = { type: "arrowclosed" as const, color: "#F56300" };

const GAP_X  = 310;
const ORIG_X  = 60;
const ORIG_Y  = 130;

export const FlowCanvas = () => {
  const isDark = useDarkMode();
  const t = isDark ? FACTORY_DARK : FACTORY_LIGHT;
  const { workflows, tasks } = useManufacturingStore();
  const edgesInitRef = useRef(false);

  /* ── Build nodes from store ──────────────────────────────────── */
  const buildNodes = (): Node[] => [
    {
      id: "start",
      type: "startEnd",
      position: { x: ORIG_X, y: ORIG_Y + 50 },
      data: { label: "Start", type: "start" },
      draggable: true,
    },
    ...workflows.map((wf, i) => ({
      id: `wf-${wf.id}`,
      type: "workflowNode" as const,
      position: { x: ORIG_X + 180 + i * GAP_X, y: ORIG_Y },
      data: {
        workflow: wf,
        tasks: [...tasks]
          .filter(t => wf.taskIds.includes(t.id))
          .sort((a, b) => wf.taskIds.indexOf(a.id) - wf.taskIds.indexOf(b.id)),
      },
      draggable: true,
    })),
    {
      id: "end",
      type: "startEnd",
      position: { x: ORIG_X + 180 + workflows.length * GAP_X, y: ORIG_Y + 50 },
      data: { label: "End", type: "end" },
      draggable: true,
    },
  ];

  /* ── Default sequential edges ────────────────────────────────── */
  const buildDefaultEdges = (): Edge[] => {
    if (workflows.length === 0) {
      return [{ id: "s-e", source: "start", target: "end", style: EDGE_STYLE, markerEnd: EDGE_MARKER }];
    }
    const edges: Edge[] = [
      { id: "s-w0", source: "start", target: `wf-${workflows[0].id}`, style: EDGE_STYLE, markerEnd: EDGE_MARKER },
    ];
    workflows.slice(0, -1).forEach((wf, i) => {
      edges.push({ id: `w${i}-w${i + 1}`, source: `wf-${wf.id}`, target: `wf-${workflows[i + 1].id}`, style: EDGE_STYLE, markerEnd: EDGE_MARKER });
    });
    edges.push({ id: "wl-e", source: `wf-${workflows[workflows.length - 1].id}`, target: "end", style: EDGE_STYLE, markerEnd: EDGE_MARKER });
    return edges;
  };

  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  /* Sync node content when workflows/tasks change, preserving user positions */
  useEffect(() => {
    setNodes(prev => {
      const posMap = new Map(prev.map(n => [n.id, n.position]));
      return buildNodes().map(n => ({ ...n, position: posMap.get(n.id) ?? n.position }));
    });
    /* Set default edges only on first non-empty workflows load */
    if (!edgesInitRef.current && workflows.length > 0) {
      setEdges(buildDefaultEdges());
      edgesInitRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflows, tasks]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges(eds => addEdge({ ...connection, style: EDGE_STYLE, markerEnd: EDGE_MARKER }, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: t.canvasBg }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode="Delete"
        style={{ backgroundColor: t.canvasBg }}
      >
        <Background id="minor" variant={BackgroundVariant.Lines} gap={20} lineWidth={0.4} color={t.gridMinor} style={{ backgroundColor: t.canvasBg }} />
        <Background id="major" variant={BackgroundVariant.Lines} gap={100} lineWidth={0.8} color={t.gridMajor} />
        <Controls style={{ backgroundColor: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8 }} />
        <MiniMap
          style={{ backgroundColor: t.statusBg, border: `1px solid ${t.border}`, borderRadius: 8 }}
          nodeColor={n => n.type === "startEnd" ? "#F56300" : t.panelBg}
          maskColor={isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.06)"}
        />
      </ReactFlow>
    </div>
  );
};
