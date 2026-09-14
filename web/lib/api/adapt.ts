import { diagnostic } from "@/lib/content";
import type { DiagnosticTask, WordSegment } from "@/lib/diagnostic-tasks";
import type {
  ApiDiagnosticTask,
  ChoiceOptions,
  CopyOptions,
  CorrectionOptions,
  DictationOptions,
  FillOptions,
  MatchPairsOptions,
  MiniTextOptions,
  SelfCheckOptions,
  SentenceFillOptions,
  TapFindErrorOptions,
  VisualMemoryOptions,
} from "@/lib/api/types";
import { resolveLiveRenderer, type LiveRendererKey } from "@/lib/api/task-type-map";

/**
 * Turns one live backend task into exactly what a renderer needs to draw it,
 * plus a `toInputText` closure that turns whatever that renderer's `onResult`
 * hands back into the exact wire format
 * backend/src/lib/error-engine/attempt-processor.ts expects for this
 * task_type. Keeping the two together means the serialization detail lives
 * next to the data that produced it, instead of a second lookup table that
 * could drift from this one.
 *
 * Nine renderer keys reuse the Figma components from
 * components/register/exercise/renderers/* (their `view` is a real
 * `DiagnosticTask` union member from lib/diagnostic-tasks.ts). The rest are
 * `LiveOnlyProps` for the components under
 * components/register/exercise/live/.
 *
 * Every adapter that targets a drawn card degrades to a generic one rather
 * than failing when a particular row doesn't fit it — `null` is reserved for
 * tasks missing their actual answer-bearing fields, which is a content
 * problem, not a layout one. See the note above adaptTask.
 */

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const identity = (raw: string) => raw;

// ── Reused-renderer view models ─────────────────────────────────────────────

interface ReusedAdapted {
  kind:
    | "audio_choice"
    | "image_match"
    | "fill_letter_tiles"
    | "match_pairs"
    | "assemble_word"
    | "punctuation_choice"
    | "sentence_capital"
    | "punctuation_place"
    | "comma_place";
  view: DiagnosticTask;
  toInputText: (raw: string) => string;
}

// Reused renderers' TaskIllustration requires a real image src, so every
// adapter below that needs one returns null when image_url is missing — the
// live dispatcher (LiveExerciseEngine) treats null as "skip this task"
// rather than rendering a broken <img>, mirroring the fixture's
// RendererBoundary/Fallback pattern.

/** `display_text` marks its blank with a run of "_"; render blank_answer.length slots there. */
function buildFillSegments(displayText: string, blankAnswer: string): readonly WordSegment[] {
  const runStart = displayText.indexOf("_");
  if (runStart === -1) {
    return [{ kind: "text", text: displayText }];
  }
  let runEnd = runStart;
  while (runEnd < displayText.length && displayText[runEnd] === "_") runEnd++;
  const before = displayText.slice(0, runStart);
  const after = displayText.slice(runEnd);
  const segments: WordSegment[] = [];
  if (before) segments.push({ kind: "text", text: before });
  for (let i = 0; i < blankAnswer.length; i++) segments.push({ kind: "blank" });
  if (after) segments.push({ kind: "text", text: after });
  return segments;
}

function adaptAudioChoice(task: ApiDiagnosticTask): ReusedAdapted | null {
  const opts = task.options as ChoiceOptions;
  if (!task.audio_url || !opts?.choices?.length) return null;
  return {
    kind: "audio_choice",
    view: {
      id: task.id,
      form: "audio_choice",
      prompt: task.prompt_text,
      audioSrc: task.audio_url,
      choices: opts.choices.map((c) => c.text),
    },
    toInputText: identity,
  };
}

function adaptImageMatch(task: ApiDiagnosticTask): ReusedAdapted | null {
  const opts = task.options as ChoiceOptions;
  if (!task.image_url || !opts?.choices?.length) return null;
  return {
    kind: "image_match",
    view: {
      id: task.id,
      form: "image_match",
      prompt: task.prompt_text,
      image: { src: task.image_url, alt: task.prompt_text },
      choices: opts.choices.map((c) => c.text),
    },
    toInputText: identity,
  };
}

