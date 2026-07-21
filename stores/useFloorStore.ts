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

/* Ids match StaffMember records in app/(dashboard)/staff/page.tsx (MOCK_STAFF,
   ids "4"-"7") so a completed TaskLog's workerId can be cross-referenced
   directly against a real staff record for the Staff page's task-history
   analytics — these are the same people, not a second disconnected roster. */
const MOCK_OPERATORS: Operator[] = [
  { id: "4", name: "Thabo Nkosi",     role: "Machine Operator", color: "#F56300" },
  { id: "5", name: "Sarah van Wyk",   role: "Assembly",         color: "#2563EB" },
  { id: "6", name: "Sipho Dlamini",   role: "Machine Operator", color: "#059669" },
  { id: "7", name: "Amanda Botha",    role: "QC & Finishing",   color: "#7C3AED" },
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
