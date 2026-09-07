"use client";

import { useState } from "react";
import { diagnostic } from "@/lib/content";
import { diagnosticTasks } from "@/lib/diagnostic-tasks";
import StepCard from "@/components/register/StepCard";
import GenderStep from "@/components/register/steps/GenderStep";
import NameStep from "@/components/register/steps/NameStep";
import GradeStep from "@/components/register/steps/GradeStep";
import ExerciseEngine from "@/components/register/exercise/ExerciseEngine";

type Phase = "gender" | "name" | "grade" | "diagnostic" | "done";

interface Answers {
  gender: string | null;
  surname: string;
  givenName: string;
  grade: string | null;
  /** Keyed by task id, so a response survives being read back out of order. */
  responses: Readonly<Record<string, string>>;
}

const EMPTY: Answers = { gender: null, surname: "", givenName: "", grade: null, responses: {} };

/**
 * Owns the whole register-child flow: which of the twelve screens is showing,
 * and everything collected so far. It is the only client component in the
 * flow — every step and renderer below it is a child of this boundary — and
 * the only place that holds state, which is what web/AGENTS.md asks for on a
 * presentation site ("no state management libraries, context providers, API
 * layers, or custom hooks unless a section genuinely needs one").
 *
 * The diagnostic phase is modelled on mobile's lesson runner
 * (mobile/app/(app)/learner/[id]/lesson.tsx): hold an index into the task list,
 * hand the current task to the engine, advance on its result, finish on the
 * last one. What is deliberately not carried over is the runner's scoring —
 * `onResult` reports only what was answered, never whether it was right.
 *
 * There is no backend yet and no back navigation, matching both the design
 * (which draws neither a back control nor a step indicator beyond the count
 * badge) and the flow this replaces. Reloading starts over.
 */
export default function RegisterChildFlow() {
  const [phase, setPhase] = useState<Phase>("gender");
  const [taskIndex, setTaskIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);

  const task = diagnosticTasks[taskIndex];

  function handleResult(answer: string) {
    const responses = { ...answers.responses, [task.id]: answer };
    setAnswers((previous) => ({ ...previous, responses }));

    if (taskIndex + 1 < diagnosticTasks.length) {
      setTaskIndex(taskIndex + 1);
      return;
    }

    // TODO: no submission endpoint from this page yet — see lib/site-config.ts,
    // whose auth URLs are still placeholders.
    console.log("register-child answers", { ...answers, responses });
    setPhase("done");
  }

  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col">
      {phase === "gender" ? (
        <GenderStep
          key="gender"
          gender={answers.gender}
          onChange={(gender) => setAnswers((previous) => ({ ...previous, gender }))}
          onContinue={() => answers.gender !== null && setPhase("name")}
        />
      ) : phase === "name" ? (
        <NameStep
          key="name"
          surname={answers.surname}
          givenName={answers.givenName}
          onChangeSurname={(surname) => setAnswers((previous) => ({ ...previous, surname }))}
          onChangeGivenName={(givenName) => setAnswers((previous) => ({ ...previous, givenName }))}
          onContinue={() => setPhase("grade")}
        />
      ) : phase === "grade" ? (
        <GradeStep
          key="grade"
          grade={answers.grade}
          onChange={(grade) => setAnswers((previous) => ({ ...previous, grade }))}
          onContinue={() => setPhase("diagnostic")}
        />
      ) : phase === "diagnostic" ? (
        <ExerciseEngine
          key={task.id}
          task={task}
          position={taskIndex + 1}
          total={diagnosticTasks.length}
          onResult={handleResult}
        />
      ) : (
        <StepCard
          key="done"
          animationClassName="animate-step-in"
          className="mx-auto flex w-full max-w-[620px] flex-col items-center justify-center gap-2 rounded-card p-12 text-center"
          style={{ boxShadow: "var(--shadow-setup-card)" }}
        >
          <p className="text-2xl font-black text-task-strong">{diagnostic.doneTitle}</p>
          <p className="text-base font-bold text-task-muted">{diagnostic.doneMessage}</p>
        </StepCard>
      )}
    </div>
  );
}