function adaptFillLetterTiles(task: ApiDiagnosticTask): ReusedAdapted | null {
  const opts = task.options as FillOptions;
  if (!task.image_url || !opts?.display_text || !opts.blank_answer) return null;
  return {
    kind: "fill_letter_tiles",
    view: {
      id: task.id,
      form: "fill_letter_tiles",
      prompt: task.prompt_text,
      // No hint: a live task carries one piece of prose, and it is already
      // the card header. The fixture's second line is a drawn detail with no
      // field behind it in the backend's fillOptions.
      image: { src: task.image_url, alt: opts.context_word ?? task.prompt_text },
      segments: buildFillSegments(opts.display_text, opts.blank_answer),
      // The backend supplies only the answer, no distractor letters — the
      // tile bank is the blank's own letters shuffled, so the exercise is
      // "place these in order" rather than "pick the right ones from noise".
      tiles: shuffled(opts.blank_answer.split("")),
    },
    // FillLetterTiles' onResult already reports only the filled blank
    // letters concatenated, which is exactly what FILL_TYPES compares
    // case-insensitively against blank_answer — no reformatting needed.
    toInputText: identity,
  };
}

function adaptMatchPairsImage(task: ApiDiagnosticTask): ReusedAdapted | null {
  const opts = task.options as MatchPairsOptions;
  if (!opts?.pairs?.length || opts.pairs.some((p) => !p.left_image_url && !p.right_image_url)) return null;

  // MatchPairs.tsx reports "id:chosenWord, id:chosenWord, ...". We choose
  // `id` here, so we can invert that string back into the backend's
  // {left,right} pairs without touching the component.
  const leftById = new Map(opts.pairs.map((p, i) => [`pair-${i}`, p.left]));

  return {
    kind: "match_pairs",
    view: {
      id: task.id,
      form: "match_pairs",
      prompt: task.prompt_text,
      pairs: opts.pairs.map((p, i) => ({
        id: `pair-${i}`,
        image: { src: p.left_image_url ?? p.right_image_url ?? "", alt: p.left },
        word: p.right,
      })),
    },
    toInputText: (raw) => JSON.stringify(parseMatchPairsRaw(raw, leftById)),
  };
}

function parseMatchPairsRaw(raw: string, leftById: Map<string, string>): { left: string; right: string }[] {
  if (!raw) return [];
  return raw
    .split(", ")
    .map((entry) => {
      const separator = entry.indexOf(":");
      const id = entry.slice(0, separator);
      const right = entry.slice(separator + 1);
      const left = leftById.get(id);
      return left === undefined ? null : { left, right };
    })
    .filter((pair): pair is { left: string; right: string } => pair !== null);
}

function adaptAssembleWord(task: ApiDiagnosticTask): ReusedAdapted | null {
  const opts = task.options as { tiles: string[]; correct_order: string[] };
  if (!task.image_url || !opts?.tiles?.length || !opts.correct_order?.length) return null;
  return {
    kind: "assemble_word",
    view: {
      id: task.id,
      form: "assemble_word",
      prompt: task.prompt_text,
      // See adaptFillLetterTiles — no second copy of the prompt.
      image: { src: task.image_url, alt: task.prompt_text },
      slotCount: opts.correct_order.length,
      tiles: shuffled(opts.tiles),
    },
    // AssembleWord.tsx reports the assembled letters as one plain string;
    // assembleWordDiff on the backend expects a JSON array of tiles, so wrap
    // it into one character-per-entry array (assembleWordDiff only ever
    // joins the array back into a string to compare, so the split point
    // doesn't need to match the original tile boundaries).
    toInputText: (raw) => JSON.stringify(raw.split("")),
  };
}

// ── The four punctuation/capital cards ──────────────────────────────────────
//
// TT_6_1..TT_6_4 are, one for one, the exercises Figma drew as nodes
// 1255:17752, 1254:16502, 1255:16722 and 1255:16988 — pick the sentence's
// opening word, pick its closing mark, mark where one sentence ends, add the
// missing comma. They were routed to the generic choice list and the text
// editor only because their `options` carry no sentence field: the sentence is
// the task's own `prompt_text` (see the generator's shape prompts in
// content-pipeline/scripts/prompts/shapes/, which write it there with "___"
// marking the blank), and the card's instruction comes from the design rather
// than the data (lib/content.ts's `punctuation` block).

