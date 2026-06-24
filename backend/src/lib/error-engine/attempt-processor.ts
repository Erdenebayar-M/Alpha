/**
 * Attempt Processor — pipeline that connects:
 *   answer-checker → error-classifier → score calculation → DB writes
 *
 * Routes on the full TT_* task-type taxonomy. Each task type belongs to one of
 * the checking groups defined in answer-checker.ts:
 *   CHOICE_TYPES    → exact-match check
 *   FILL_TYPES      → case-insensitive blank comparison
 *   DICTATION_TYPES → word-by-word character diff
 *   MATCH_TYPES     → pair-set comparison (TT_MATCH_PAIRS)
 *   ASSEMBLE_TYPES  → tile-order comparison (TT_ASSEMBLE_WORD)
 *   TAP_TYPES       → tapped-index comparison (TT_TAP_FIND_ERROR)
 *   SELF_CHECK_TYPES→ H4 + sentence-aware diff
 *   default         → sentence-aware diff (correction, copy, mini-text, boundary)
 */

import {
  checkAnswer,
  checkSentence,
  matchPairsDiff,
  assembleWordDiff,
  tapFindErrorDiff,
  CHOICE_TYPES,
  FILL_TYPES,
  DICTATION_TYPES,
  MATCH_TYPES,
  ASSEMBLE_TYPES,
  TAP_TYPES,
  SELF_CHECK_TYPES,
} from './answer-checker';
import type { MatchPairsOptions, AssembleWordOptions, TapFindErrorOptions } from './answer-checker';
import {
  classifyWordErrors,
  classifySentenceErrors,
  calculateScore,
} from './error-classifier';
import type { ClassifiedError, TaskMeta } from './error-classifier';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AttemptInput {
  learnerId: string;
  taskId: string;
  lessonId?: string;
  diagnosticSessionId?: string;
  inputText: string;
  timeSeconds: number;
}

export interface AttemptResult {
  score: number;
  isCorrect: boolean;
  errorCodes: string[];
  errorsDetail: ClassifiedError[];
  feedback: string;
  selfCorrected: boolean;
}

/** Minimal Task shape needed by the processor (mirrors the Prisma Task model). */
export interface TaskRecord {
  id: string;
  task_type: string;
  correct_answer: string;
  options: unknown;
  feedback_text: string;
  primary_skill: string;
  error_targets: string[];
}

// ─── Canonical option shapes (from task.schema.json) ─────────────────────────

interface ChoiceOptions {
  choices: { text: string; is_correct: boolean }[];
  audio_trigger?: boolean;
}

interface FillOptions {
  display_text: string;
  blank_position: number;
  blank_answer: string;
  context_word: string;
}

interface SentenceFillOptions {
  sentence_template: string;
  blank_answer: string;
  context_sentence: string;
  hint?: string;
}

interface CorrectionOptions {
  incorrect_text: string;
  correct_text: string;
}

interface DictationOptions {
  audio_text: string;
  word_count: number;
  expected_answers: string[];
  allow_partial: boolean;
}

interface MiniTextOptions {
  audio_text: string;
  sentence_count: number;
  expected_answers: string[];
}

interface SelfCheckOptions {
  original_attempt: string;
  model_answer: string;
  comparison_mode: string;
}

// ─── Repository interfaces (for dependency injection / testing) ───────────────

export interface TaskRepository {
  findById(taskId: string): Promise<TaskRecord | null>;
}

export interface AttemptRepository {
  create(data: {
    learnerId: string;
    taskId: string;
    lessonId?: string;
    diagnosticSessionId?: string;
    inputText: string;
    score: number;
    timeSeconds: number;
    selfCorrected: boolean;
    errorCodes: string[];
    context: 'DIAGNOSTIC' | 'LESSON';
  }): Promise<{ id: string }>;
}

export interface ErrorLogRepository {
  createMany(data: {
    attemptId: string;
    errors: {
      errorCode: string;
      severity: number;
      positionInWord?: number;
      expectedChar?: string;
      actualChar?: string;
      contextWord?: string;
    }[];
  }): Promise<void>;
}

// ─── Feedback generation ─────────────────────────────────────────────────────

