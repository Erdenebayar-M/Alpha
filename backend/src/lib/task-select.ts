/**
 * The Task columns the client needs to render one exercise item. Shared by
 * every route that serves tasks to a learner (diagnostic, lesson, checkpoint)
 * so the served shape stays identical across all three.
 *
 * `as const` is load-bearing: it lets Prisma narrow the `select` return type to
 * exactly these fields at each call site.
 */
export const TASK_SELECT = {
  id: true,
  task_type: true,
  prompt_text: true,
  options: true,
  audio_url: true,
  image_url: true,
  primary_skill: true,
  estimated_time_seconds: true,
} as const;