function adaptPunctuationChoice(task: ApiDiagnosticTask): ReusedAdapted | null {
  const opts = task.options as ChoiceOptions;
  if (!opts?.choices?.length) return null;
  // The design draws each option as one 52px glyph in a tall tile. A task
  // whose options turned out to be words rather than marks reads as broken
  // there, and belongs on the generic choice list instead.
  if (opts.choices.some((choice) => choice.text.trim().length > 2)) return null;
  return {
    kind: "punctuation_choice",
    view: {
      id: task.id,
      form: "punctuation_choice",
      prompt: diagnostic.punctuation.choicePrompt,
      sentence: task.prompt_text,
      choices: opts.choices.map((c) => c.text),
    },
    toInputText: identity,
  };
}

function adaptSentenceCapital(task: ApiDiagnosticTask): ReusedAdapted | null {
  const opts = task.options as ChoiceOptions;
  if (!opts?.choices?.length) return null;
  return {
    kind: "sentence_capital",
    view: {
      id: task.id,
      form: "sentence_capital",
      prompt: diagnostic.punctuation.capitalPrompt,
      // The fixture splits its sentence over two drawn lines; a live task is
      // one sentence, so it is one line.
      sentenceLines: [task.prompt_text],
      choices: opts.choices.map((c) => c.text),
    },
    toInputText: identity,
  };
}

function countChar(text: string, char: string): number {
  return text.split(char).length - 1;
}