const FEEDBACK_MAP: Record<string, (err: ClassifiedError) => string> = {
  // A-group
  A1: () => 'Авиаг дахин анзаараарай. Ялгаатай авиануудыг сонсоод ялга.',
  A2: (e) => `Үсэг солигдсон байна. "${e.expectedChar ?? ''}" байх ёстой.`,
  A3: () => 'Үеийн бүтцийг дахин шалгаарай.',
  // B-group
  B1: (e) => `Үсэг орхисон байна. '${e.contextWord}' гэж бүтэн бичээрэй.`,
  B2: (e) => `Илүү үсэг бичсэн байна. '${e.contextWord}' гэж бичнэ.`,
  B3: () => 'Үсгийн дарааллыг анзаараарай.',
  B4: () => 'Үгийн хэсэг орхигдсон байна. Бүтнээр бичих хэрэгтэй.',
  // C-group
  C1: (e) => `Урт эгшгийг анзаар. '${e.contextWord}' гэж давхар ${e.expectedChar?.[0] ?? ''}-той бичдэг.`,
  C2: (e) => `Илүү эгшиг бичсэн байна. '${e.contextWord}' гэж зөвхөн нэг ${e.expectedChar ?? ''}-той.`,
  C3: (e) => `Эгшиг андуурсан байна. '${e.expectedChar ?? ''}' байх ёстой.`,
  C4: (e) => `Балархай эгшгийг бүү мартаарай. '${e.contextWord}' гэж ${e.expectedChar ?? ''} үсэгтэй.`,
  C5: () => 'Илүү эгшиг нэмсэн байна. Сул дуудагдах эгшиг хэр давтагдаж бичихийг шалгаарай.',
  C6: () => 'Эгшгийн зохицол буруу байна. Эр/эм үгийн залгаврыг шалгаарай.',
  // D-group
  D1: (e) => `Гийгүүлэгч орхигдсон байна. '${e.contextWord}' дотор "${e.expectedChar ?? ''}" байна.`,
  D2: (e) => `Илүү гийгүүлэгч бичсэн байна. '${e.contextWord}' гэж бичнэ.`,
  D3: (e) => `Төстэй авиаг андуурсан байна. '${e.expectedChar ?? ''}' биш '${e.actualChar ?? ''}' байх ёстой.`,
  D4: () => 'Давхар гийгүүлэгч буруу байна. Заримдаа давхардахгүй гийгүүлэгчийг давтаж бичсэн байна.',
  D5: (e) => `Үгийн төгсгөлийн гийгүүлэгч буруу байна. '${e.expectedChar ?? ''}' байх ёстой.`,
  // E-group
  E1: (e) => `Залгавар дутуу байна. '${e.contextWord}' гэж бичнэ.`,
  E2: (e) => `Буруу залгавар сонгосон. '${e.expectedChar ?? ''}' байх ёстой.`,
  E3: () => 'Эр/эм залгавар буруу байна. Үгийн эгшгийн зохицолд анхаарна уу.',
  E7: () => 'Залгавар дотор бичлэгийн алдаа байна.',
  // G-group
  G1: () => 'Эхний үсгийг том бич.',
  G2: () => 'Өгүүлбэрийн төгсгөлд цэг тавь.',
  G3: () => 'Асуулт/анхааруулах тэмдэг дутуу байна.',
  G4: () => 'Таслал дутуу байна.',
  G5: () => 'Өгүүлбэрийн хил зааг буруу байна.',
  // H-group
  H4: () => 'Өөрийн хариуг дахин нягтлан шалгаарай.',
};

/** Max errors surfaced in learner-facing feedback (does not affect scoring). */
const FEEDBACK_ERROR_CAP = 3;

function generateFeedback(errors: ClassifiedError[], taskFeedback: string): string {
  if (errors.length === 0) return 'Зөв бичлээ! Баяр хүргэе!';
  const sorted = [...errors].sort((a, b) => b.severity - a.severity);
  const primary = sorted[0];
  const fn = FEEDBACK_MAP[primary.errorCode];
  return fn ? fn(primary) : taskFeedback || 'Алдаа байна, дахин оролдоорой.';
}

// ─── Main pipeline ───────────────────────────────────────────────────────────

