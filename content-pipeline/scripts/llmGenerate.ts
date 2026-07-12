/**
 * LLM task generator — shape-driven generation for any of the 39 blueprint task types.
 *
 * The generator iterates over entries in `content-pipeline/schemas/task-types.json`
 * and builds prompts from generic per-shape templates in `scripts/prompts/shapes/`
 * (7 templates, one per options shape) parameterized with skill/error/level/grade/count
 * and few-shot examples drawn from already-`validated/` tasks of the same type.
 *
 * Run:
 *   npx tsx content-pipeline/scripts/llmGenerate.ts --task-type TT_LETTER_FILL --count 5
 *   npx tsx content-pipeline/scripts/llmGenerate.ts --all --count 2
 *
 * Flags:
 *   --task-type <TT_...>   Generate one task batch for this task type
 *   --all                  Iterate every entry in task-types.json
 *   --count <n>            Variants per task type (default: 3)
 *   --skill <S1..S8>       Override default_primary_skill
 *   --error <CODE>         Override default_error_targets (comma-separated, e.g. "C1,C2")
 *   --level <M0..M5>       Override default_level
 *   --grade <G1..G4>       Override default grade_band (comma-separated)
 *   --difficulty <1..5>    Override default_difficulty
 *   --dry-run              Print plan and exit — no API calls
 *   --max-cost <usd>       Hard cost cap in USD (default: 10)
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import * as dotenv from "dotenv";

import { validateTask } from "./validators/schemaValidator";
import { validateDistractors } from "./validators/distractor";
import { findDuplicates } from "./validators/uniqueness";

dotenv.config({ path: path.resolve(__dirname, "../../backend/.env") });

// ─── CLI flags ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flag = (name: string): string | null => {
  const i = argv.indexOf(name);
  return i !== -1 ? (argv[i + 1] ?? null) : null;
};
const has = (name: string) => argv.includes(name);

const IS_DRY_RUN = has("--dry-run");
const IS_ALL = has("--all");
const TASK_TYPE_ARG = flag("--task-type");
const COUNT = (() => {
  const v = flag("--count");
  return v ? Math.max(1, parseInt(v, 10)) : 3;
})();
const SKILL_OVERRIDE = flag("--skill");
const ERROR_OVERRIDE = flag("--error");
const LEVEL_OVERRIDE = flag("--level");
const GRADE_OVERRIDE = flag("--grade");
const DIFFICULTY_OVERRIDE = (() => {
  const v = flag("--difficulty");
  return v ? parseInt(v, 10) : null;
})();
const MAX_COST_ARG = (() => {
  const v = flag("--max-cost");
  return v ? parseFloat(v) : 10;
})();

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL = "google/gemini-2.5-flash";
const MAX_TOKENS = 4000;
const TEMPERATURE = 0.4;
const RETRY_LIMIT = 2;
const RATE_LIMIT_MS = 1000;

const COST_PER_M_IN = 0.15;
const COST_PER_M_OUT = 0.6;

const BASE = path.resolve(__dirname, "../..");
const TASK_TYPES_PATH = path.join(
  BASE,
  "content-pipeline/schemas/task-types.json",
);
const SHAPES_DIR = path.join(
  BASE,
  "content-pipeline/scripts/prompts/shapes",
);
const STAGE1_DIR = path.join(BASE, "content-pipeline/stage1");
const STAGE2_DIR = path.join(BASE, "content-pipeline/stage2");
const VALIDATED_DIR = path.join(BASE, "content-pipeline/validated");
const REJECTED_DIR = path.join(BASE, "content-pipeline/rejected/stage1");
const SEED_WORDS_PATH = path.join(
  BASE,
  "content-pipeline/generated/seed-words.json",
);
const USAGE_PATH = path.join(STAGE1_DIR, "_usage.json");

// ─── Task type catalogue ──────────────────────────────────────────────────────

interface TaskTypeDef {
  task_type: string;
  mongolian_name: string;
  grade_band: string[];
  options_shape: string;
  audio_trigger?: boolean;
  default_primary_skill: string;
  default_error_targets: string[];
  default_level: string;
  default_difficulty: number;
  estimated_time_seconds: number;
  lesson_slot_fit: "WARM_UP" | "CORE" | "MIXED" | "END";
  self_check?: boolean;
  self_check_source_shape?: string;
  generation_hints: string;
}

interface TaskTypeCatalogue {
  version: number;
  description: string;
  task_types: TaskTypeDef[];
}

function loadCatalogue(): TaskTypeCatalogue {
  return JSON.parse(fs.readFileSync(TASK_TYPES_PATH, "utf8"));
}

const SHAPE_TO_TEMPLATE: Record<string, string> = {
  ChoiceOptions: "choice.md",
  FillOptions: "fill.md",
  SentenceFillOptions: "sentence-fill.md",
  CorrectionOptions: "correction.md",
  DictationOptions: "dictation.md",
  MiniTextOptions: "mini-text.md",
  SelfCheckOptions: "self-check.md",
};

// ─── Generation spec (resolved at runtime per task type) ──────────────────────

interface TaskSpec {
  id: string; // auto-assigned, e.g. G12-018
  task_type: string;
  primary_skill: string;
  secondary_skill: string | null;
  level_target: string;
  error_targets: string[];
  grade_band: string[];
  difficulty: number;
  estimated_time_seconds: number;
  lesson_slot_fit: "WARM_UP" | "CORE" | "MIXED" | "END";
  options_shape: string;
  self_check?: boolean;
  self_check_source_shape?: string;
  mongolian_name: string;
  generation_hints: string;
  audio_trigger?: boolean;
}

function resolveSpec(def: TaskTypeDef, autoId: string): TaskSpec {
  const errorTargets = ERROR_OVERRIDE
    ? ERROR_OVERRIDE.split(",").map((s) => s.trim())
    : def.default_error_targets;
  const gradeBand = GRADE_OVERRIDE
    ? GRADE_OVERRIDE.split(",").map((s) => s.trim())
    : def.grade_band;
  return {
    id: autoId,
    task_type: def.task_type,
    primary_skill: SKILL_OVERRIDE ?? def.default_primary_skill,
    secondary_skill: null,
    level_target: LEVEL_OVERRIDE ?? def.default_level,
    error_targets: errorTargets,
    grade_band: gradeBand,
    difficulty: DIFFICULTY_OVERRIDE ?? def.default_difficulty,
    estimated_time_seconds: def.estimated_time_seconds,
    lesson_slot_fit: def.lesson_slot_fit,
    options_shape: def.options_shape,
    self_check: def.self_check,
    self_check_source_shape: def.self_check_source_shape,
    mongolian_name: def.mongolian_name,
    generation_hints: def.generation_hints,
    audio_trigger: def.audio_trigger,
  };
}

// ─── Auto-ID assignment ───────────────────────────────────────────────────────

function scanExistingIds(): Set<string> {
  const ids = new Set<string>();
  const dirs = [STAGE1_DIR, STAGE2_DIR, VALIDATED_DIR, REJECTED_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const m = name.match(/^(G(?:12|24)-\d{3})(?:[-_].*)?\.json$/);
      if (m && m[1]) ids.add(m[1]);
    }
  }
  return ids;
}

function nextIdsForBand(
  band: "12" | "24",
  count: number,
  taken: Set<string>,
): string[] {
  const out: string[] = [];
  let seq = 1;
  while (out.length < count) {
    const id = `G${band}-${String(seq).padStart(3, "0")}`;
    if (!taken.has(id)) {
      out.push(id);
      taken.add(id);
    }
    seq++;
    if (seq > 9999)
      throw new Error(`No free IDs left in G${band}- range below 9999`);
  }
  return out;
}

function pickBandForDef(def: TaskTypeDef): "12" | "24" {
  // If grade_band contains G3 or G4 → G24 band; else G12.
  return def.grade_band.some((g) => g === "G3" || g === "G4") ? "24" : "12";
}

// ─── Seed words ───────────────────────────────────────────────────────────────

interface SeedWord {
  id: string;
  word: string;
  grade_band: string;
  skills: string[];
  errors: string[];
  sentence: string;
  distractors: string[];
  correct_spelling: string;
}

function loadSeedWords(): SeedWord[] {
  const raw = JSON.parse(fs.readFileSync(SEED_WORDS_PATH, "utf8"));
  return raw.words as SeedWord[];
}

function sampleSeedWords(
  allWords: SeedWord[],
  spec: TaskSpec,
  count = 12,
): SeedWord[] {
  const gradePrefixes = spec.grade_band.map((g) => g.replace("G", ""));
  let pool = allWords.filter((w) => {
    const wb = w.grade_band.replace(/G/g, "");
    return gradePrefixes.some((p) => wb.includes(p));
  });

  // Prefer words whose skills overlap the spec's primary skill (relax if too few)
  const skillFiltered = pool.filter((w) => w.skills.includes(spec.primary_skill));
  if (skillFiltered.length >= count) pool = skillFiltered;
  if (pool.length < count) pool = allWords;

  const arr = [...pool];
  // Deterministic shuffle seeded by spec.id so reruns produce the same sample
  let seed = spec.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) || 1;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(seed) / 0x7fffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

function formatSeedList(words: SeedWord[]): string {
  return words
    .map((w) => `- ${w.word} [${w.skills.join(",")}] — «${w.sentence}»`)
    .join("\n");
}

// ─── Few-shot from validated/ ─────────────────────────────────────────────────

function loadFewShotExamples(taskType: string, max = 2): TaskRecord[] {
  if (!fs.existsSync(VALIDATED_DIR)) return [];
  const examples: TaskRecord[] = [];
  for (const name of fs.readdirSync(VALIDATED_DIR)) {
    if (!name.endsWith(".json")) continue;
    if (name.startsWith("_")) continue;
    try {
      const parsed = JSON.parse(
        fs.readFileSync(path.join(VALIDATED_DIR, name), "utf8"),
      );
      const items: TaskRecord[] = Array.isArray(parsed)
        ? parsed
        : ((parsed as { variants?: TaskRecord[] }).variants ?? []);
      for (const item of items) {
        if (item["task_type"] === taskType) {
          examples.push(item);
          if (examples.length >= max) return examples;
        }
      }
    } catch {
      /* skip malformed */
    }
  }
  return examples;
}

