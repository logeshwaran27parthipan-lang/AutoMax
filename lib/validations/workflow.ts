import { z } from "zod";

export const WorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggers: z.array(z.any()).optional(),
  steps: z.array(z.any()).optional(),
});
