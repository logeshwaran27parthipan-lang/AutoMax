import { create } from "zustand";
import axios from "axios";
import type { Workflow } from "../types/index";

type WorkflowsState = {
  workflows: Workflow[];
  fetchWorkflows: () => Promise<void>;
};

export const useWorkflows = create<WorkflowsState>((set) => ({
  workflows: [],
  fetchWorkflows: async () => {
    try {
      const res = await axios.get<Workflow[]>("/api/workflows");
      set({ workflows: res.data });
    } catch (err) {
      console.error(err);
    }
  },
}));

export default useWorkflows;