function formatFewShotBlock(examples: TaskRecord[]): string {
  if (examples.length === 0) return "";
  const snippets = examples.map((ex, i) => {
    const opts = ex["options"];
    return `Жишээ ${i + 1}:\n${JSON.stringify({ ...(opts as object), correct_answer: ex["correct_answer"], feedback_text: ex["feedback_text"] }, null, 2)}`;
  });
  return `Validated жишээнүүд (хэв маягийг дагана уу, агуулгыг хуулахгүй):\n${snippets.join("\n\n")}\n`;
}

// ─── Prompt assembly ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "Чи монгол кирилл үсгээр бичих зөв бичгийн дасгал үүсгэгч.\n" +
  "\n" +
  "Монгол хэлний зөв бичгийн үндсэн дүрмүүд:\n" +
  "• Эгшгийн зохицол: эрэгтэй (а, о, у) ба эмэгтэй (э, ө, ү) эгшиг нэг үгэнд хольж бичихгүй.\n" +
  "• Урт эгшиг: аа, ии, уу, үү, ее, өө — бичихдээ хосоор бичнэ.\n" +
  "• Балархай эгшиг: э/е зөв ялгаж бичнэ (гэр, дэвтэр, өдөр).\n" +
  "• Залгавар: тийн ялгалын нөхцөлийг эгшгийн зохицолд нийцүүлэн залгана.\n" +
  "• Бага ангийн үг: 1–2р ангид 2–6 үсэгтэй энгийн, өдөр тутмын үгс.\n" +
  "• 3–4р ангид нийлмэл үг, өгүүлбэрийн бүтцийг ашиглаж болно.\n" +
  "\n" +
  "Агуулгын хязгаарлалт (заавал дагах):\n" +
  "• Даалгаврын өгүүлбэр, жишээ, тайлбар бүх зүйл 6-10 насны хүүхдэд тохирсон байх ёстой.\n" +
  "• Дараах сэдвүүдийг ЯГ ХЭРЭГЛЭХГҮЙ: хүчирхийлэл эсвэл гэмтэл/цус, зэвсэг, айдас/аймшиг төрүүлэх зүйл, " +
  "романтик буюу бэлгийн шинжтэй агуулга, архи/тамхи/мансууруулах бодис, өөрийгөө хорлох сэдэв, " +
  "хараал/доромжлол, мөрийтэй тоглоом, түгшүүртэй мэдээ/нийгмийн сэдэв.\n" +
  "• Оронд нь хүүхдийн өдөр тутмын энгийн зүйлс ашигла: сургууль, гэр бүл, байгаль, амьтад, тоглоом, хоол, " +
  "найз нөхөд, гэрийн энгийн ажил зэрэг.\n" +
  "\n" +
  "Гаралтын дүрэм:\n" +
  "• Зөвхөн цэвэр JSON буцаа — markdown fence, тайлбар, мэдэгдэл огт бичихгүй.\n" +
  "• Хариуг { эсвэл [ тэмдэгтээр шууд эхлүүлэх.\n" +
  "• Монгол текст бүхэн зөв кирилл үсгээр бичигдсэн байх (Traditional Mongolian script бүү ашигла).";

