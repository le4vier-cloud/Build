import { create } from 'zustand';
import {
  Product,
  Station,
  Task,
  Workflow,
  StationNode,
  ProductionProcess,
  StageGroup,
  StaffResource,
  PartResource,
  ToolResource,
  NodeStaff,
  NodeMaterial,
  NodeTool,
  VasteKosItem,
  BedryfskosItem,
  CostBreakdown,
} from '@/types/manufacturing';

interface ManufacturingStore {
  /* ── Station data ─────────────────────────────── */
  products: Product[];
  stations: Station[];
  tasks: Task[];
  workflows: Workflow[];

  /* ── Resource catalogue ───────────────────────── */
  staffResources: StaffResource[];
  partResources: PartResource[];
  toolResources: ToolResource[];

  /* ── Overhead cost lines ──────────────────────── */
  vasteKosItems: VasteKosItem[];
  bedryfskosItems: BedryfskosItem[];

  /* ── Current canvas state ─────────────────────── */
  selectedProduct: Product | null;
  selectedOptions: string[];
  currentProcess: ProductionProcess | null;
  stationNodes: StationNode[];
  selectedNodeId: string | null;

  /* ── Actions: data loading ────────────────────── */
  setData: (data: {
    products?: Product[];
    stations?: Station[];
    tasks?: Task[];
    workflows?: Workflow[];
    staffResources?: StaffResource[];
    partResources?: PartResource[];
    toolResources?: ToolResource[];
  }) => void;

  /* ── Actions: product / options ───────────────── */
  setSelectedProduct: (product: Product | null) => void;
  toggleOption: (optionId: string) => void;

  /* ── Actions: canvas nodes ────────────────────── */
  addStationNode: (stationId: string, position: { x: number; y: number }) => void;
  removeStationNode: (nodeId: string) => void;
  updateStationPosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateStationOrder: (nodeId: string, newOrder: number) => void;
  setSelectedNode: (nodeId: string | null) => void;

  /* ── Actions: task / workflow assignment ──────── */
  assignTaskToStation: (nodeId: string, taskId: string) => void;
  assignWorkflowToStation: (nodeId: string, workflowId: string) => void;
  removeTaskFromStation: (nodeId: string, taskId: string) => void;
  removeWorkflowFromStation: (nodeId: string, workflowId: string) => void;

  /* ── Actions: resource assignment ────────────── */
  assignStaffToStation: (nodeId: string, staff: NodeStaff) => void;
  removeStaffFromStation: (nodeId: string, staffId: string) => void;
  assignMaterialToStation: (nodeId: string, material: NodeMaterial) => void;
  removeMaterialFromStation: (nodeId: string, partId: string) => void;
  updateMaterialQty: (nodeId: string, partId: string, qty: number) => void;
  assignToolToStation: (nodeId: string, tool: NodeTool) => void;
  removeToolFromStation: (nodeId: string, toolId: string) => void;

  /* ── Actions: overhead cost lines ────────────── */
  addVasteKosItem: (item: Omit<VasteKosItem, 'id'>) => void;
  removeVasteKosItem: (id: string) => void;
  addBedryfskosItem: (item: Omit<BedryfskosItem, 'id'>) => void;
  removeBedryfskosItem: (id: string) => void;

  /* ── Selectors ────────────────────────────────── */
  calculateTiming: () => void;
  getAvailableTasks: () => Task[];
  getStageGroups: () => StageGroup[];
  getNodeDuration: (node: StationNode) => number;
  getCostBreakdown: () => CostBreakdown;

  /** @deprecated use getCostBreakdown().totalPerUnit */
  getTotalCost: () => number;
}

/* ────────────────────────────────────────────── */

