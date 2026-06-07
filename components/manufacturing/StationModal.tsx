import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useManufacturingStore } from '@/stores/useManufacturingStore';
import { Button } from '@/components/ui/button';
import { X, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface StationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StationModal = ({ open, onOpenChange }: StationModalProps) => {
  const {
    selectedNodeId,
    stationNodes,
    stations,
    tasks,
    workflows,
    removeTaskFromStation,
    removeWorkflowFromStation,
  } = useManufacturingStore();

  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());

  const selectedNode = stationNodes.find(n => n.id === selectedNodeId);
  const station = selectedNode ? stations.find(s => s.id === selectedNode.stationId) : null;

  if (!selectedNode || !station) return null;

  const assignedTasks = tasks.filter(t => selectedNode.assignedTasks.includes(t.id));
  const assignedWorkflows = workflows.filter(w => selectedNode.assignedWorkflows.includes(w.id));

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {station.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Wage Rate</p>
              <p className="text-lg font-semibold text-foreground">R{station.wagePerHour}/hr</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tools</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {station.tools.map(tool => (
                  <Badge key={tool} variant="outline" className="text-xs">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-4 pr-4">
              {/* Assigned Workflows */}
              {assignedWorkflows.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Assigned Workflows</h3>
                  <div className="space-y-2">
                    {assignedWorkflows.map(workflow => {
                      const workflowTasks = tasks.filter(t => workflow.taskIds.includes(t.id));
                      const totalDuration = workflowTasks.reduce((sum, t) => sum + t.duration, 0);
                      const isExpanded = expandedWorkflows.has(workflow.id);

                      return (
                        <div key={workflow.id} className="space-y-1">
                          <div className="p-3 bg-secondary rounded-lg border border-border">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() => toggleWorkflow(workflow.id)}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                  <span className="font-medium text-foreground">{workflow.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {workflowTasks.length} tasks
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground ml-7">
                                  <Clock className="w-3 h-3" />
                                  {totalDuration} min
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeWorkflowFromStation(selectedNode.id, workflow.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Expanded workflow tasks */}
                          {isExpanded && (
                            <div className="ml-6 space-y-1">
                              {workflowTasks.map(task => (
                                <div
                                  key={task.id}
                                  className="p-2 bg-secondary/30 rounded-lg border border-border/50"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-foreground">{task.name}</span>
                                        <Badge 
                                          variant={task.optionSet === 'machine' ? 'default' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {task.optionSet}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        {task.duration} min
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assigned Tasks */}
              {assignedTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Assigned Tasks</h3>
                  <div className="space-y-2">
                    {assignedTasks.map(task => (
                      <div
                        key={task.id}
                        className="p-3 bg-secondary rounded-lg border border-border"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-foreground">{task.name}</span>
                              <Badge 
                                variant={task.optionSet === 'machine' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {task.optionSet}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {task.duration} min
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTaskFromStation(selectedNode.id, task.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {assignedTasks.length === 0 && assignedWorkflows.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No tasks or workflows assigned yet. Drag items from the sidebar to assign them.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};