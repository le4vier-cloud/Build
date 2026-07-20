import { create } from "zustand";

export interface Operator {
  id: string;
  name: string;
  role: string;
  color: string;
}

export interface TaskLog {
  id: string;
  taskId: string;
  workerId: string;
  startedAt: number;
  completedAt: number;
}

interface FloorStore {
  operators: Operator[];
  activeWorkerId: string | null;
  activeTaskId: string | null;
  activeTaskStartedAt: number | null;
  logs: TaskLog[];

  clockIn: (workerId: string) => void;
  clockOut: () => void;
  startTask: (taskId: string) => void;
  cancelTask: () => void;
  completeTask: () => void;
}

const MOCK_OPERATORS: Operator[] = [
  { id: "op1", name: "Thabo Nkosi",     role: "Machine Operator", color: "#F56300" },
  { id: "op2", name: "Sarah van Wyk",   role: "Assembly",         color: "#2563EB" },
  { id: "op3", name: "Sipho Dlamini",   role: "Machine Operator", color: "#059669" },
  { id: "op4", name: "Amanda Botha",    role: "QC & Finishing",   color: "#7C3AED" },
];

export const useFloorStore = create<FloorStore>((set, get) => ({
  operators: MOCK_OPERATORS,
  activeWorkerId: null,
  activeTaskId: null,
  activeTaskStartedAt: null,
  logs: [],

  clockIn: (workerId) => set({ activeWorkerId: workerId, activeTaskId: null, activeTaskStartedAt: null }),
  clockOut: () => set({ activeWorkerId: null, activeTaskId: null, activeTaskStartedAt: null }),

  startTask: (taskId) => set({ activeTaskId: taskId, activeTaskStartedAt: Date.now() }),
  cancelTask: () => set({ activeTaskId: null, activeTaskStartedAt: null }),

  completeTask: () => {
    const { activeTaskId, activeTaskStartedAt, activeWorkerId, logs } = get();
    if (!activeTaskId || !activeTaskStartedAt || !activeWorkerId) return;
    const log: TaskLog = {
      id: `log-${Date.now()}`,
      taskId: activeTaskId,
      workerId: activeWorkerId,
      startedAt: activeTaskStartedAt,
      completedAt: Date.now(),
    };
    set({ logs: [...logs, log], activeTaskId: null, activeTaskStartedAt: null });
  },
}));
