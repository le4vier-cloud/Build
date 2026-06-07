import { useCallback, useEffect, useState } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useManufacturingStore } from '@/stores/useManufacturingStore';
import { StationNodeComponent } from './StationNodeComponent';
import { StartEndNode } from './StartEndNode';
import { motion } from 'framer-motion';

const nodeTypes = {
  station: StationNodeComponent,
  startEnd: StartEndNode,
};

export const FlowCanvas = () => {
  const { stationNodes, updateStationPosition, calculateTiming } = useManufacturingStore();
  
  // Store positions for start and end nodes
  const [startPos, setStartPos] = useState({ x: 100, y: 250 });
  const [endPos, setEndPos] = useState({ x: 800, y: 250 });
  
  // Convert station nodes to React Flow nodes
  const initialNodes: Node[] = [
    {
      id: 'start',
      type: 'startEnd',
      position: startPos,
      data: { label: 'START', type: 'start' },
      draggable: true,
    },
    ...stationNodes.map((node) => ({
      id: node.id,
      type: 'station',
      position: node.position,
      data: { stationNode: node },
    })),
    {
      id: 'end',
      type: 'startEnd',
      position: endPos,
      data: { label: 'END', type: 'end' },
      draggable: true,
    },
  ];

  const initialEdges: Edge[] = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when stationNodes change
  useEffect(() => {
    const updatedNodes: Node[] = [
      {
        id: 'start',
        type: 'startEnd',
        position: startPos,
        data: { label: 'START', type: 'start' },
        draggable: true,
      },
      ...stationNodes.map((node) => ({
        id: node.id,
        type: 'station',
        position: node.position,
        data: { stationNode: node },
      })),
      {
        id: 'end',
        type: 'startEnd',
        position: endPos,
        data: { label: 'END', type: 'end' },
        draggable: true,
      },
    ];
    setNodes(updatedNodes);

    // Auto-calculate timing
    calculateTiming();
  }, [stationNodes, startPos, endPos, setNodes, calculateTiming]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({
        ...connection,
        animated: true,
        style: { stroke: 'hsl(var(--primary))' },
      }, eds));
    },
    [setEdges]
  );

  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (node.type === 'station') {
        updateStationPosition(node.id, node.position);
      } else if (node.id === 'start') {
        setStartPos(node.position);
      } else if (node.id === 'end') {
        setEndPos(node.position);
      }
    },
    [updateStationPosition]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full w-full bg-canvas rounded-xl overflow-hidden shadow-[var(--shadow-strong)]"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-canvas"
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="hsl(var(--border))"
        />
        <Controls className="bg-card border-border" />
        <MiniMap 
          className="bg-card border-border"
          nodeColor={(node) => {
            if (node.type === 'startEnd') return 'hsl(var(--primary))';
            return 'hsl(var(--node))';
          }}
        />
      </ReactFlow>
    </motion.div>
  );
};