function capitalized(sentence: string): string {
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function placementWords(opts: CorrectionOptions): string[] {
  return opts?.incorrect_text?.split(/\s+/).filter(Boolean) ?? [];
}

/**
 * TT_6_3 — two sentences run together with nothing between them ("нар гарлаа
 * шувууд жиргэв"); the learner marks where the first one ends.
 *
 * PlaceToken reports which gap the mark went into, but this task_type is
 * graded as free text against `options.correct_text` (attempt-processor.ts's
 * default branch), so the corrected sentence is rebuilt here. checkSentence
 * also scores the opening capital and the closing mark — neither of which this
 * card lets the learner touch — so both are written the way a correct answer
 * would be written, instead of being marked down for something the UI never
 * asked.
 */
function adaptPeriodPlace(task: ApiDiagnosticTask): ReusedAdapted | null {
  const opts = task.options as CorrectionOptions;
  const words = placementWords(opts);
  if (words.length < 2) return null;
  return {
    kind: "punctuation_place",
    view: {
      id: task.id,
      form: "punctuation_place",
      prompt: diagnostic.punctuation.periodPrompt,
      words,
      token: ".",
      instruction: diagnostic.punctuation.periodInstruction,
    },
    toInputText: (raw) => {
      const at = Number(raw);
      if (!Number.isInteger(at) || at < 0 || at >= words.length) return opts.incorrect_text;
      const first = `${capitalized(words.slice(0, at + 1).join(" "))}.`;
      const rest = words.slice(at + 1).join(" ");
      if (!rest) return first;
      return `${first} ${capitalized(/[.!?]$/.test(rest) ? rest : `${rest}.`)}`;
    },
  };
}

/** TT_6_4 — the comma the sentence is missing ("алим жимс гадил"). */
function adaptCommaPlace(task: ApiDiagnosticTask): ReusedAdapted | null {
  const opts = task.options as CorrectionOptions;
  const words = placementWords(opts);
  if (words.length < 2) return null;
  // The card places exactly one mark, so a sentence that needs two commas
  // cannot be answered on it however well the learner understands the rule —
  // those stay on the text editor. `correct_text` is only counted here, never
  // shown.
  if (countChar(opts.correct_text ?? "", ",") - countChar(opts.incorrect_text, ",") !== 1) return null;
  return {
    kind: "comma_place",
    view: {
      id: task.id,
      form: "comma_place",
      prompt: diagnostic.punctuation.commaPrompt,
      words,
      token: ",",
      instruction: diagnostic.punctuation.commaInstruction,
    },
    // Unlike the period card this one changes nothing else: the source
    // sentence already carries its own capital and closing mark.
    toInputText: (raw) => {
      const at = Number(raw);
      if (!Number.isInteger(at) || at < 0 || at >= words.length) return opts.incorrect_text;
      return words.map((word, index) => (index === at ? `${word},` : word)).join(" ");
    },
  };
}

// ── Live-only renderer props ────────────────────────────────────────────────

export interface LiveChoiceProps {
  kind: "choice_generic";
  prompt: string;
  choices: string[];
  imageUrl: string | null;
  audioUrl: string | null;
  /** Set when the prompt was itself a sentence with a blank: it moves into
   *  its own panel and the header carries the instruction instead. */
  sentence: string | null;
}

export interface LiveFillProps {
  kind: "fill_generic";
  prompt: string;
  displayText: string;
  blankLength: number;
  audioUrl: string | null;
}

export interface LiveSentenceFillProps {
  kind: "sentence_fill";
  prompt: string;
  sentenceTemplate: string;
  hint?: string;
  /** TT_7_5 is a cloze *dictation* — the sentence is heard, not just read. */
  audioUrl: string | null;
}

export interface LiveCorrectionProps {
  kind: "correction";
  prompt: string;
  incorrectText: string;
}

export interface LiveDictationProps {
  kind: "dictation" | "mini_text";
  prompt: string;
  audioUrl: string | null;
  /** How much to write, and in what unit: dictationOptions counts words,
   *  miniTextOptions counts sentences (they are different fields — reading
   *  `word_count` off a mini text always yielded "1 үг"). */
  count: number;
  unit: "word" | "sentence";
  multiline: boolean;
}

export interface LiveSelfCheckProps {
  kind: "self_check";
  prompt: string;
  originalAttempt: string;
  modelAnswer: string;
}

export interface LiveMatchPairsTextProps {
  kind: "match_pairs_text";
  prompt: string;
  pairs: { left: string; right: string }[];
}

export interface LiveAssembleAudioProps {
  kind: "assemble_word_audio";
  prompt: string;
  audioUrl: string | null;
  tiles: string[];
  slotCount: number;
}

export interface LiveCopyTextProps {
  kind: "copy_text";
  prompt: string;
  textToCopy: string;
}

export interface LiveVisualMemoryProps {
  kind: "visual_memory";
  prompt: string;
  textToMemorize: string;
  displaySeconds: number;
}

export interface LiveTapFindErrorProps {
  kind: "tap_find_error";
  prompt: string;
  sentence: string;
}

export type LiveOnlyProps =
  | LiveChoiceProps
  | LiveFillProps
  | LiveSentenceFillProps
  | LiveCorrectionProps
  | LiveDictationProps
  | LiveSelfCheckProps
  | LiveMatchPairsTextProps
  | LiveAssembleAudioProps
  | LiveCopyTextProps
  | LiveVisualMemoryProps
  | LiveTapFindErrorProps;

interface LiveAdapted {
  kind: LiveOnlyProps["kind"];
  props: LiveOnlyProps;
  toInputText: (raw: string) => string;
}

export type AdaptedTask = { taskId: string; promptText: string } & (
  | (ReusedAdapted & { reused: true })
  | (LiveAdapted & { reused: false })
);

function adaptLiveOnly(task: ApiDiagnosticTask, kind: LiveOnlyProps["kind"]): LiveAdapted | null {
  const opts = task.options as Record<string, unknown>;

  switch (kind) {
    case "choice_generic": {
      const choiceOpts = opts as unknown as ChoiceOptions;
      if (!choiceOpts?.choices?.length) return null;
      // Most live choice tasks are cloze sentences — the generator writes the
      // sentence into prompt_text with "___" for the gap (see
      // content-pipeline/scripts/prompts/shapes/choice.md). Drawn as a card
      // header it is small, muted prose above three large tiles; the sentence
      // is the thing being read, so it moves into the panel the punctuation
      // card puts it in and the header takes the instruction.
      const isCloze = task.prompt_text.includes("_");
      return {
        kind,
        props: {
          kind,
          prompt: isCloze ? diagnostic.live.chooseAnswer : task.prompt_text,
          sentence: isCloze ? task.prompt_text : null,
          choices: choiceOpts.choices.map((c) => c.text),
          imageUrl: task.image_url,
          audioUrl: task.audio_url,
        },
        toInputText: identity,
      };
    }
    case "fill_generic": {
      const fillOpts = opts as unknown as FillOptions;
      if (!fillOpts?.display_text || !fillOpts.blank_answer) return null;
      return {
        kind,
        props: {
          kind,
          prompt: task.prompt_text,
          displayText: fillOpts.display_text,
          blankLength: fillOpts.blank_answer.length,
          audioUrl: task.audio_url,
        },
        // Case-insensitive single-blank compare against blank_answer.
        toInputText: identity,
      };
    }
    case "sentence_fill": {
      const sf = opts as unknown as SentenceFillOptions;
      if (!sf?.sentence_template) return null;
      return {
        kind,
        props: {
          kind,
          prompt: task.prompt_text,
          sentenceTemplate: sf.sentence_template,
          hint: sf.hint,
          audioUrl: task.audio_url,
        },
        toInputText: identity,
      };
    }
    case "correction": {
      const c = opts as unknown as CorrectionOptions;
      if (!c?.incorrect_text) return null;
      return {
        kind,
        props: { kind, prompt: task.prompt_text, incorrectText: c.incorrect_text },
        toInputText: identity,
      };
    }
    case "dictation":
    case "mini_text": {
      const d = opts as unknown as DictationOptions & MiniTextOptions;
      const isMiniText = kind === "mini_text";
      return {
        kind,
        props: {
          kind,
          prompt: task.prompt_text,
          audioUrl: task.audio_url,
          count: (isMiniText ? d.sentence_count : d.word_count) ?? 1,
          unit: isMiniText ? "sentence" : "word",
          multiline: isMiniText,
        },
        toInputText: identity,
      };
    }
    case "self_check": {
      const sc = opts as unknown as SelfCheckOptions;
      if (!sc?.original_attempt || !sc.model_answer) return null;
      return {
        kind,
        props: { kind, prompt: task.prompt_text, originalAttempt: sc.original_attempt, modelAnswer: sc.model_answer },
        toInputText: identity,
      };
    }
    case "match_pairs_text": {
      const mp = opts as unknown as MatchPairsOptions;
      if (!mp?.pairs?.length) return null;
      return {
        kind,
        props: { kind, prompt: task.prompt_text, pairs: mp.pairs.map((p) => ({ left: p.left, right: p.right })) },
        toInputText: (raw) => JSON.stringify(parseTextPairsRaw(raw)),
      };
    }
    case "assemble_word_audio": {
      const aw = opts as unknown as { tiles: string[]; correct_order: string[] };
      if (!aw?.tiles?.length || !aw.correct_order?.length) return null;
      return {
        kind,
        props: { kind, prompt: task.prompt_text, audioUrl: task.audio_url, tiles: shuffled(aw.tiles), slotCount: aw.correct_order.length },
        toInputText: (raw) => JSON.stringify(raw.split("")),
      };
    }
    case "copy_text": {
      const ct = opts as unknown as CopyOptions;
      if (!ct?.text_to_copy) return null;
      return {
        kind,
        props: { kind, prompt: task.prompt_text, textToCopy: ct.text_to_copy },
        toInputText: identity,
      };
    }
    case "visual_memory": {
      const vm = opts as unknown as VisualMemoryOptions;
      if (!vm?.text_to_memorize) return null;
      return {
        kind,
        props: { kind, prompt: task.prompt_text, textToMemorize: vm.text_to_memorize, displaySeconds: vm.display_seconds ?? 4 },
        toInputText: identity,
      };
    }
    case "tap_find_error": {
      const tf = opts as unknown as TapFindErrorOptions;
      if (!tf?.sentence) return null;
      return {
        kind,
        props: { kind, prompt: task.prompt_text, sentence: tf.sentence },
        // TapFindError reports the tapped word's 0-based index as a string,
        // which is exactly what tapFindErrorDiff compares.
        toInputText: identity,
      };
    }
  }
}

function parseTextPairsRaw(raw: string): { left: string; right: string }[] {
  if (!raw) return [];
  return raw
    .split(", ")
    .map((entry) => {
      const separator = entry.indexOf(":");
      if (separator === -1) return null;
      return { left: entry.slice(0, separator), right: entry.slice(separator + 1) };
    })
    .filter((pair): pair is { left: string; right: string } => pair !== null);
}

/** Adapts a live task, or returns null when required fields are missing and the task should be skipped. */
/**
 * Fallback chains, added after reading a sample of every task_type actually
 * in production (see the plan's "Status update — production DB access"):
 * media fields don't reliably follow the v3 catalog's documented split.
 * TT_4_2 ("audio_choice") turned up with `audio_url: null`; TT_1_4
 * ("assemble_word") with `image_url: null`; a real TT_1_3 ("match_pairs")
 * had no left_image_url/right_image_url on any pair despite
 * `image_side: "right"`. Skipping these outright would silently drop real,
 * answerable content, so each media-requiring adapter now degrades to the
 * flexible generic renderer instead of returning null — null is reserved for
 * tasks missing their actual answer-bearing fields (choices/tiles/pairs),
 * which would be a genuine content-quality problem, not a media gap.
 */
export function adaptTask(task: ApiDiagnosticTask): AdaptedTask | null {
  const key: LiveRendererKey | null = resolveLiveRenderer(task.task_type);
  if (!key) return null;

  const base = { taskId: task.id, promptText: task.prompt_text };

  switch (key) {
    case "audio_choice": {
      const adapted = adaptAudioChoice(task);
      if (adapted) return { ...base, ...adapted, reused: true };
      const fallback = adaptLiveOnly(task, "choice_generic");
      return fallback && { ...base, ...fallback, reused: false };
    }
    case "image_match": {
      const adapted = adaptImageMatch(task);
      if (adapted) return { ...base, ...adapted, reused: true };
      const fallback = adaptLiveOnly(task, "choice_generic");
      return fallback && { ...base, ...fallback, reused: false };
    }
    case "fill_letter_tiles": {
      const adapted = adaptFillLetterTiles(task);
      if (adapted) return { ...base, ...adapted, reused: true };
      const fallback = adaptLiveOnly(task, "fill_generic");
      return fallback && { ...base, ...fallback, reused: false };
    }
    case "match_pairs": {
      const adapted = adaptMatchPairsImage(task);
      if (adapted) return { ...base, ...adapted, reused: true };
      const fallback = adaptLiveOnly(task, "match_pairs_text");
      return fallback && { ...base, ...fallback, reused: false };
    }
    case "assemble_word": {
      // TT_1_4 and TT_2_2 (assemble_word_audio) both land here when the
      // image-based reused renderer doesn't fit: production shows the
      // image/audio split doesn't reliably track which of the two
      // task_types served the task, so both funnel through the same
      // image-first, audio-or-nothing-second chain.
      const adapted = adaptAssembleWord(task);
      if (adapted) return { ...base, ...adapted, reused: true };
      const fallback = adaptLiveOnly(task, "assemble_word_audio");
      return fallback && { ...base, ...fallback, reused: false };
    }
    case "assemble_word_audio": {
      // TT_2_2 itself: prefer an image if this particular row has one
      // (matches what was actually observed on TT_2_2 in production),
      // otherwise the audio/no-media shell.
      const adapted = adaptAssembleWord(task);
      if (adapted) return { ...base, ...adapted, reused: true };
      const fallback = adaptLiveOnly(task, "assemble_word_audio");
      return fallback && { ...base, ...fallback, reused: false };
    }
    case "punctuation_choice": {
      const adapted = adaptPunctuationChoice(task);
      if (adapted) return { ...base, ...adapted, reused: true };
      const fallback = adaptLiveOnly(task, "choice_generic");
      return fallback && { ...base, ...fallback, reused: false };
    }
    case "sentence_capital": {
      const adapted = adaptSentenceCapital(task);
      if (adapted) return { ...base, ...adapted, reused: true };
      const fallback = adaptLiveOnly(task, "choice_generic");
      return fallback && { ...base, ...fallback, reused: false };
    }
    case "punctuation_place": {
      const adapted = adaptPeriodPlace(task);
      if (adapted) return { ...base, ...adapted, reused: true };
      const fallback = adaptLiveOnly(task, "correction");
      return fallback && { ...base, ...fallback, reused: false };
    }
    case "comma_place": {
      const adapted = adaptCommaPlace(task);
      if (adapted) return { ...base, ...adapted, reused: true };
      const fallback = adaptLiveOnly(task, "correction");
      return fallback && { ...base, ...fallback, reused: false };
    }
    default: {
      const adapted = adaptLiveOnly(task, key);
      return adapted && { ...base, ...adapted, reused: false };
    }
  }
}
