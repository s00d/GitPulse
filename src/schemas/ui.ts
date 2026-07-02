import { z } from "zod";

export const uiDemoFormSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().min(5),
});

export type UiDemoForm = z.infer<typeof uiDemoFormSchema>;
