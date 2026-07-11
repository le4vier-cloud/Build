import { create } from "zustand";

export interface OverlayWorkflow {
  id:        string;
  name:      string;
  durationH: number;
  color:     string;
}

export interface OverlayPlan {
  id:        string;
  name:      string;
  workflows: OverlayWorkflow[];
}

interface PlanOverlayStore {
  plans:      OverlayPlan[];
  addPlan:    (plan: Omit<OverlayPlan, "id">) => void;
  updatePlan: (id: string, updates: Partial<Omit<OverlayPlan, "id">>) => void;
  removePlan: (id: string) => void;
  setPlans:   (plans: OverlayPlan[]) => void;
}

export const usePlanOverlayStore = create<PlanOverlayStore>((set) => ({
  plans: [],

  addPlan: (plan) =>
    set((s) => ({ plans: [...s.plans, { ...plan, id: `plan-${Date.now()}` }] })),

  updatePlan: (id, updates) =>
    set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, ...updates } : p)) })),

  removePlan: (id) =>
    set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),

  setPlans: (plans) => set({ plans }),
}));
