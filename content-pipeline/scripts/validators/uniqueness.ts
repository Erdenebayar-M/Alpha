/*
 * Uniqueness validator: groups tasks by (primary_skill, correct_answer,
 * task_type) and returns groups where count > 1 (potential duplicates).
 * No Mongolian character literals used.
 */

interface Task {
  primary_skill: string;
  correct_answer: string;
  task_type: string;
  [key: string]: unknown;
}

/**
 * Returns an array of duplicate groups — each inner array contains 2+ tasks
 * that share the same (primary_skill, correct_answer, task_type) key.
 */
export function findDuplicates(tasks: Task[]): Task[][] {
  const groups = new Map<string, Task[]>();

  for (const task of tasks) {
    const key = `${task.primary_skill}||${task.correct_answer}||${task.task_type}`;
    const group = groups.get(key);
    if (group) {
      group.push(task);
    } else {
      groups.set(key, [task]);
    }
  }

  return [...groups.values()].filter((g) => g.length > 1);
}
