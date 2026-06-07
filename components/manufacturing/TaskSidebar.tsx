import { motion } from 'framer-motion';
import { useManufacturingStore } from '@/stores/useManufacturingStore';
import { DragEvent, useState } from 'react';
import { GripVertical, Clock, Wrench, User, ChevronDown, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const TaskSidebar = () => {
  const { getAvailableTasks, workflows, tasks, stationNodes } = useManufacturingStore();
  const availableTasks = getAvailableTasks();
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());

  // Filter out workflows and tasks that are already assigned to stations
  const assignedWorkflowIds = new Set(stationNodes.flatMap(n => n.assignedWorkflows));
  const assignedTaskIds = new Set(stationNodes.flatMap(n => n.assignedTasks));
  
  // Get tasks from assigned workflows
  const tasksInAssignedWorkflows = new Set(
    workflows
      .filter(w => assignedWorkflowIds.has(w.id))
      .flatMap(w => w.taskIds)
  );

  const availableWorkflows = workflows.filter(w => !assignedWorkflowIds.has(w.id));
  const availableIndividualTasks = availableTasks.filter(
    t => !assignedTaskIds.has(t.id) && !tasksInAssignedWorkflows.has(t.id)
  );

  const handleDragStart = (e: DragEvent, type: 'task' | 'workflow', id: string) => {
    e.dataTransfer.setData('type', type);
    e.dataTransfer.setData('id', id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const toggleWorkflow = (workflowId: string) => {
    const newExpanded = new Set(expandedWorkflows);
    if (newExpanded.has(workflowId)) {
      newExpanded.delete(workflowId);
    } else {
      newExpanded.add(workflowId);
    }
    setExpandedWorkflows(newExpanded);
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-80 bg-sidebar border-r border-border flex flex-col h-full"
    >
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Available Resources</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Drag items onto stations
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Workflows */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Workflows
            </h3>
            <div className="space-y-2">
              {availableWorkflows.map(workflow => {
                const workflowTasks = tasks.filter(t => workflow.taskIds.includes(t.id));
                const totalDuration = workflowTasks.reduce((sum, t) => sum + t.duration, 0);
                const isExpanded = expandedWorkflows.has(workflow.id);
                
                return (
                  <div key={workflow.id} className="space-y-1">
                    <motion.div
                      draggable
                      onDragStart={(e: any) => handleDragStart(e, 'workflow', workflow.id)}
                      whileHover={{ scale: 1.02 }}
                      className="p-3 bg-card rounded-lg border border-border cursor-move hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWorkflow(workflow.id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {workflow.name}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {workflowTasks.length} tasks
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground ml-11">
                        <Clock className="w-3 h-3" />
                        {totalDuration} min total
                      </div>
                    </motion.div>

                    {/* Expanded workflow tasks */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-6 space-y-1"
                      >
                        {workflowTasks.map(task => (
                          <motion.div
                            key={task.id}
                            draggable
                            onDragStart={(e: any) => handleDragStart(e, 'task', task.id)}
                            whileHover={{ scale: 1.02 }}
                            className="p-2 bg-secondary/30 rounded-lg border border-border/50 cursor-move hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <GripVertical className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs font-medium text-foreground">
                                  {task.name}
                                </span>
                              </div>
                              <Badge 
                                variant={task.optionSet === 'machine' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {task.optionSet}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-5">
                              <Clock className="w-3 h-3" />
                              {task.duration} min
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Tasks */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Individual Tasks
            </h3>
            <div className="space-y-2">
              {availableIndividualTasks.map(task => (
                <motion.div
                  key={task.id}
                  draggable
                  onDragStart={(e: any) => handleDragStart(e, 'task', task.id)}
                  whileHover={{ scale: 1.02 }}
                  className="p-3 bg-card rounded-lg border border-border cursor-move hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {task.name}
                      </span>
                    </div>
                    <Badge 
                      variant={task.optionSet === 'machine' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {task.optionSet}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground ml-6">
                    <Clock className="w-3 h-3" />
                    {task.duration} min
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
};