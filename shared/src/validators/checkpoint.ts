import { z } from 'zod';

export const checkpointSubmitSchema = z.object({
  checkpoint_id: z.string().min(1),
  answers: z
    .array(
      z.object({
        task_id: z.string().min(1),
        input_text: z.string().min(1),
        time_seconds: z.number().int().min(0),
      }),
    )
    .min(1),
});
