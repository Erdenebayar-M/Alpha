import { passwordWeakness, resemblesParent, type PasswordWeakness } from "@app/shared";

// Demo Parent accounts for the dev server, created already email-confirmed so
// the product owner can sign in without receiving mail. Learner ids are fixed
// UUIDs (learner routes reject anything else), so a re-run finds the same rows.
// The password isn't here: it comes from DEMO_ACCOUNT_PASSWORD, so this public
// repo never holds a working sign-in for the dev server.

export interface DemoLearner {
  id: string;
  name: string;
  grade: number;
  daily_minutes: number;
}

export interface DemoParent {
  email: string;
  name: string;
  surname: string;
  learners: DemoLearner[];
}

export const DEMO_PARENTS: DemoParent[] = [
  {
    email: "demo.parent1@example.com",
    name: "Номин",
    surname: "Туршилт",
    learners: [{ id: "6f1c0a52-3d1e-4c7a-9b0e-000000000101", name: "Тэмүүлэн", grade: 1, daily_minutes: 10 }],
  },
  {
    email: "demo.parent2@example.com",
    name: "Ганбат",
    surname: "Туршилт",
    learners: [
      { id: "6f1c0a52-3d1e-4c7a-9b0e-000000000201", name: "Сарнай", grade: 2, daily_minutes: 10 },
      { id: "6f1c0a52-3d1e-4c7a-9b0e-000000000202", name: "Билгүүн", grade: 4, daily_minutes: 15 },
    ],
  },
  {
    email: "demo.parent3@example.com",
    name: "Оюун",
    surname: "Туршилт",
    learners: [{ id: "6f1c0a52-3d1e-4c7a-9b0e-000000000301", name: "Анударь", grade: 3, daily_minutes: 10 }],
  },
];

/** The Sign up rule `password` would break for any demo Parent account, or
 *  null: the demo password is held to the same bar as a real parent's. */
export function demoPasswordProblem(password: string): PasswordWeakness | null {
  const weakness = passwordWeakness(password);
  if (weakness) return weakness;
  return DEMO_PARENTS.some((parent) => resemblesParent(password, parent)) ? "PASSWORD_SIMILAR" : null;
}
