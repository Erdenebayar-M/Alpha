import { z } from 'zod';

export const startDiagnosticSchema = z.object({
  learner_id: z.string().min(1),
});

export const submitDiagnosticSchema = z.object({
  session_id: z.string().min(1),
  task_id: z.string().min(1),
  input_text: z.string().min(1),
  time_seconds: z.number().int().min(0),
});

export const nextPhaseSchema = z.object({
  session_id: z.string().min(1),
});