function gradeLabel(grade_band: string[]): string {
  return grade_band.some((g) => g === "G3" || g === "G4") ? "2-4" : "1-2";
}

function buildUserPrompt(
  spec: TaskSpec,
  seedList: string,
  fewShotBlock: string,
  count: number,
): string {
  const tmplFile = SHAPE_TO_TEMPLATE[spec.options_shape];
  if (!tmplFile)
    throw new Error(`No shape template for ${spec.options_shape}`);
  const tmplPath = path.join(SHAPES_DIR, tmplFile);
  if (!fs.existsSync(tmplPath))
    throw new Error(`Shape template not found: ${tmplPath}`);
  const tmpl = fs.readFileSync(tmplPath, "utf8");

  const subs: Record<string, string> = {
    "{task_type}": spec.task_type,
    "{mongolian_name}": spec.mongolian_name,
    "{skill}": spec.primary_skill,
    "{level}": spec.level_target,
    "{error_targets}": spec.error_targets.join(", "),
    "{grade_band}": spec.grade_band.join(","),
    "{grade_label}": gradeLabel(spec.grade_band),
    "{generation_hints}": spec.generation_hints,
    "{count}": String(count),
    "{seed_list}": seedList,
    "{few_shot_block}": fewShotBlock,
  };

  let out = tmpl;
  for (const [k, v] of Object.entries(subs)) out = out.split(k).join(v);
  return out;
}

// ─── OpenRouter call ──────────────────────────────────────────────────────────

