"use client";

import { useEffect, useState } from "react";
import { diagnostic } from "@/lib/content";
import type { LiveVisualMemoryProps } from "@/lib/api/adapt";
import type { LiveExerciseProps } from "@/components/register/exercise/live/types";
import SentencePanel from "@/components/register/exercise/SentencePanel";
import WritingCard from "@/components/register/exercise/live/WritingCard";
import { useTextEntry } from "@/components/register/exercise/live/useTextEntry";

/**
 * TT_7_2 — show the text for `displaySeconds`, hide it, then write it from
 * memory.
 *
 * The seconds are counted down on screen rather than expiring silently: a word
 * that vanishes with no warning reads as a glitch, and the child needs to know
 * how long they still have to look. The countdown is plain state ticking once
 * a second, not an animation, so it needs no reduced-motion fallback.
 */
export default function VisualMemory({ task, position, onResult }: LiveExerciseProps<LiveVisualMemoryProps>) {
  const [secondsLeft, setSecondsLeft] = useState(task.displaySeconds);
  const entry = useTextEntry();

  // LiveExerciseEngine mounts a fresh component per task (key={task.id}), so
  // this only ever has to run the one countdown from its initial state.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((remaining) => (remaining <= 1 ? 0 : remaining - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const visible = secondsLeft > 0;

  return (
    <WritingCard
      position={position}
      prompt={task.prompt}
      context={
        visible ? (
          <SentencePanel className="flex flex-col items-center gap-3">
            <p className="text-center text-[clamp(24px,5.5vw,40px)] font-black text-task-strong">
              {task.textToMemorize}
            </p>
            <p
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-pill bg-task-badge text-sm font-black text-task-accent"
            >
              {diagnostic.live.memoryCountdown(secondsLeft)}
            </p>
          </SentencePanel>
        ) : (
          <p className="text-center text-base font-bold text-task-muted">{diagnostic.live.memoryPrompt}</p>
        )
      }
      entry={entry}
      placeholder={diagnostic.live.memoryPlaceholder}
      onNext={onResult}
    />
  );
}
