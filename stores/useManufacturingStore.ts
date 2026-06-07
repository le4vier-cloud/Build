import { create } from 'zustand';
import { 
  Product, 
  Station, 
  Task, 
  Workflow, 
  StationNode, 
  ProductionProcess,
  StageGroup 
} from '@/types/manufacturing';

interface ManufacturingStore {
  // Data from Bubble
  products: Product[];
  stations: Station[];
  tasks: Task[];
  workflows: Workflow[];
  
  // Current state
  selectedProduct: Product | null;
  selectedOptions: string[];
  currentProcess: ProductionProcess | null;
  stationNodes: StationNode[];
  selectedNodeId: string | null;
  
  // Actions
  setData: (data: {
    products?: Product[];
    stations?: Station[];
    tasks?: Task[];
    workflows?: Workflow[];
  }) => void;
  setSelectedProduct: (product: Product | null) => void;
  toggleOption: (optionId: string) => void;
  addStationNode: (stationId: string, position: { x: number; y: number }) => void;
  removeStationNode: (nodeId: string) => void;
  updateStationPosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateStationOrder: (nodeId: string, newOrder: number) => void;
  assignTaskToStation: (nodeId: string, taskId: string) => void;
  assignWorkflowToStation: (nodeId: string, workflowId: string) => void;
  removeTaskFromStation: (nodeId: string, taskId: string) => void;
  removeWorkflowFromStation: (nodeId: string, workflowId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  calculateTiming: () => void;
  getAvailableTasks: () => Task[];
  getStageGroups: () => StageGroup[];
  getTotalCost: () => number;
}

export const useManufacturingStore = create<ManufacturingStore>((set, get) => ({
  products: [],
  stations: [],
  tasks: [],
  workflows: [],
  selectedProduct: null,
  selectedOptions: [],
  currentProcess: null,
  stationNodes: [],
  selectedNodeId: null,

  setData: (data) => set((state) => ({
    ...state,
    ...data,
  })),

  setSelectedProduct: (product) => set({
    selectedProduct: product,
    selectedOptions: [],
    stationNodes: [],
    currentProcess: null,
  }),

  toggleOption: (optionId) => set((state) => ({
    selectedOptions: state.selectedOptions.includes(optionId)
      ? state.selectedOptions.filter(id => id !== optionId)
      : [...state.selectedOptions, optionId],
  })),

  addStationNode: (stationId, position) => set((state) => {
    const maxOrder = state.stationNodes.reduce((max, node) => 
      Math.max(max, node.orderIndex), -1);
    
    const newNode: StationNode = {
      id: `node-${Date.now()}`,
      stationId,
      orderIndex: maxOrder + 1,
      parallelGroupId: `group-${maxOrder + 1}`,
      assignedTasks: [],
      assignedWorkflows: [],
      position,
    };

    return { stationNodes: [...state.stationNodes, newNode] };
  }),

  removeStationNode: (nodeId) => set((state) => ({
    stationNodes: state.stationNodes.filter(node => node.id !== nodeId),
    selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
  })),

  updateStationPosition: (nodeId, position) => set((state) => ({
    stationNodes: state.stationNodes.map(node =>
      node.id === nodeId ? { ...node, position } : node
    ),
  })),

  updateStationOrder: (nodeId, newOrder) => set((state) => ({
    stationNodes: state.stationNodes.map(node =>
      node.id === nodeId ? { ...node, orderIndex: newOrder } : node
    ),
  })),

  assignTaskToStation: (nodeId, taskId) => set((state) => ({
    stationNodes: state.stationNodes.map(node =>
      node.id === nodeId && !node.assignedTasks.includes(taskId)
        ? { ...node, assignedTasks: [...node.assignedTasks, taskId] }
        : node
    ),
  })),

  assignWorkflowToStation: (nodeId, workflowId) => set((state) => ({
    stationNodes: state.stationNodes.map(node =>
      node.id === nodeId && !node.assignedWorkflows.includes(workflowId)
        ? { ...node, assignedWorkflows: [...node.assignedWorkflows, workflowId] }
        : node
    ),
  })),

  removeTaskFromStation: (nodeId, taskId) => set((state) => ({
    stationNodes: state.stationNodes.map(node =>
      node.id === nodeId
        ? { ...node, assignedTasks: node.assignedTasks.filter(id => id !== taskId) }
        : node
    ),
  })),

  removeWorkflowFromStation: (nodeId, workflowId) => set((state) => ({
    stationNodes: state.stationNodes.map(node =>
      node.id === nodeId
        ? { ...node, assignedWorkflows: node.assignedWorkflows.filter(id => id !== workflowId) }
        : node
    ),
  })),

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  calculateTiming: () => {
    const state = get();
    const { stationNodes, tasks, workflows, selectedProduct } = state;

    if (!selectedProduct) return;

    const stageGroups = get().getStageGroups();
    let totalTime = 0;
    const criticalPath: string[] = [];

    stageGroups.forEach(group => {
      totalTime += group.maxDuration;
      criticalPath.push(group.criticalStationId);
    });

    set({
      currentProcess: {
        id: `process-${Date.now()}`,
        name: `${selectedProduct.name} Process`,
        productId: selectedProduct.id,
        selectedOptions: state.selectedOptions,
        stationNodes,
        totalTime,
        criticalPath,
      },
    });
  },

  getAvailableTasks: () => {
    const { selectedProduct, selectedOptions, tasks } = get();
    if (!selectedProduct) return [];

    const availableTaskIds = new Set([
      ...selectedProduct.baseTasks,
      ...selectedProduct.options
        .filter(opt => selectedOptions.includes(opt.id))
        .flatMap(opt => opt.taskIds),
    ]);

    return tasks.filter(task => availableTaskIds.has(task.id));
  },

  getStageGroups: () => {
    const { stationNodes, tasks, workflows, stations } = get();

    // Group stations by orderIndex (stage)
    const stageMap = new Map<number, StationNode[]>();
    stationNodes.forEach(node => {
      const existing = stageMap.get(node.orderIndex) || [];
      stageMap.set(node.orderIndex, [...existing, node]);
    });

    const stageGroups: StageGroup[] = [];

    stageMap.forEach((nodes, orderIndex) => {
      let maxDuration = 0;
      let criticalStationId = '';

      // Calculate duration for each station in this stage
      nodes.forEach(node => {
        const station = stations.find(s => s.id === node.stationId);
        if (!station) return;

        // Sum up task durations
        let stationDuration = 0;
        
        node.assignedTasks.forEach(taskId => {
          const task = tasks.find(t => t.id === taskId);
          if (task) stationDuration += task.duration;
        });

        node.assignedWorkflows.forEach(workflowId => {
          const workflow = workflows.find(w => w.id === workflowId);
          if (workflow) {
            workflow.taskIds.forEach(taskId => {
              const task = tasks.find(t => t.id === taskId);
              if (task) stationDuration += task.duration;
            });
          }
        });

        if (stationDuration > maxDuration) {
          maxDuration = stationDuration;
          criticalStationId = node.stationId;
        }
      });

      stageGroups.push({
        orderIndex,
        parallelGroupId: nodes[0].parallelGroupId,
        stations: nodes,
        maxDuration,
        criticalStationId,
      });
    });

    return stageGroups.sort((a, b) => a.orderIndex - b.orderIndex);
  },

  getTotalCost: () => {
    const { tasks, workflows, stations } = get();
    const stageGroups = get().getStageGroups();
    let totalCost = 0;

    // Use stage durations (parallel stations only count slowest)
    stageGroups.forEach(group => {
      group.stations.forEach(node => {
        const station = stations.find(s => s.id === node.stationId);
        if (!station) return;

        let stationDuration = 0;
        
        node.assignedTasks.forEach(taskId => {
          const task = tasks.find(t => t.id === taskId);
          if (task) stationDuration += task.duration;
        });

        node.assignedWorkflows.forEach(workflowId => {
          const workflow = workflows.find(w => w.id === workflowId);
          if (workflow) {
            workflow.taskIds.forEach(taskId => {
              const task = tasks.find(t => t.id === taskId);
              if (task) stationDuration += task.duration;
            });
          }
        });

        // Only count actual working time (not wait time)
        totalCost += (stationDuration / 60) * station.wagePerHour;
      });
    });

    return totalCost;
  },
}));