async function callOpenRouter(
  client: OpenAI,
  userPrompt: string,
  attempt: number,
): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  const retryNote =
    attempt > 0
      ? "\n\nЧУХАЛ: Зөвхөн JSON гарга. Бусад текст огт бичихгүй. { дээр эхэл."
      : "";

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt + retryNote },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  const usage = response.usage as Record<string, number> | undefined;
  const tokensIn = usage?.["prompt_tokens"] ?? usage?.["input_tokens"] ?? 0;
  const tokensOut =
    usage?.["completion_tokens"] ?? usage?.["output_tokens"] ?? 0;

  return { content: text, tokensIn, tokensOut };
}

function extractJson(raw: string): unknown {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const startBrace = stripped.indexOf("{");
  const startBracket = stripped.indexOf("[");
  const start = Math.min(
    startBrace === -1 ? Infinity : startBrace,
    startBracket === -1 ? Infinity : startBracket,
  );
  if (start === Infinity) throw new Error("No JSON object found in response");
  return JSON.parse(stripped.slice(start));
}

// ─── Builders (unchanged JSON output shape) ───────────────────────────────────

type TaskRecord = Record<string, unknown>;

function buildBase(
  spec: TaskSpec,
  promptText: string,
  feedbackText: string,
  correctAnswer: string,
): TaskRecord {
  return {
    id: randomUUID(),
    task_type: spec.task_type,
    prompt_text: promptText,
    correct_answer: correctAnswer,
    audio_url: null,
    image_url: null,
    primary_skill: spec.primary_skill,
    secondary_skill: spec.secondary_skill ?? null,
    level_target: spec.level_target,
    error_targets: spec.error_targets,
    grade_band: spec.grade_band,
    difficulty: spec.difficulty,
    estimated_time_seconds: spec.estimated_time_seconds,
    lesson_slot_fit: spec.lesson_slot_fit,
    feedback_text: feedbackText,
  };
}

function buildChoice(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  const choices = v["choices"] as Array<{ text: string; is_correct: boolean }>;
  const correctChoice = choices?.find((c) => c.is_correct);
  const correctAnswer =
    (v["correct_answer"] as string) ?? correctChoice?.text ?? "";
  const promptText =
    (v["prompt_text"] as string) ??
    (v["sentence_with_blank"] as string) ??
    "Зөв хэлбэрийг сонгоно уу.";

  return {
    ...buildBase(
      spec,
      promptText,
      (v["feedback_text"] as string) ?? "",
      correctAnswer,
    ),
    options: { choices, audio_trigger: spec.audio_trigger ?? false },
  };
}

function buildFill(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  const displayText = (v["display_text"] as string) ?? "";
  const blankAnswer = (v["blank_answer"] as string) ?? "";
  const blankPos = displayText.indexOf("_");
  const blankPosition = blankPos >= 0 ? blankPos : 0;
  const contextWord =
    (v["context_word"] as string) ??
    (v["context_sentence"] as string) ??
    blankAnswer;

  const promptText =
    (v["prompt_text"] as string) ?? `Хоосон зайг нөхөөрэй:\n${displayText}`;

  return {
    ...buildBase(
      spec,
      promptText,
      (v["feedback_text"] as string) ?? "",
      blankAnswer,
    ),
    options: {
      display_text: displayText,
      blank_position: blankPosition,
      blank_answer: blankAnswer,
      context_word: contextWord,
    },
  };
}

function buildSentenceFill(
  spec: TaskSpec,
  v: Record<string, unknown>,
): TaskRecord {
  const sentenceTemplate =
    (v["sentence_template"] as string) ?? (v["display_text"] as string) ?? "";
  const blankAnswer = (v["blank_answer"] as string) ?? "";
  const contextSentence =
    (v["context_sentence"] as string) ??
    sentenceTemplate.replace("___", blankAnswer);
  const hint = (v["hint"] as string) ?? "";

  return {
    ...buildBase(
      spec,
      (v["prompt_text"] as string) ??
        `Доорх өгүүлбэрийн дутуу үгийг нөхөөрэй:\n${sentenceTemplate}`,
      (v["feedback_text"] as string) ?? "",
      blankAnswer,
    ),
    options: {
      sentence_template: sentenceTemplate,
      blank_answer: blankAnswer,
      context_sentence: contextSentence,
      hint,
    },
  };
}

function buildCorrection(
  spec: TaskSpec,
  v: Record<string, unknown>,
): TaskRecord {
  const incorrectText = (v["incorrect_text"] as string) ?? "";
  const correctText = (v["correct_text"] as string) ?? "";
  const explanation = (v["explanation"] as string) ?? "";
  const feedbackText =
    (v["feedback_text"] as string) ??
    (explanation
      ? `${explanation} Зөв хариу: ${correctText}`
      : `Зөв хариу: ${correctText}`);

  const opts: Record<string, unknown> = {
    incorrect_text: incorrectText,
    correct_text: correctText,
    error_type: (v["error_type"] as string) ?? spec.error_targets[0] ?? "",
    hint: (v["hint"] as string) ?? feedbackText,
  };
  if (spec.task_type === "TT_EXPLAINED_CORRECTION" && explanation)
    opts["explanation"] = explanation;

  return {
    ...buildBase(
      spec,
      (v["prompt_text"] as string) ??
        "Дараах өгүүлбэрт алдаа байна. Зөв засаарай.",
      feedbackText,
      correctText,
    ),
    initial_text: incorrectText,
    options: opts,
  };
}

