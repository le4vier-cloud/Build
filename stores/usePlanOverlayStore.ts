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
}

const DEMO_PLANS: OverlayPlan[] = [
  {
    id: "demo-plan-1",
    name: "Steel Frame Assembly",
    workflows: [
      { id: "wf-cut",  name: "Cutting",  durationH: 2,   color: "#D97706" },
      { id: "wf-weld", name: "Welding",  durationH: 4,   color: "#3B82F6" },
      { id: "wf-coat", name: "Coating",  durationH: 1.5, color: "#6366F1" },
      { id: "wf-qc",   name: "QC Check", durationH: 0.5, color: "#34D399" },
    ],
  },
  {
    id: "demo-plan-2",
    name: "Drive Unit Build",
    workflows: [
      { id: "wf-mount", name: "Mounting", durationH: 3, color: "#F59E0B" },
      { id: "wf-wire",  name: "Wiring",   durationH: 2, color: "#60A5FA" },
      { id: "wf-test",  name: "Testing",  durationH: 1, color: "#A78BFA" },
    ],
  },
];

export const usePlanOverlayStore = create<PlanOverlayStore>((set) => ({
  plans: DEMO_PLANS,

  addPlan: (plan) =>
    set((s) => ({ plans: [...s.plans, { ...plan, id: `plan-${Date.now()}` }] })),

  updatePlan: (id, updates) =>
    set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, ...updates } : p)) })),

  removePlan: (id) =>
    set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
}));