export async function processAttempt(
  input: AttemptInput,
  taskRepo: TaskRepository,
  attemptRepo?: AttemptRepository,
  errorLogRepo?: ErrorLogRepository,
): Promise<AttemptResult> {
  // 1. Load task
  const task = await taskRepo.findById(input.taskId);
  if (!task) throw new Error(`Task not found: ${input.taskId}`);

  const taskType = task.task_type;
  const options = task.options as Record<string, unknown>;
  let errors: ClassifiedError[] = [];
  let selfCorrected = false;

  // 2. Route by task type
  if (CHOICE_TYPES.has(taskType)) {
    const opts = options as unknown as ChoiceOptions;
    const correct = opts.choices?.find((c) => c.is_correct);
    const expected = correct?.text ?? task.correct_answer;
    const diff = checkAnswer(expected, input.inputText, taskType);
    errors = diff.isCorrect ? [] : classifyWordErrors(diff, expected, input.inputText, { taskType });

  } else if (FILL_TYPES.has(taskType)) {
    const opts = options as unknown as FillOptions;
    const contextWord = opts.context_word ?? task.correct_answer;
    const blankAnswer = opts.blank_answer ?? task.correct_answer;
    const pos = opts.blank_position ?? 0;
    const blankLen = blankAnswer.length; // may be >1 — multi-char blanks supported
    const fullActual = contextWord.slice(0, pos) + input.inputText + contextWord.slice(pos + blankLen);

    // TT_5_2 / TT_7_5 are sentenceFillOptions (context is a sentence, no real
    // blank_position) — they must NOT take the word-level DP path below.
    // NOTE: their dedicated branch (`taskType === 'TT_5_2' || 'TT_7_5'` further
    // down) is currently DEAD code because FILL_TYPES.has() matches them here
    // first. That ordering bug is out of scope for this fix; this guard just
    // keeps them on the legacy whole-string check so we don't deepen it.
    // Follow-up: pull TT_5_2/TT_7_5 out of FILL_TYPES (or reorder the branches).
    const isSentenceFill = taskType === 'TT_5_2' || taskType === 'TT_7_5';

    if (blankAnswer.toLowerCase() === input.inputText.toLowerCase()) {
      errors = [];
    } else {
      // Word-level fills: run the REAL DP on the reconstructed word by omitting
      // the taskType, so checkAnswer uses wordLevelDiff instead of the FILL
      // exact-match bypass. The diff localises to the blank region (only that
      // part differs) but at correct full-word positions, and the classifier
      // sees full-word context — so isReducedVowelPosition / isLongVowelPart
      // work, surfacing C1/C3/C4/D3/… instead of always collapsing to B1.
      const diff = isSentenceFill
        ? checkAnswer(contextWord, fullActual, taskType) // legacy bypass (unchanged)
        : checkAnswer(contextWord, fullActual);          // word-level DP path
      errors = classifyWordErrors(diff, contextWord, fullActual, { taskType });
      if (errors.length === 0) {
        // Empty-diff safety net: a wrong blank the classifier can't pin to a
        // specific code (e.g. an unclassified substitution) still records B1.
        errors.push({
          errorCode: 'B1', severity: 2, position: pos,
          expectedChar: blankAnswer, actualChar: input.inputText, contextWord,
          message: `Буруу үсэг бичсэн: "${blankAnswer}" байх ёстой газар "${input.inputText}" бичсэн`,
        });
      }
    }

  } else if (taskType === 'TT_5_2' || taskType === 'TT_7_5') {
    const opts = options as unknown as SentenceFillOptions;
    const expected = opts.blank_answer ?? task.correct_answer;
    const diff = checkAnswer(expected, input.inputText, taskType);
    errors = diff.isCorrect ? [] : classifyWordErrors(diff, expected, input.inputText, { taskType });

  } else if (DICTATION_TYPES.has(taskType)) {
    const opts = options as unknown as DictationOptions;
    const expectedAnswers = opts.expected_answers ?? [task.correct_answer];
    const inputSentences = input.inputText.split(/(?<=[.!?])\s+/);
    for (let si = 0; si < expectedAnswers.length; si++) {
      const expected = expectedAnswers[si];
      const actual = inputSentences[si] ?? '';
      const sentDiff = checkSentence(expected, actual);
      errors.push(...classifySentenceErrors(sentDiff, { taskType }));
    }

  } else if (taskType === 'TT_7_6') {
    const opts = options as unknown as MiniTextOptions;
    const expectedAnswers = opts.expected_answers ?? [task.correct_answer];
    const inputSentences = input.inputText.split(/(?<=[.!?])\s+/);
    for (let si = 0; si < expectedAnswers.length; si++) {
      const expected = expectedAnswers[si];
      const actual = inputSentences[si] ?? '';
      const sentDiff = checkSentence(expected, actual);
      errors.push(...classifySentenceErrors(sentDiff, { taskType }));
    }

  } else if (SELF_CHECK_TYPES.has(taskType)) {
    const opts = options as unknown as SelfCheckOptions;
    const taskMetaForH4: TaskMeta = {
      taskType,
      originalAttempt: opts.original_attempt,
      revision: input.inputText,
      correctAnswer: opts.model_answer,
    };
    const sentDiff = checkSentence(opts.model_answer, input.inputText);
    errors = classifySentenceErrors(sentDiff, taskMetaForH4);
    if (
      opts.original_attempt !== opts.model_answer &&
      input.inputText !== opts.original_attempt
    ) {
      selfCorrected = true;
    }

  } else if (MATCH_TYPES.has(taskType)) {
    const opts = options as unknown as MatchPairsOptions;
    const diff = matchPairsDiff(opts.pairs, input.inputText);
    // Wrong pairs → B1 errors (each wrong pairing is a unit mismatch)
    if (!diff.isCorrect) {
      errors = diff.wrongChars.map((w, idx) => ({
        errorCode: 'B1' as const,
        severity: 2 as const,
        position: idx,
        expectedChar: w.expected,
        actualChar: w.actual,
        contextWord: w.expected,
        message: `Буруу холбосон: "${w.expected}" байх ёстой газар "${w.actual}" сонгосон`,
      }));
    }

  } else if (ASSEMBLE_TYPES.has(taskType)) {
    const opts = options as unknown as AssembleWordOptions;
    const diff = assembleWordDiff(opts.correct_order, input.inputText);
    if (!diff.isCorrect) {
      const expWord = opts.correct_order.join('');
      let submitted: string[] = [];
      try { submitted = JSON.parse(input.inputText); } catch { /* ignore */ }
      const actWord = submitted.join('') || input.inputText;
      errors = classifyWordErrors(diff, expWord, actWord, { taskType });
      // Fallback: if no specific code classified (e.g. non-confusable consonant swap),
      // produce a B3 (letter position error) since tile ordering is a transposition
      if (errors.length === 0) {
        errors.push({
          errorCode: 'B3', severity: 1, position: 0,
          expectedChar: expWord, actualChar: actWord, contextWord: expWord,
          message: `Үсгийн дараалал буруу: "${expWord}" байх ёстой газар "${actWord}" угсарсан`,
        });
      }
    }

  } else if (TAP_TYPES.has(taskType)) {
    const opts = options as unknown as TapFindErrorOptions;
    const diff = tapFindErrorDiff(opts.error_word_index, input.inputText);
    if (!diff.isCorrect) {
      // Wrong word tapped — classify as H4 (failed to identify the error)
      errors = [{
        errorCode: 'H4' as const,
        severity: 1 as const,
        position: 0,
        contextWord: opts.sentence,
        message: 'Алдаатай үгийг олж чадсангүй',
      }];
    }

  } else {
    // Correction types + copy + boundary: sentence-aware diff
    const opts = options as unknown as CorrectionOptions;
    const expected = opts.correct_text ?? task.correct_answer;
    const sentDiff = checkSentence(expected, input.inputText);
    errors = classifySentenceErrors(sentDiff, { taskType });
  }

  // 3. Calculate score, feedback, and error codes.
  //    The classifier now returns the FULL untrimmed error list. Score,
  //    errorCodes (→ skillsFromErrors), and the ErrorLog writes below all
  //    consume that full list. The cap-of-3 applies ONLY to learner feedback.
  const score = calculateScore(errors);
  const isCorrect = errors.length === 0;
  const feedbackErrors = [...errors]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, FEEDBACK_ERROR_CAP);
  const feedback = generateFeedback(feedbackErrors, task.feedback_text);
  // Dedup per attempt: Attempt.error_codes records the DISTINCT codes seen, not
  // their counts. Repeat-count multiplicity (e.g. 3×B1) is intentionally NOT
  // carried here — full multiplicity is persisted only in ErrorLog (one row per
  // detected error, written below). Downstream mastery (skill-engine) and
  // diagnostic branching read these distinct codes for analytics/priority-skill
  // membership; they do not scale mastery by error count. See updateSkillState's
  // mastery-signal model. Revisit if real data warrants count-weighted mastery.
  const errorCodes = [...new Set(errors.map((e) => e.errorCode))];

  // 4. Write to DB (if repositories provided)
  if (attemptRepo) {
    const context = input.diagnosticSessionId ? 'DIAGNOSTIC' : 'LESSON';
    const attempt = await attemptRepo.create({
      learnerId: input.learnerId,
      taskId: input.taskId,
      lessonId: input.lessonId,
      diagnosticSessionId: input.diagnosticSessionId,
      inputText: input.inputText,
      score,
      timeSeconds: input.timeSeconds,
      selfCorrected,
      errorCodes,
      context,
    });

    if (errorLogRepo && errors.length > 0) {
      await errorLogRepo.createMany({
        attemptId: attempt.id,
        errors: errors.map((e) => ({
          errorCode: e.errorCode,
          severity: e.severity,
          positionInWord: e.position,
          expectedChar: e.expectedChar,
          actualChar: e.actualChar,
          contextWord: e.contextWord || undefined,
        })),
      });
    }
  }

  return { score, isCorrect, errorCodes, errorsDetail: errors, feedback, selfCorrected };
}