function buildDictation(
  spec: TaskSpec,
  v: Record<string, unknown>,
): TaskRecord {
  const words = v["words"] as string[] | undefined;
  const sentences = v["sentences"] as string[] | undefined;
  const expectedAnswers =
    (v["expected_answers"] as string[] | undefined) ?? words ?? sentences ?? [];
  const audioText =
    (v["audio_text"] as string) ||
    (sentences?.join(" ") ?? "") ||
    (words?.join(", ") ?? "") ||
    expectedAnswers.join("; ");
  const correctAnswer =
    (v["correct_answer"] as string) ?? expectedAnswers.join(";");

  return {
    ...buildBase(
      spec,
      (v["prompt_text"] as string) ?? "Сонссон үгс болон өгүүлбэрийг бичээрэй.",
      (v["feedback_text"] as string) ?? "",
      correctAnswer,
    ),
    options: {
      audio_text: audioText,
      word_count:
        (v["word_count"] as number) ??
        expectedAnswers.reduce(
          (n, s) => n + (typeof s === "string" ? s.trim().split(/\s+/).length : 0),
          0,
        ),
      expected_answers: expectedAnswers,
      allow_partial: true,
    },
  };
}

function buildMiniText(
  spec: TaskSpec,
  v: Record<string, unknown>,
): TaskRecord {
  const expectedAnswers = (v["expected_answers"] as string[]) ?? [];
  const audioText = (v["audio_text"] as string) || expectedAnswers.join(" ");
  const correctAnswer =
    (v["correct_answer"] as string) ?? expectedAnswers.join(";");

  return {
    ...buildBase(
      spec,
      (v["prompt_text"] as string) ??
        "Сонссон өгүүлбэрүүдийг дарааллаар бичээрэй.",
      (v["feedback_text"] as string) ?? "",
      correctAnswer,
    ),
    options: {
      audio_text: audioText,
      sentence_count: (v["sentence_count"] as number) ?? expectedAnswers.length,
      expected_answers: expectedAnswers,
    },
  };
}

function buildSelfCheckFromSource(
  spec: TaskSpec,
  sourceItems: TaskRecord[],
  max: number,
): TaskRecord[] {
  return sourceItems.slice(0, max).map((item) => {
    const opts = item["options"] as Record<string, unknown> | undefined;
    const incorrectText = (opts?.["incorrect_text"] as string) ?? "";
    const correctText =
      (opts?.["correct_text"] as string) ??
      (item["correct_answer"] as string) ??
      "";

    return {
      ...buildBase(
        spec,
        "Өмнөх даалгаврын хариугаа загвартай харьцуул.",
        (item["feedback_text"] as string) ?? `Зөв хариу: ${correctText}`,
        correctText,
      ),
      options: {
        original_attempt: incorrectText,
        model_answer: correctText,
        comparison_mode: "side_by_side",
      },
    };
  });
}

function buildVariant(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  switch (spec.options_shape) {
    case "ChoiceOptions":
      return buildChoice(spec, v);
    case "FillOptions":
      return buildFill(spec, v);
    case "SentenceFillOptions":
      return buildSentenceFill(spec, v);
    case "CorrectionOptions":
      return buildCorrection(spec, v);
    case "DictationOptions":
      return buildDictation(spec, v);
    case "MiniTextOptions":
      return buildMiniText(spec, v);
    default:
      throw new Error(`No builder for options_shape: ${spec.options_shape}`);
  }
}

// ─── Self-check source loader ─────────────────────────────────────────────────

function loadSelfCheckSource(sourceShape: string): TaskRecord[] {
  // Prefer validated/, fall back to stage2/, then stage1/
  const dirs = [VALIDATED_DIR, STAGE2_DIR, STAGE1_DIR];
  const correctionTypes = new Set([
    "TT_COPY_WRITE",
    "TT_CAPITAL_PUNCTUATION",
    "TT_FIND_ERROR",
    "TT_FIX_ERROR",
    "TT_WORD_FORM_FIX",
    "TT_FIND_OMITTED_LETTER",
    "TT_SENTENCE_BOUNDARY",
    "TT_BASIC_COMMA",
    "TT_EXPLAINED_CORRECTION",
  ]);
  const isCorrection = (t: unknown) =>
    typeof t === "string" && correctionTypes.has(t);

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      if (name.startsWith("_")) continue;
      try {
        const parsed = JSON.parse(
          fs.readFileSync(path.join(dir, name), "utf8"),
        );
        const items: TaskRecord[] = Array.isArray(parsed)
          ? parsed
          : ((parsed as { variants?: TaskRecord[] }).variants ?? []);
        const matching =
          sourceShape === "CorrectionOptions"
            ? items.filter((it) => isCorrection(it["task_type"]))
            : items;
        if (matching.length > 0) return matching;
      } catch {
        /* skip */
      }
    }
  }
  return [];
}

// ─── Validators ───────────────────────────────────────────────────────────────

interface ValidationResult {
  ok: boolean;
  reasons: string[];
}

