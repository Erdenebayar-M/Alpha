import { z } from 'zod';

export const createLearnerSchema = z.object({
  name: z.string().min(1),
  grade: z.number().int().min(1).max(4),
  daily_minutes: z.number().int().optional().default(10),
});

export type CreateLearnerInput = z.infer<typeof createLearnerSchema>;
