"use client";

import { useMemo } from "react";
import type { ComponentType } from "react";
import { diagnostic } from "@/lib/content";
import type { ApiDiagnosticTask } from "@/lib/api/types";
import { adaptTask } from "@/lib/api/adapt";
import type { ExerciseProps } from "@/components/register/exercise/types";
import type { DiagnosticTask } from "@/lib/diagnostic-tasks";
import RendererBoundary from "@/components/register/exercise/RendererBoundary";
import { registry as fixtureRegistry } from "@/components/register/exercise/registry";
import TaskCard from "@/components/register/TaskCard";
import ChoiceGeneric from "@/components/register/exercise/live/ChoiceGeneric";
import FillGeneric from "@/components/register/exercise/live/FillGeneric";
import SentenceFill from "@/components/register/exercise/live/SentenceFill";
import Correction from "@/components/register/exercise/live/Correction";
import Dictation from "@/components/register/exercise/live/Dictation";
import SelfCheck from "@/components/register/exercise/live/SelfCheck";
import MatchPairsText from "@/components/register/exercise/live/MatchPairsText";
import AssembleWordAudio from "@/components/register/exercise/live/AssembleWordAudio";
import CopyText from "@/components/register/exercise/live/CopyText";
import VisualMemory from "@/components/register/exercise/live/VisualMemory";
import TapFindError from "@/components/register/exercise/live/TapFindError";
import type { LiveOnlyProps } from "@/lib/api/adapt";
import type { LiveExerciseProps } from "@/components/register/exercise/live/types";

const liveRegistry: { [K in LiveOnlyProps["kind"]]: ComponentType<LiveExerciseProps<Extract<LiveOnlyProps, { kind: K }>>> } = {
  choice_generic: ChoiceGeneric,
  fill_generic: FillGeneric,
  sentence_fill: SentenceFill,
  correction: Correction,
  dictation: Dictation,
  mini_text: Dictation,
  self_check: SelfCheck,
  match_pairs_text: MatchPairsText,
  assemble_word_audio: AssembleWordAudio,
  copy_text: CopyText,
  visual_memory: VisualMemory,
  tap_find_error: TapFindError,
};

interface LiveExerciseEngineProps {
  task: ApiDiagnosticTask;
  position: number;
  /** Reports the answer already formatted for the wire — see lib/api/adapt.ts's `toInputText`. */
  onResult: (inputText: string) => void;
  /** Called instead of onResult when the task can't be rendered at all
   *  (unmapped task_type or missing required media) — the caller advances
   *  the diagnostic with a synthetic wrong answer, mirroring the fixture's
   *  Fallback -> onResult("") skip. */
  onUnrenderable: () => void;
}

/**
 * The live counterpart of components/register/exercise/ExerciseEngine.tsx:
 * adapts a real backend task (lib/api/adapt.ts) and dispatches to either a
 * reused Figma renderer (via the exact same fixture registry, since those
 * adapted task shapes are drop-in DiagnosticTask members) or a new live-only
 * renderer, then serializes whatever the renderer reports back into the
 * exact input_text format backend/src/lib/error-engine/attempt-processor.ts
 * expects for that task_type.
 */
export default function LiveExerciseEngine({ task, position, onResult, onUnrenderable }: LiveExerciseEngineProps) {
  // Adapting is not pure: the tile-bank adapters shuffle (lib/api/adapt.ts's
  // `shuffled`). Called in the render body it re-shuffled on every re-render
  // of this flow — including the one when answering flips the flow from
  // running to submitting — which reordered the bank under a half-finished
  // answer while useLetterFill still held tile *indexes*. One adaptation per
  // task, then.
  const adapted = useMemo(() => adaptTask(task), [task]);

  const fallback = (
    <TaskCard
      position={position}
      prompt={task.prompt_text}
      canContinue
      onNext={onUnrenderable}
      className="gap-8"
    >
      <p className="w-full text-center text-base font-bold text-task-muted">{diagnostic.fallbackMessage}</p>
    </TaskCard>
  );

  if (!adapted) return fallback;

  if (adapted.reused) {
    const Renderer = fixtureRegistry[adapted.kind] as ComponentType<ExerciseProps<DiagnosticTask>>;
    return (
      <RendererBoundary key={task.id} fallback={fallback}>
        <Renderer
          task={adapted.view}
          position={position}
          onResult={(raw: string) => onResult(adapted.toInputText(raw))}
        />
      </RendererBoundary>
    );
  }

  const Renderer = liveRegistry[adapted.kind] as ComponentType<LiveExerciseProps<typeof adapted.props>>;
  return (
    <RendererBoundary key={task.id} fallback={fallback}>
      <Renderer task={adapted.props} position={position} onResult={(raw) => onResult(adapted.toInputText(raw))} />
    </RendererBoundary>
  );
}