function runValidators(task: TaskRecord, shape: string): ValidationResult {
  const reasons: string[] = [];

  const schemaResult = validateTask(task);
  if (!schemaResult.ok)
    reasons.push(...schemaResult.errors.map((e) => `schema: ${e}`));

  if (shape === "ChoiceOptions") {
    const distResult = validateDistractors(
      task as unknown as Parameters<typeof validateDistractors>[0],
    );
    if (!distResult.ok)
      reasons.push(...distResult.reasons.map((r) => `distractor: ${r}`));
  }

  return { ok: reasons.length === 0, reasons };
}

// ─── Cost helpers ─────────────────────────────────────────────────────────────

function computeCost(tokensIn: number, tokensOut: number): number {
  return (
    (tokensIn / 1_000_000) * COST_PER_M_IN +
    (tokensOut / 1_000_000) * COST_PER_M_OUT
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase().startsWith("y"));
    });
  });
}

// ─── Reporting ────────────────────────────────────────────────────────────────

interface UsageRecord {
  task_id: string;
  task_type: string;
  calls: number;
  variants_generated: number;
  passed: number;
  rejected: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
}

function saveUsage(
  records: UsageRecord[],
  failedIds: string[],
  skippedIds: string[],
) {
  const totIn = records.reduce((s, r) => s + r.tokens_in, 0);
  const totOut = records.reduce((s, r) => s + r.tokens_out, 0);
  const totCalls = records.reduce((s, r) => s + r.calls, 0);
  const usage = {
    total_calls: totCalls,
    total_input_tokens: totIn,
    total_output_tokens: totOut,
    estimated_cost_usd: parseFloat(computeCost(totIn, totOut).toFixed(6)),
    model: MODEL,
    provider: "openrouter",
    failed_task_ids: failedIds,
    skipped_task_ids: skippedIds,
    generated_at: new Date().toISOString(),
    records,
  };
  fs.mkdirSync(STAGE1_DIR, { recursive: true });
  fs.writeFileSync(USAGE_PATH, JSON.stringify(usage, null, 2));
  console.log(`\nUsage written → ${USAGE_PATH}`);
}

