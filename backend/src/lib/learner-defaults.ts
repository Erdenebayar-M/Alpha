import { Variant } from '../../generated/prisma';

// What a newly registered Learner starts with. Shared by POST /api/learner and
// the dev-fixtures script, so a demo Learner is indistinguishable from one a
// parent registered.

/** A = Grades 1–2 (gamified), B = Grades 3–4 (structured). */
export function variantForGrade(grade: number): Variant {
  return grade <= 2 ? Variant.A : Variant.B;
}

/** The LearnerSkillState row created alongside a new Learner (learner_id aside). */
export function initialSkillState(daily_minutes: number) {
  return {
    top_error_codes: [],
    weak_skills: [],
    recent_error_codes: [],
    recent_task_ids: [],
    preferred_session_length: daily_minutes,
  };
}
