import { Handle, Position } from '@xyflow/react';
import { StationNode } from '@/types/manufacturing';
import { useManufacturingStore } from '@/stores/useManufacturingStore';
import { Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface StationNodeProps {
  data: {
    stationNode: StationNode;
  };
}

export const StationNodeComponent = ({ data }: StationNodeProps) => {
  const { stationNode } = data;
  const { 
    stations, 
    tasks, 
    workflows, 
    setSelectedNode, 
    currentProcess,
    getStageGroups,
    assignTaskToStation,
    assignWorkflowToStation,
  } = useManufacturingStore();

  const station = stations.find(s => s.id === stationNode.stationId);
  if (!station) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('type');
    const id = e.dataTransfer.getData('id');

    if (type === 'task') {
      assignTaskToStation(stationNode.id, id);
    } else if (type === 'workflow') {
      assignWorkflowToStation(stationNode.id, id);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Calculate station duration
  let duration = 0;
  stationNode.assignedTasks.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) duration += task.duration;
  });

  stationNode.assignedWorkflows.forEach(workflowId => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      workflow.taskIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (task) duration += task.duration;
      });
    }
  });

  // Check if on critical path
  const isCritical = currentProcess?.criticalPath.includes(station.id);
  
  // Calculate lag time and optimization suggestion
  const stageGroups = getStageGroups();
  const currentStage = stageGroups.find(g => 
    g.stations.some(s => s.id === stationNode.id)
  );
  const lagTime = currentStage ? currentStage.maxDuration - duration : 0;
  
  // Calculate optimal time (average of all stations in stage)
  const optimalTime = currentStage 
    ? currentStage.maxDuration 
    : duration;

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      
      <motion.div
        whileHover={{ scale: 1.02 }}
        onClick={() => setSelectedNode(stationNode.id)}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          min-w-[200px] px-4 py-3 rounded-lg border-2 cursor-pointer
          transition-all duration-300
          ${isCritical 
            ? 'bg-critical/10 border-critical shadow-[0_0_20px_hsl(var(--critical)/0.3)]' 
            : 'bg-node border-border hover:bg-node-hover hover:border-primary/50'
          }
        `}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground">{station.name}</h3>
          {isCritical && (
            <Zap className="w-4 h-4 text-critical" fill="currentColor" />
          )}
        </div>
        
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Clock className="w-3 h-3" />
          <span>{duration} min</span>
        </div>

        {lagTime > 0 && (
          <div className="mt-2 px-2 py-1 rounded bg-warning/10 border border-warning/30">
            <div className="text-xs font-medium text-warning">
              Wait: {lagTime} min
            </div>
          </div>
        )}

        {duration > 0 && duration !== optimalTime && (
          <div className="mt-2 px-2 py-1 rounded bg-accent/10 border border-accent/30">
            <div className="text-xs font-medium text-accent">
              {duration < optimalTime 
                ? `Add ${optimalTime - duration} min to sync`
                : `Reduce ${duration - optimalTime} min to sync`
              }
            </div>
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {stationNode.assignedTasks.length + stationNode.assignedWorkflows.length} assigned
          </div>
        </div>
      </motion.div>

      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </>
  );
};