function printReport(rows: UsageRecord[]) {
  const W = 96;
  console.log("\n" + "─".repeat(W));
  console.log(
    "task_id".padEnd(12) +
      "task_type".padEnd(28) +
      "calls".padStart(6) +
      "variants".padStart(10) +
      "passed".padStart(8) +
      "rejected".padStart(10) +
      "tokens".padStart(9),
  );
  console.log("─".repeat(W));

  let tCalls = 0,
    tVariants = 0,
    tPassed = 0,
    tRejected = 0,
    tIn = 0,
    tOut = 0;
  for (const r of rows) {
    console.log(
      r.task_id.padEnd(12) +
        r.task_type.slice(0, 27).padEnd(28) +
        String(r.calls).padStart(6) +
        String(r.variants_generated).padStart(10) +
        String(r.passed).padStart(8) +
        String(r.rejected).padStart(10) +
        String(r.tokens_in + r.tokens_out).padStart(9),
    );
    tCalls += r.calls;
    tVariants += r.variants_generated;
    tPassed += r.passed;
    tRejected += r.rejected;
    tIn += r.tokens_in;
    tOut += r.tokens_out;
  }

  console.log("─".repeat(W));
  console.log(
    "TOTAL".padEnd(12) +
      "".padEnd(28) +
      String(tCalls).padStart(6) +
      String(tVariants).padStart(10) +
      String(tPassed).padStart(8) +
      String(tRejected).padStart(10) +
      String(tIn + tOut).padStart(9),
  );
  console.log("─".repeat(W));
  console.log(`\nEstimated cost: $${computeCost(tIn, tOut).toFixed(4)}`);
  const fullPass = rows.filter((r) => r.passed >= 1).length;
  console.log(`Task types with ≥1 passing variant: ${fullPass}/${rows.length}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const catalogue = loadCatalogue();

  // ── Resolve target task type defs ─────────────────────────────────────────
  let defs: TaskTypeDef[];
  if (IS_ALL) {
    defs = catalogue.task_types;
  } else if (TASK_TYPE_ARG) {
    const found = catalogue.task_types.find(
      (d) => d.task_type === TASK_TYPE_ARG,
    );
    if (!found) {
      console.error(
        `ERROR: --task-type "${TASK_TYPE_ARG}" not in task-types.json`,
      );
      console.error(
        `Available: ${catalogue.task_types.map((d) => d.task_type).join(", ")}`,
      );
      process.exit(1);
    }
    defs = [found];
  } else {
    console.error("ERROR: pass --task-type <TT_...> or --all");
    console.error("Example: --task-type TT_LETTER_FILL --count 5");
    process.exit(1);
  }

  // ── Auto-assign IDs ───────────────────────────────────────────────────────
  const taken = scanExistingIds();
  const specs: TaskSpec[] = defs.map((def) => {
    const band = pickBandForDef(def);
    const [id] = nextIdsForBand(band, 1, taken);
    return resolveSpec(def, id);
  });

  const selfCheckSpecs = specs.filter((s) => s.self_check);
  const llmSpecs = specs.filter((s) => !s.self_check);

  // Rough cost estimate: 1500 input + 800 output per call
  const estimatedCalls = llmSpecs.length;
  const estIn = estimatedCalls * 1500;
  const estOut = estimatedCalls * 800;
  const estCost = computeCost(estIn, estOut);

  // ── Print plan ────────────────────────────────────────────────────────────
  console.log("\n=== GENERATION PLAN ===");
  console.log(`Catalogue entries: ${catalogue.task_types.length}`);
  console.log(`Selected:          ${defs.length} task type(s)`);
  console.log(`Auto-assigned IDs: ${specs.map((s) => `${s.id}(${s.task_type})`).join(", ")}`);
  if (selfCheckSpecs.length > 0)
    console.log(
      `Self-check (no API): ${selfCheckSpecs.map((s) => s.task_type).join(", ")}`,
    );
  console.log(`Variants per type: ${COUNT}`);
  console.log(`API calls (est):   ${llmSpecs.length}`);
  console.log(`Model:             ${MODEL} via OpenRouter`);
  console.log(`Estimated cost:    $${estCost.toFixed(4)}`);
  console.log(`Hard cap:          $${MAX_COST_ARG.toFixed(2)}`);
  if (SKILL_OVERRIDE || ERROR_OVERRIDE || LEVEL_OVERRIDE || GRADE_OVERRIDE)
    console.log(
      `Overrides:         ` +
        [
          SKILL_OVERRIDE && `skill=${SKILL_OVERRIDE}`,
          ERROR_OVERRIDE && `error=${ERROR_OVERRIDE}`,
          LEVEL_OVERRIDE && `level=${LEVEL_OVERRIDE}`,
          GRADE_OVERRIDE && `grade=${GRADE_OVERRIDE}`,
        ]
          .filter(Boolean)
          .join(", "),
    );

  if (IS_DRY_RUN) {
    // Print one fully-resolved prompt so the operator can sanity-check
    const sample = llmSpecs[0] ?? specs[0];
    if (sample) {
      const allWords = loadSeedWords();
      const seedWords = sampleSeedWords(allWords, sample, 12);
      const fewShot = loadFewShotExamples(sample.task_type);
      const seedList = formatSeedList(seedWords);
      const fewShotBlock = formatFewShotBlock(fewShot);
      console.log("\n=== SAMPLE PROMPT (" + sample.task_type + ") ===");
      console.log(buildUserPrompt(sample, seedList, fewShotBlock, COUNT));
    }
    console.log("\n[--dry-run] No API calls will be made. Exiting.");
    process.exit(0);
  }

  const proceed = await confirm("Proceed? (y/n): ");
  if (!proceed) {
    console.log("Aborted.");
    process.exit(0);
  }

  // ── API key check ─────────────────────────────────────────────────────────
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    console.error("\nERROR: OPENROUTER_API_KEY not set in .env");
    process.exit(1);
  }

  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Mongolian Writing App - Content Generation",
    },
  });

  const allWords = loadSeedWords();
  fs.mkdirSync(STAGE1_DIR, { recursive: true });
  fs.mkdirSync(REJECTED_DIR, { recursive: true });

  const report: UsageRecord[] = [];
  const failedIds: string[] = [];
  const skippedIds: string[] = [];
  let runningCost = 0;

  // ── Self-check tasks (no API call) ────────────────────────────────────────
  for (const spec of selfCheckSpecs) {
    console.log(
      `\n[${spec.id}] Building ${spec.task_type} from existing ${spec.self_check_source_shape ?? "CorrectionOptions"} tasks...`,
    );
    const sourceItems = loadSelfCheckSource(
      spec.self_check_source_shape ?? "CorrectionOptions",
    );
    if (sourceItems.length === 0) {
      console.warn(
        `  SKIP — no source tasks of shape ${spec.self_check_source_shape ?? "CorrectionOptions"} in stage1/stage2/validated`,
      );
      skippedIds.push(spec.id);
      report.push({
        task_id: spec.id,
        task_type: spec.task_type,
        calls: 0,
        variants_generated: 0,
        passed: 0,
        rejected: 0,
        tokens_in: 0,
        tokens_out: 0,
        cost_usd: 0,
      });
      continue;
    }

    const built = buildSelfCheckFromSource(spec, sourceItems, COUNT);
    const passed: TaskRecord[] = [];
    const rejected: TaskRecord[] = [];
    for (const task of built) {
      const result = runValidators(task, spec.options_shape);
      if (result.ok) passed.push(task);
      else {
        console.warn(`  REJECT ${task["id"]}: ${result.reasons.join("; ")}`);
        rejected.push({ ...task, _rejection_reasons: result.reasons });
      }
    }

    if (passed.length > 0) {
      fs.writeFileSync(
        path.join(STAGE1_DIR, `${spec.id}.json`),
        JSON.stringify(passed, null, 2),
      );
      console.log(`  PASS ${passed.length}/${built.length} → stage1/${spec.id}.json`);
    }
    if (rejected.length > 0) {
      fs.writeFileSync(
        path.join(REJECTED_DIR, `${spec.id}_rejected.json`),
        JSON.stringify(rejected, null, 2),
      );
    }

    report.push({
      task_id: spec.id,
      task_type: spec.task_type,
      calls: 0,
      variants_generated: built.length,
      passed: passed.length,
      rejected: rejected.length,
      tokens_in: 0,
      tokens_out: 0,
      cost_usd: 0,
    });
  }

  // ── LLM tasks ─────────────────────────────────────────────────────────────
  for (const spec of llmSpecs) {
    console.log(`\n[${spec.id}] ${spec.task_type} — generating ${COUNT} variant(s)...`);

    const seedWords = sampleSeedWords(allWords, spec, 12);
    const seedList = formatSeedList(seedWords);
    const fewShot = loadFewShotExamples(spec.task_type);
    if (fewShot.length > 0)
      console.log(`  Using ${fewShot.length} few-shot example(s) from validated/`);
    const fewShotBlock = formatFewShotBlock(fewShot);

    let parsed: unknown = null;
    let tokensIn = 0;
    let tokensOut = 0;
    let calls = 0;

    for (let attempt = 0; attempt <= RETRY_LIMIT; attempt++) {
      if (attempt > 0) {
        console.log(`  Retry ${attempt}/${RETRY_LIMIT}...`);
        await sleep(RATE_LIMIT_MS);
      }

      try {
        const userPrompt = buildUserPrompt(spec, seedList, fewShotBlock, COUNT);
        const result = await callOpenRouter(client, userPrompt, attempt);
        tokensIn += result.tokensIn;
        tokensOut += result.tokensOut;
        calls++;

        const callCost = computeCost(result.tokensIn, result.tokensOut);
        runningCost += callCost;

        if (runningCost >= MAX_COST_ARG) {
          console.error(
            `\n⚠ COST CAP: $${runningCost.toFixed(4)} ≥ $${MAX_COST_ARG}. Stopping.`,
          );
          saveUsage(report, failedIds, skippedIds);
          printReport(report);
          process.exit(1);
        }

        parsed = extractJson(result.content);
        break;
      } catch (err) {
        console.warn(
          `  Attempt ${attempt + 1} failed: ${(err as Error).message}`,
        );
        if (attempt === RETRY_LIMIT) {
          console.error(`  SKIP ${spec.id} — all retries exhausted`);
          failedIds.push(spec.id);
        }
      }
    }

    await sleep(RATE_LIMIT_MS);

    if (!parsed) {
      report.push({
        task_id: spec.id,
        task_type: spec.task_type,
        calls,
        variants_generated: 0,
        passed: 0,
        rejected: 0,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost_usd: computeCost(tokensIn, tokensOut),
      });
      continue;
    }

    let rawVariants: unknown[] = [];
    if (Array.isArray(parsed)) {
      rawVariants = parsed;
    } else if (parsed && typeof parsed === "object") {
      const p = parsed as Record<string, unknown>;
      const key = Object.keys(p).find((k) => Array.isArray(p[k]));
      if (key) rawVariants = p[key] as unknown[];
    }

    if (rawVariants.length > COUNT) rawVariants = rawVariants.slice(0, COUNT);

    console.log(`  Received ${rawVariants.length} raw variant(s)`);

    const passed: TaskRecord[] = [];
    const rejected: TaskRecord[] = [];

    for (let i = 0; i < rawVariants.length; i++) {
      let task: TaskRecord;
      try {
        task = buildVariant(spec, rawVariants[i] as Record<string, unknown>);
      } catch (err) {
        console.warn(`  v${i + 1} build error: ${(err as Error).message}`);
        rejected.push({
          _raw: rawVariants[i],
          _error: (err as Error).message,
        } as TaskRecord);
        continue;
      }

      const vResult = runValidators(task, spec.options_shape);
      if (vResult.ok) {
        passed.push(task);
        console.log(`  v${i + 1} PASS`);
      } else {
        console.warn(`  v${i + 1} REJECT: ${vResult.reasons.join("; ")}`);
        rejected.push({ ...task, _rejection_reasons: vResult.reasons });
      }
    }

    if (passed.length > 1) {
      const dupes = findDuplicates(
        passed as unknown as Parameters<typeof findDuplicates>[0],
      );
      if (dupes.length > 0) console.warn(`  Duplicate groups: ${dupes.length}`);
    }

    if (passed.length > 0) {
      fs.writeFileSync(
        path.join(STAGE1_DIR, `${spec.id}.json`),
        JSON.stringify(passed, null, 2),
      );
      console.log(
        `  ${passed.length}/${rawVariants.length} passed → stage1/${spec.id}.json`,
      );
    }
    if (rejected.length > 0) {
      fs.writeFileSync(
        path.join(REJECTED_DIR, `${spec.id}_rejected.json`),
        JSON.stringify(rejected, null, 2),
      );
    }

    report.push({
      task_id: spec.id,
      task_type: spec.task_type,
      calls,
      variants_generated: rawVariants.length,
      passed: passed.length,
      rejected: rejected.length,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: computeCost(tokensIn, tokensOut),
    });
  }

  saveUsage(report, failedIds, skippedIds);
  printReport(report);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