export const useManufacturingStore = create<ManufacturingStore>((set, get) => ({
  products: [],
  stations: [],
  tasks: [],
  workflows: [],
  staffResources: [],
  partResources: [],
  toolResources: [],
  vasteKosItems: [],
  bedryfskosItems: [],
  selectedProduct: null,
  selectedOptions: [],
  currentProcess: null,
  stationNodes: [],
  selectedNodeId: null,

  /* ── Data loading ─────────────────────────────── */
  setData: (data) => set((state) => ({ ...state, ...data })),

  /* ── Product / options ────────────────────────── */
  setSelectedProduct: (product) =>
    set({ selectedProduct: product, selectedOptions: [], stationNodes: [], currentProcess: null }),

  toggleOption: (optionId) =>
    set((state) => ({
      selectedOptions: state.selectedOptions.includes(optionId)
        ? state.selectedOptions.filter((id) => id !== optionId)
        : [...state.selectedOptions, optionId],
    })),

  /* ── Canvas nodes ─────────────────────────────── */
  addStationNode: (stationId, position) =>
    set((state) => {
      const maxOrder = state.stationNodes.reduce((max, n) => Math.max(max, n.orderIndex), -1);
      const newNode: StationNode = {
        id: `node-${Date.now()}`,
        stationId,
        orderIndex: maxOrder + 1,
        parallelGroupId: `group-${maxOrder + 1}`,
        assignedTasks: [],
        assignedWorkflows: [],
        assignedStaff: [],
        assignedMaterials: [],
        assignedTools: [],
        position,
      };
      return { stationNodes: [...state.stationNodes, newNode] };
    }),

  removeStationNode: (nodeId) =>
    set((state) => ({
      stationNodes: state.stationNodes.filter((n) => n.id !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    })),

  updateStationPosition: (nodeId, position) =>
    set((state) => ({
      stationNodes: state.stationNodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
    })),

  updateStationOrder: (nodeId, newOrder) =>
    set((state) => ({
      stationNodes: state.stationNodes.map((n) => (n.id === nodeId ? { ...n, orderIndex: newOrder } : n)),
    })),

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  /* ── Task / workflow assignment ───────────────── */
  assignTaskToStation: (nodeId, taskId) =>
    set((state) => ({
      stationNodes: state.stationNodes.map((n) =>
        n.id === nodeId && !n.assignedTasks.includes(taskId)
          ? { ...n, assignedTasks: [...n.assignedTasks, taskId] }
          : n
      ),
    })),

  assignWorkflowToStation: (nodeId, workflowId) =>
    set((state) => ({
      stationNodes: state.stationNodes.map((n) =>
        n.id === nodeId && !n.assignedWorkflows.includes(workflowId)
          ? { ...n, assignedWorkflows: [...n.assignedWorkflows, workflowId] }
          : n
      ),
    })),

  removeTaskFromStation: (nodeId, taskId) =>
    set((state) => ({
      stationNodes: state.stationNodes.map((n) =>
        n.id === nodeId ? { ...n, assignedTasks: n.assignedTasks.filter((id) => id !== taskId) } : n
      ),
    })),

  removeWorkflowFromStation: (nodeId, workflowId) =>
    set((state) => ({
      stationNodes: state.stationNodes.map((n) =>
        n.id === nodeId
          ? { ...n, assignedWorkflows: n.assignedWorkflows.filter((id) => id !== workflowId) }
          : n
      ),
    })),

  /* ── Resource assignment ──────────────────────── */
  assignStaffToStation: (nodeId, staff) =>
    set((state) => ({
      stationNodes: state.stationNodes.map((n) =>
        n.id === nodeId && !n.assignedStaff.some((s) => s.staffId === staff.staffId)
          ? { ...n, assignedStaff: [...n.assignedStaff, staff] }
          : n
      ),
    })),

  removeStaffFromStation: (nodeId, staffId) =>
    set((state) => ({
      stationNodes: state.stationNodes.map((n) =>
        n.id === nodeId
          ? { ...n, assignedStaff: n.assignedStaff.filter((s) => s.staffId !== staffId) }
          : n
      ),
    })),

  assignMaterialToStation: (nodeId, material) =>
    set((state) => ({
      stationNodes: state.stationNodes.map((n) =>
        n.id === nodeId && !n.assignedMaterials.some((m) => m.partId === material.partId)
          ? { ...n, assignedMaterials: [...n.assignedMaterials, material] }
          : n
      ),
    })),

  removeMaterialFromStation: (nodeId, partId) =>
    set((state) => ({
      stationNodes: state.stationNodes.map((n) =>
        n.id === nodeId
          ? { ...n, assignedMaterials: n.assignedMaterials.filter((m) => m.partId !== partId) }
          : n
      ),
    })),

  updateMaterialQty: (nodeId, partId, qty) =>
    set((state) => ({
      stationNodes: state.stationNodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              assignedMaterials: n.assignedMaterials.map((m) =>
                m.partId === partId ? { ...m, qty } : m
              ),
            }
          : n
      ),
    })),

  assignToolToStation: (nodeId, tool) =>
    set((state) => ({
      stationNodes: state.stationNodes.map((n) =>
        n.id === nodeId && !n.assignedTools.some((t) => t.toolId === tool.toolId)
          ? { ...n, assignedTools: [...n.assignedTools, tool] }
          : n
      ),
    })),

  removeToolFromStation: (nodeId, toolId) =>
    set((state) => ({
      stationNodes: state.stationNodes.map((n) =>
        n.id === nodeId
          ? { ...n, assignedTools: n.assignedTools.filter((t) => t.toolId !== toolId) }
          : n
      ),
    })),

  /* ── Overhead cost lines ──────────────────────── */
  addVasteKosItem: (item) =>
    set((state) => ({
      vasteKosItems: [...state.vasteKosItems, { ...item, id: `vk-${Date.now()}` }],
    })),

  removeVasteKosItem: (id) =>
    set((state) => ({ vasteKosItems: state.vasteKosItems.filter((v) => v.id !== id) })),

  addBedryfskosItem: (item) =>
    set((state) => ({
      bedryfskosItems: [...state.bedryfskosItems, { ...item, id: `bk-${Date.now()}` }],
    })),

  removeBedryfskosItem: (id) =>
    set((state) => ({ bedryfskosItems: state.bedryfskosItems.filter((b) => b.id !== id) })),

  /* ── Selectors ────────────────────────────────── */
  getNodeDuration: (node) => {
    const { tasks, workflows } = get();
    let dur = 0;
    node.assignedTasks.forEach((tid) => {
      const t = tasks.find((t) => t.id === tid);
      if (t) dur += t.duration;
    });
    node.assignedWorkflows.forEach((wid) => {
      const w = workflows.find((w) => w.id === wid);
      if (w) w.taskIds.forEach((tid) => { const t = tasks.find((t) => t.id === tid); if (t) dur += t.duration; });
    });
    return dur;
  },

  calculateTiming: () => {
    const state = get();
    if (!state.selectedProduct) return;
    const stageGroups = get().getStageGroups();
    let totalTime = 0;
    const criticalPath: string[] = [];
    stageGroups.forEach((g) => { totalTime += g.maxDuration; criticalPath.push(g.criticalStationId); });
    set({
      currentProcess: {
        id: `process-${Date.now()}`,
        name: `${state.selectedProduct.name} Process`,
        productId: state.selectedProduct.id,
        selectedOptions: state.selectedOptions,
        stationNodes: state.stationNodes,
        totalTime,
        criticalPath,
      },
    });
  },

  getAvailableTasks: () => {
    const { selectedProduct, selectedOptions, tasks } = get();
    if (!selectedProduct) return [];
    const ids = new Set([
      ...selectedProduct.baseTasks,
      ...selectedProduct.options.filter((o) => selectedOptions.includes(o.id)).flatMap((o) => o.taskIds),
    ]);
    return tasks.filter((t) => ids.has(t.id));
  },

  getStageGroups: () => {
    const { stationNodes, stations } = get();
    const stageMap = new Map<number, StationNode[]>();
    stationNodes.forEach((n) => {
      stageMap.set(n.orderIndex, [...(stageMap.get(n.orderIndex) || []), n]);
    });
    const groups: StageGroup[] = [];
    stageMap.forEach((nodes, orderIndex) => {
      let maxDuration = 0;
      let criticalStationId = '';
      nodes.forEach((node) => {
        const station = stations.find((s) => s.id === node.stationId);
        if (!station) return;
        const dur = get().getNodeDuration(node);
        if (dur > maxDuration) { maxDuration = dur; criticalStationId = station.id; }
      });
      groups.push({ orderIndex, parallelGroupId: nodes[0].parallelGroupId, stations: nodes, maxDuration, criticalStationId });
    });
    return groups.sort((a, b) => a.orderIndex - b.orderIndex);
  },

  getCostBreakdown: () => {
    const { stationNodes, vasteKosItems, bedryfskosItems } = get();
    const stageGroups = get().getStageGroups();

    // Total production time (critical path)
    const totalMinutes = stageGroups.reduce((sum, g) => sum + g.maxDuration, 0);
    const totalHours = totalMinutes / 60;

    // Labour: per station, sum staff wages × station duration hours
    let labourCost = 0;
    stationNodes.forEach((node) => {
      const durHours = get().getNodeDuration(node) / 60;
      node.assignedStaff.forEach((s) => { labourCost += s.wagePerHour * durHours; });
    });

    // Materials: sum qty × unitCost across all stations
    let materialCost = 0;
    stationNodes.forEach((node) => {
      node.assignedMaterials.forEach((m) => { materialCost += m.qty * m.unitCost; });
    });

    // Machines: per station, sum tool costPerHour × station duration hours
    let machineCost = 0;
    stationNodes.forEach((node) => {
      const durHours = get().getNodeDuration(node) / 60;
      node.assignedTools.forEach((t) => { machineCost += t.costPerHour * durHours; });
    });

    // Vaste Kostes: monthly_cost / units_per_month → allocated per unit
    const vasteKosCost = vasteKosItems.reduce(
      (sum, v) => sum + (v.unitsPerMonth > 0 ? v.monthlyCost / v.unitsPerMonth : 0),
      0
    );

    // Bedryfskostes: costPerHour × total production hours
    const bedryfskosCell = bedryfskosItems.reduce((sum, b) => sum + b.costPerHour * totalHours, 0);

    const totalPerUnit = labourCost + materialCost + machineCost + vasteKosCost + bedryfskosCell;

    return { totalMinutes, labourCost, materialCost, machineCost, vasteKosCost, bedryfskosCell, totalPerUnit };
  },

  getTotalCost: () => get().getCostBreakdown().totalPerUnit,
}));
