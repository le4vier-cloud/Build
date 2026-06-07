export interface Task {
  id: string;
  name: string;
  duration: number; // in minutes
  materials?: string[];
  optionSet: 'machine' | 'human';
  workflowId?: string;
}

export interface Workflow {
  id: string;
  name: string;
  taskIds: string[];
}

export interface Station {
  id: string;
  name: string;
  childWorkflows: string[];
  wagePerHour: number;
  tools: string[];
}

export interface ProductOption {
  id: string;
  name: string;
  taskIds: string[];
}

export interface Product {
  id: string;
  name: string;
  baseTasks: string[]; // Task IDs
  options: ProductOption[];
}

export interface StationNode {
  id: string;
  stationId: string;
  orderIndex: number;
  parallelGroupId: string;
  assignedTasks: string[];
  assignedWorkflows: string[];
  position: { x: number; y: number };
}

export interface ProductionProcess {
  id: string;
  name: string;
  productId: string;
  selectedOptions: string[];
  stationNodes: StationNode[];
  totalTime: number;
  criticalPath: string[]; // Station IDs on critical path
}

export interface StageGroup {
  orderIndex: number;
  parallelGroupId: string;
  stations: StationNode[];
  maxDuration: number;
  criticalStationId: string;
}
