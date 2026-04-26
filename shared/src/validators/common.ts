import { z } from 'zod';

export const learnerIdQuerySchema = z.object({
  learner_id: z.string().uuid({ message: 'learner_id must be a valid UUID' }),
});

export type LearnerIdQuery = z.infer<typeof learnerIdQuerySchema>;
