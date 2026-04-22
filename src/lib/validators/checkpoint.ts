import { z } from 'zod';

export const checkpointTodaySchema = z.object({
  learner_id: z.string().min(1),
});

export const checkpointAttemptSchema = z.object({
  checkpoint_id: z.string().min(1),
  task_id: z.string().min(1),
  input_text: z.string().min(1),
  time_seconds: z.number().int().min(0),
});
