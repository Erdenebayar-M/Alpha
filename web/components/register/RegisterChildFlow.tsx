"use client";

import { useState } from "react";
import { diagnostic } from "@/lib/content";
import ProfileStep from "@/components/register/ProfileStep";
import DiagnosticStep from "@/components/register/DiagnosticStep";
import StepCard from "@/components/register/StepCard";

type Step = "profile" | "diagnostic" | "done";

interface Answers {
  age: number | null;
  gender: string | null;
  grade: string | null;
  diagnosticAnswer: string | null;
}

/** Owns the register-child flow's only state: which step is showing, and the
 *  answers collected so far. No backend yet — finishing/skipping just logs
 *  the answers and shows a placeholder confirmation (see doneMessage's TODO
 *  in lib/content.ts, since Figma has no frame for this state). */
export default function RegisterChildFlow() {
  const [step, setStep] = useState<Step>("profile");
  const [answers, setAnswers] = useState<Answers>({ age: null, gender: null, grade: null, diagnosticAnswer: null });

  function finish(diagnosticAnswer: string | null) {
    console.log("register-child answers", { ...answers, diagnosticAnswer });
    setStep("done");
  }

  return (
    <div className="mx-auto flex w-full max-w-[min(760px,53vw)] flex-col">
      {/* max-w and the lg: padding on each step below are clamp()ed against
          dvh/vw rather than pinned to Figma's literal 760px/60px/40px: those
          numbers only look right at Figma's own 1440x1200 canvas, and this
          screen has to fit whatever real (often shorter, often narrower)
          viewport it's given without scrolling. Each clamp still resolves
          to the exact Figma value once the viewport is as tall/wide as the
          design, so nothing is invented — just given room to shrink. Why
          each card caps its own height instead of the section scrolling:
          see StepCard. */}
      {step === "profile" ? (
        <StepCard
          key="profile"
          animationClassName="animate-rise-in"
          className="border border-border-card px-6 py-6 shadow-card sm:px-10 sm:py-8 lg:pt-[clamp(32px,6dvh,60px)] lg:pb-[clamp(24px,4dvh,40px)]"
        >
          <ProfileStep
            age={answers.age}
            gender={answers.gender}
            grade={answers.grade}
            onChangeAge={(age) => setAnswers((prev) => ({ ...prev, age }))}
            onChangeGender={(gender) => setAnswers((prev) => ({ ...prev, gender }))}
            onChangeGrade={(grade) => setAnswers((prev) => ({ ...prev, grade }))}
            onContinue={() => setStep("diagnostic")}
          />
        </StepCard>
      ) : step === "diagnostic" ? (
        <StepCard
          key="diagnostic"
          animationClassName="animate-step-in"
          className="flex flex-col justify-center p-6 sm:p-8 lg:p-[clamp(24px,5dvh,48px)]"
          style={{ boxShadow: "var(--shadow-question-card)" }}
        >
          <DiagnosticStep
            answer={answers.diagnosticAnswer}
            onChangeAnswer={(diagnosticAnswer) => setAnswers((prev) => ({ ...prev, diagnosticAnswer }))}
            onNext={() => finish(answers.diagnosticAnswer)}
            onSkip={() => finish(null)}
          />
        </StepCard>
      ) : (
        <StepCard
          key="done"
          animationClassName="animate-step-in"
          className="flex flex-col items-center justify-center gap-2 p-12 text-center"
          style={{ boxShadow: "var(--shadow-question-card)" }}
        >
          <p className="text-xl font-extrabold text-text-label">{diagnostic.doneMessage}</p>
        </StepCard>
      )}
    </div>
  );
}
