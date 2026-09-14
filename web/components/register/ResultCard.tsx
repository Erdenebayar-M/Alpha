import StepCard from "@/components/register/StepCard";
import { diagnostic } from "@/lib/content";
import { confidenceLabel, levelLabel, skillLabel, SKILL_ORDER } from "@/lib/skills";
import type { DiagnosticResult } from "@/lib/api/types";

interface ResultCardProps {
  result: DiagnosticResult;
}

/**
 * The real result screen — replaces RegisterChildFlow's static "done" card.
 * Shows the whole DiagnosticResult payload the backend computes, not just
 * the four fields mobile's diagnostic.tsx renders (general_level,
 * priority_skills, recommended_daily_minutes): every skill gets its own
 * level, score and confidence, plus the level's own confidence and whether
 * the bank had headroom above what this child reached (capped_by_bank).
 *
 * No Figma node exists for this screen (lib/content.ts already flags
 * doneTitle/doneMessage/fallbackMessage the same way) — built from the
 * existing task-* design tokens rather than inventing new ones; flagged for
 * design review in the PR description.
 */
export default function ResultCard({ result }: ResultCardProps) {
  return (
    <StepCard
      animationClassName="animate-step-in"
      className="mx-auto flex w-full max-w-[640px] flex-col gap-6 rounded-card p-8 sm:p-10"
      style={{ boxShadow: "var(--shadow-task-card)" }}
    >
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="text-2xl font-black text-task-strong">{diagnostic.doneTitle}</p>
        <p className="text-base font-bold text-task-muted">{diagnostic.doneMessage}</p>
      </header>

      <div className="flex flex-col items-center gap-1 rounded-panel border border-task-border bg-task-tile px-6 py-5 text-center">
        <p className="text-3xl font-black text-task-accent">{levelLabel(result.general_level)}</p>
        <p className="text-sm font-bold text-task-muted">
          {diagnostic.result.levelConfidence(confidenceLabel(result.level_confidence))}
        </p>
        {result.capped_by_bank ? (
          <p className="mt-1 text-xs text-task-muted">{diagnostic.result.cappedByBank}</p>
        ) : null}
      </div>

      <ul className="flex list-none flex-col gap-2 p-0">
        {SKILL_ORDER.map((skill) => {
          const level = result.skill_levels[skill] ?? "—";
          const score = result.skill_scores[skill];
          const confidence = result.skill_confidence[skill];
          return (
            <li key={skill} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm font-bold text-task-strong">{skillLabel(skill)}</span>
              <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-white">
                <span
                  className="block h-full rounded-pill bg-task-accent"
                  style={{ width: `${Math.round((score ?? 0) * 100)}%` }}
                />
              </span>
              <span className="w-14 shrink-0 text-right text-xs font-black text-task-accent">{level}</span>
              {confidence ? (
                <span className="w-12 shrink-0 text-right text-[11px] text-task-muted">
                  {confidenceLabel(confidence)}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {result.top_error_codes.length > 0 ? (
        <p className="text-center text-sm text-task-muted">
          {diagnostic.result.topErrors(result.top_error_codes.join(", "))}
        </p>
      ) : null}

      <p className="text-center text-sm font-bold text-task-strong">
        {diagnostic.result.dailyMinutes(result.recommended_daily_minutes)}
      </p>
    </StepCard>
  );
}
