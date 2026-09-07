import { useState } from "react";
import type { DiagnosticTask } from "@/lib/diagnostic-tasks";
import { cn } from "@/lib/cn";
import TaskCard from "@/components/register/TaskCard";
import TaskIllustration from "@/components/register/exercise/TaskIllustration";
import type { ExerciseProps } from "@/components/register/exercise/types";

type MatchTask = Extract<DiagnosticTask, { form: "match_pairs" }>;

/** The connector between a linked image and word, node 1255:17253. */
function Connector({ linked }: { linked: boolean }) {
  if (!linked) {
    return <span aria-hidden="true" className="h-4 w-8 shrink-0 rounded-[2px] border-2 border-dashed border-task-border" />;
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 32 16" className="h-4 w-8 shrink-0 text-task-accent" fill="none">
      <path d="M0 8h29M23 2l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Exercise 7 — "Тохирох үгийг холбоорой" (node 1255:17242).
 *
 * Linking is click-then-click rather than drawing a line: pick a picture, pick
 * a word, and the row joins up. That works with a keyboard and a screen reader
 * unchanged, which a dragged connector line would not, and it is the same
 * pairing model mobile's match renderer uses.
 *
 * The right column re-orders as links are made, so the chosen word moves up
 * beside its picture. Figma draws three fixed rows of image → arrow → word,
 * and keeping the words pinned to their original rows would have made a
 * cross-row pairing indistinguishable from a matched one — every arrow would
 * light while pointing at a word the learner never chose. Moving the word is
 * what makes the arrow tell the truth while keeping the design's layout.
 */
export default function MatchPairs({ task, position, total, onResult }: ExerciseProps<MatchTask>) {
  const [links, setLinks] = useState<Readonly<Record<string, string>>>({});
  const [pickedImage, setPickedImage] = useState<string | null>(null);

  const linkedWords = new Set(Object.values(links));
  const spare = task.pairs.map((pair) => pair.word).filter((word) => !linkedWords.has(word));

  // Row i shows the word linked to row i's picture, or the next word still
  // unclaimed. Built by reduce rather than a mutating cursor — the same
  // react-hooks/immutability rule that shapes FillLetterTiles.
  const column = task.pairs.reduce<{ taken: number; words: string[] }>(
    (accumulator, pair) => {
      const linked = links[pair.id];
      return linked === undefined
        ? { taken: accumulator.taken + 1, words: [...accumulator.words, spare[accumulator.taken]] }
        : { taken: accumulator.taken, words: [...accumulator.words, linked] };
    },
    { taken: 0, words: [] }
  ).words;

  function chooseWord(word: string) {
    setLinks((previous) => {
      const holder = Object.keys(previous).find((imageId) => previous[imageId] === word);
      // Tapping a word that is already spoken for releases it.
      if (holder !== undefined) {
        const next = { ...previous };
        delete next[holder];
        return next;
      }
      if (pickedImage === null) return previous;
      return { ...previous, [pickedImage]: word };
    });
    setPickedImage(null);
  }

  const isComplete = Object.keys(links).length === task.pairs.length;

  return (
    <TaskCard
      position={position}
      total={total}
      prompt={task.prompt}
      canContinue={isComplete}
      onNext={() => onResult(task.pairs.map((pair) => `${pair.id}:${links[pair.id] ?? ""}`).join(", "))}
      className="gap-[clamp(24px,6dvh,60px)]"
    >
      <ul className="flex w-full list-none flex-col gap-4 p-0">
        {task.pairs.map((pair, row) => {
          const word = column[row];
          const picked = pickedImage === pair.id;
          const imageLinked = pair.id in links;

          return (
            <li key={pair.id} className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => setPickedImage(picked ? null : pair.id)}
                aria-pressed={picked}
                aria-label={pair.image.alt}
                className={cn(
                  "flex h-[clamp(76px,15dvh,110px)] min-w-0 flex-1 items-center justify-center rounded-panel bg-white drop-shadow-piece transition-[border-color,transform] duration-150 ease-press focus-ring",
                  picked || imageLinked ? "border-2 border-task-accent" : "border border-task-border hover:-translate-y-px"
                )}
              >
                <TaskIllustration
                  image={pair.image}
                  className="h-[clamp(64px,13dvh,98px)] w-[clamp(60px,12dvh,91px)] rounded-xl"
                  sizes="91px"
                />
              </button>

              <Connector linked={imageLinked} />

              <button
                type="button"
                onClick={() => chooseWord(word)}
                disabled={pickedImage === null && !imageLinked}
                aria-pressed={imageLinked}
                className={cn(
                  "flex h-[clamp(76px,15dvh,110px)] min-w-0 flex-1 items-center justify-center rounded-panel text-[clamp(18px,4vw,24px)] font-bold drop-shadow-piece transition-[border-color,transform] duration-150 ease-press focus-ring disabled:cursor-not-allowed",
                  imageLinked
                    ? "border-2 border-task-accent bg-task-badge text-task-accent"
                    : "border border-task-border bg-white text-task-strong enabled:hover:-translate-y-px"
                )}
              >
                {word}
              </button>
            </li>
          );
        })}
      </ul>

      <p aria-live="polite" className="sr-only">
        {pickedImage === null
          ? `${Object.keys(links).length} / ${task.pairs.length} холбогдсон.`
          : "Зураг сонгогдлоо. Тохирох үгийг сонгоно уу."}
      </p>
    </TaskCard>
  );
}
