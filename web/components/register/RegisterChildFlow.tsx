"use client";

import { useRef, useState } from "react";
import { diagnostic } from "@/lib/content";
import StepCard from "@/components/register/StepCard";
import GenderStep from "@/components/register/steps/GenderStep";
import NameStep from "@/components/register/steps/NameStep";
import GradeStep from "@/components/register/steps/GradeStep";
import ResultCard from "@/components/register/ResultCard";
import LiveExerciseEngine from "@/components/register/exercise/live/LiveExerciseEngine";
import { startDiagnostic, submitDiagnostic } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/types";
import type { ApiDiagnosticTask, DiagnosticResult } from "@/lib/api/types";

type Phase = "gender" | "name" | "grade" | "diagnostic" | "result";

interface Answers {
  gender: string | null;
  surname: string;
  givenName: string;
  grade: string | null;
}

const EMPTY: Answers = { gender: null, surname: "", givenName: "", grade: null };

/** registerChild.grades' ids -> the backend's 1..4 grade column. "preschool"
 *  has no dedicated backend grade, so it maps to 1 per the user's call. */
const GRADE_TO_BACKEND: Record<string, number> = {
  preschool: 1,
  grade2: 2,
  grade3: 3,
  grade4: 4,
};

type DiagnosticState =
  | { kind: "starting" }
  | { kind: "error"; message: string }
  | { kind: "running"; sessionId: string; task: ApiDiagnosticTask; itemNumber: number }
  | { kind: "submitting"; sessionId: string; task: ApiDiagnosticTask; itemNumber: number };

/**
 * Owns the whole register-child flow: which of the setup screens is showing,
 * everything collected so far, and — once diagnostic starts — the live
 * session against the real backend (see lib/api/client.ts, and the proxy
 * routes under app/api/diagnostic/* that hold the dev auth token and strip
 * every task's correct_answer before it reaches this component).
 *
 * The diagnostic's length is adaptive (backend/src/lib/engines/
 * diagnostic-adaptive.ts) — there is no fixed task list to index into, so
 * this drives off the session returned by /start and each answer's response
 * from /submit, the same inline-next-task loop mobile's diagnostic.tsx uses.
 */
export default function RegisterChildFlow() {
  const [phase, setPhase] = useState<Phase>("gender");
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [diagState, setDiagState] = useState<DiagnosticState>({ kind: "starting" });
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  // 0 until beginDiagnostic/handleAnswer set a real timestamp — never read
  // before then, since diagState only reaches "running" after that happens.
  // Initialized to a literal (not Date.now()) because React requires render
  // to stay pure; an impure initializer here would violate that rule.
  const taskStartedAt = useRef<number>(0);
  const startedRef = useRef(false);

  async function beginDiagnostic() {
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase("diagnostic");
    setDiagState({ kind: "starting" });

    const name = `${answers.surname} ${answers.givenName}`.trim() || "Хүүхэд";
    const grade = GRADE_TO_BACKEND[answers.grade ?? "preschool"];

    try {
      const started = await startDiagnostic(name, grade);
      taskStartedAt.current = Date.now();
      setDiagState({ kind: "running", sessionId: started.session_id, task: started.task, itemNumber: started.item_number });
    } catch (err) {
      setDiagState({ kind: "error", message: err instanceof ApiClientError ? err.message : "Холболтын алдаа гарлаа." });
    }
  }

  async function handleAnswer(inputText: string) {
    if (diagState.kind !== "running") return;
    const { sessionId, task } = diagState;
    const timeSeconds = Math.max(0, Math.round((Date.now() - taskStartedAt.current) / 1000));
    setDiagState({ kind: "submitting", sessionId, task, itemNumber: diagState.itemNumber });

    try {
      // A blank answer (an unrenderable task skipped without input) would
      // fail the backend's `input_text.min(1)` — mirrors mobile's diagnostic.tsx.
      const answer = inputText.length > 0 ? inputText : "✗";
      const submitted = await submitDiagnostic(sessionId, task.id, answer, timeSeconds);

      if (submitted.completed) {
        setResult(submitted.result);
        setPhase("result");
        return;
      }

      taskStartedAt.current = Date.now();
      setDiagState({
        kind: "running",
        sessionId,
        task: submitted.next_task,
        itemNumber: submitted.item_number,
      });
    } catch (err) {
      setDiagState({
        kind: "error",
        message: err instanceof ApiClientError ? err.message : "Хариултаа илгээхэд алдаа гарлаа.",
      });
    }
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
      ) : phase === "name" && answers.gender !== null ? (
        <NameStep
          key="name"
          gender={answers.gender as "boy" | "girl"}
          surname={answers.surname}
          givenName={answers.givenName}
          onChangeSurname={(surname) => setAnswers((previous) => ({ ...previous, surname }))}
          onChangeGivenName={(givenName) => setAnswers((previous) => ({ ...previous, givenName }))}
          onContinue={() => setPhase("grade")}
        />
      ) : phase === "grade" && answers.gender !== null ? (
        <GradeStep
          key="grade"
          gender={answers.gender as "boy" | "girl"}
          grade={answers.grade}
          onChange={(grade) => setAnswers((previous) => ({ ...previous, grade }))}
          onContinue={beginDiagnostic}
        />
      ) : phase === "diagnostic" ? (
        diagState.kind === "starting" ? (
          <StepCard
            animationClassName="animate-step-in"
            className="mx-auto flex w-full max-w-[620px] flex-col items-center justify-center gap-4 rounded-card p-12 text-center"
            style={{ boxShadow: "var(--shadow-setup-card)" }}
          >
            <p className="text-lg font-bold text-task-muted">Онош бэлдэж байна…</p>
          </StepCard>
        ) : diagState.kind === "error" ? (
          <StepCard
            animationClassName="animate-step-in"
            className="mx-auto flex w-full max-w-[620px] flex-col items-center justify-center gap-4 rounded-card p-12 text-center"
            style={{ boxShadow: "var(--shadow-setup-card)" }}
          >
            <p className="text-lg font-bold text-task-strong">{diagState.message}</p>
          </StepCard>
        ) : (
          <LiveExerciseEngine
            key={diagState.task.id}
            task={diagState.task}
            position={diagState.itemNumber}
            onResult={handleAnswer}
            onUnrenderable={() => handleAnswer("")}
          />
        )
      ) : phase === "result" && result !== null ? (
        <ResultCard result={result} />
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
