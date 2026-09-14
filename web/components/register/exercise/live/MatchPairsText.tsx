"use client";

import { useState } from "react";
import type { LiveMatchPairsTextProps } from "@/lib/api/adapt";
import type { LiveExerciseProps } from "@/components/register/exercise/live/types";
import { cn } from "@/lib/cn";
import TaskCard from "@/components/register/TaskCard";

/**
 * TT_5_3 — word<->suffix matching, text only (no images). Same click-then-
 * click pairing model as the fixture's MatchPairs.tsx (pick a left item, pick
 * a right item, the row links), simplified since there's no picture column.
 * lib/api/adapt.ts turns the raw "left:right, left:right" this reports back
 * into the {left,right}[] JSON matchPairsDiff expects.
 */
export default function MatchPairsText({ task, position, onResult }: LiveExerciseProps<LiveMatchPairsTextProps>) {
  const [links, setLinks] = useState<Readonly<Record<string, string>>>({});
  const [pickedLeft, setPickedLeft] = useState<string | null>(null);

  const linkedRights = new Set(Object.values(links));
  const isComplete = Object.keys(links).length === task.pairs.length;

  function chooseRight(right: string) {
    setLinks((previous) => {
      const holder = Object.keys(previous).find((left) => previous[left] === right);
      if (holder !== undefined) {
        const next = { ...previous };
        delete next[holder];
        return next;
      }
      if (pickedLeft === null) return previous;
      return { ...previous, [pickedLeft]: right };
    });
    setPickedLeft(null);
  }

  return (
    <TaskCard
      position={position}
      prompt={task.prompt}
      canContinue={isComplete}
      onNext={() =>
        onResult(task.pairs.map((pair) => `${pair.left}:${links[pair.left] ?? ""}`).join(", "))
      }
      className="gap-6"
    >
      <div className="flex w-full gap-6">
        <ul className="flex flex-1 list-none flex-col gap-3 p-0">
          {task.pairs.map((pair) => {
            const picked = pickedLeft === pair.left;
            const linked = pair.left in links;
            return (
              <li key={pair.left}>
                <button
                  type="button"
                  onClick={() => setPickedLeft(picked ? null : pair.left)}
                  aria-pressed={picked}
                  className={cn(
                    "flex h-14 w-full items-center justify-center rounded-panel text-base font-bold shadow-piece transition-[border-color,transform] duration-150 ease-press focus-ring",
                    picked || linked
                      ? "border-2 border-task-accent bg-task-badge text-task-accent"
                      : "border border-task-border bg-white text-task-strong hover:-translate-y-px"
                  )}
                >
                  {pair.left}
                </button>
              </li>
            );
          })}
        </ul>

        <ul className="flex flex-1 list-none flex-col gap-3 p-0">
          {task.pairs.map((pair) => {
            const linked = linkedRights.has(pair.right);
            return (
              <li key={pair.right}>
                <button
                  type="button"
                  onClick={() => chooseRight(pair.right)}
                  disabled={pickedLeft === null && !linked}
                  aria-pressed={linked}
                  className={cn(
                    "flex h-14 w-full items-center justify-center rounded-panel text-base font-bold shadow-piece transition-[border-color,transform] duration-150 ease-press focus-ring disabled:cursor-not-allowed",
                    linked
                      ? "border-2 border-task-accent bg-task-badge text-task-accent"
                      : "border border-task-border bg-white text-task-strong enabled:hover:-translate-y-px"
                  )}
                >
                  {pair.right}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </TaskCard>
  );
}
