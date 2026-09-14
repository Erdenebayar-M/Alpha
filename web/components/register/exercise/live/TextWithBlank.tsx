import { cn } from "@/lib/cn";

interface TextWithBlankProps {
  /** Backend text whose blank is a run of "_" — `"н_м"`, `"Би ___ авлаа."`. */
  text: string;
  /** What the learner has written so far, mirrored into the blank. */
  value: string;
  /** Word-scale for a single missing letter, sentence-scale for a missing word. */
  scale: "word" | "sentence";
}

const SCALE = {
  word: {
    text: "text-[clamp(28px,7vw,48px)] font-black",
    slot: "min-w-[clamp(32px,6vw,44px)] h-[clamp(40px,8vw,56px)] text-[clamp(20px,4.5vw,32px)]",
  },
  sentence: {
    text: "text-[clamp(18px,4vw,28px)] font-bold",
    slot: "min-w-[clamp(80px,18vw,160px)] h-[clamp(36px,7vw,48px)] text-[clamp(16px,3.5vw,24px)]",
  },
} as const;

/**
 * The fill exercises' text with its gap drawn as a real slot instead of the
 * backend's raw underscores.
 *
 * Node 1251:16251 draws exactly this — printed letters with an outlined box
 * where the missing one goes — for the picture-fill card, whose renderer
 * (renderers/FillLetterTiles.tsx) fills the box from a tile bank. The live
 * fill types have no tile bank to offer (the backend sends the answer and no
 * distractors), so the learner types instead and the slot mirrors what they
 * have written, which keeps the word readable as a word while they answer.
 */
export default function TextWithBlank({ text, value, scale }: TextWithBlankProps) {
  const runStart = text.indexOf("_");
  if (runStart === -1) {
    return <p className={cn("text-center text-task-strong", SCALE[scale].text)}>{text}</p>;
  }

  let runEnd = runStart;
  while (runEnd < text.length && text[runEnd] === "_") runEnd++;
  const before = text.slice(0, runStart);
  const after = text.slice(runEnd);
  const filled = value.trim().length > 0;

  return (
    <p className={cn("flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-task-strong", SCALE[scale].text)}>
      {before ? <span>{before}</span> : null}
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex items-center justify-center rounded-sm border-2 px-2 font-black shadow-slot transition-[background-color,border-color] duration-150 ease-press",
          SCALE[scale].slot,
          filled ? "border-task-accent bg-white text-task-accent" : "border-task-border bg-white text-task-muted"
        )}
      >
        {filled ? value : ""}
      </span>
      {after ? <span>{after}</span> : null}
    </p>
  );
}
