import { z } from 'zod';

export const lessonAttemptSchema = z.object({
  lesson_id: z.string().min(1),
  task_id: z.string().min(1),
  input_text: z.string().min(1),
  time_seconds: z.number().int().min(0),
});

export const lessonTodaySchema = z.object({
  learner_id: z.string().min(1),
});
