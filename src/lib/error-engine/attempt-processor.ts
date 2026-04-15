/**
 * Attempt Processor — pipeline that connects:
 *   answer-checker → error-classifier → score calculation → DB writes
 *
 * Core function: processAttempt(input) → AttemptResult
 */

import { checkAnswer, checkSentence } from './answer-checker';
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
  task_type: string;          // 'TT1_CHOICE' | 'TT2_FILL' | ... (Prisma TaskType enum)
  correct_answer: string;
  options: unknown;           // JSONB — structure varies by task_type
  feedback_text: string;
  primary_skill: string;
  error_targets: string[];
}

// ─── Task options JSONB shapes ───────────────────────────────────────────────

interface TT1Options {
  choices: { text: string; is_correct: boolean }[];
  audio_trigger?: boolean;
}

interface TT2Options {
  display_text: string;
  blank_position: number;
  blank_answer: string;
  context_word: string;
}

interface TT3Options {
  incorrect_text: string;
  correct_text: string;
  error_type: string;
  hint?: string;
}

interface TT4Options {
  audio_text: string;
  word_count: number;
  expected_answers: string[];
  allow_partial: boolean;
}

interface TT5Options {
  audio_text: string;
  sentence_count: number;
  expected_answers: string[];
}

interface TT6Options {
  original_attempt: string;
  model_answer: string;
  comparison_mode: string;
}

// ─── Repository interface (for dependency injection / testing) ───────────────

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
  C1: (e) =>
    `Урт эгшгийг анзаар. '${e.contextWord}' гэж давхар ${e.expectedChar?.[0] ?? ''}-той бичдэг.`,
  C2: (e) =>
    `Илүү эгшиг бичсэн байна. '${e.contextWord}' гэж зөвхөн нэг ${e.expectedChar ?? ''}-той.`,
  C4: (e) =>
    `Балархай эгшгийг бүү мартаарай. '${e.contextWord}' гэж ${e.expectedChar ?? ''} үсэгтэй.`,
  B1: (e) =>
    `Үсэг орхисон байна. '${e.contextWord}' гэж бүтэн бичээрэй.`,
  B3: () =>
    'Үсгийн дарааллыг анзаараарай.',
  D3: (e) =>
    `Төстэй авиаг андуурсан байна. '${e.expectedChar ?? ''}' биш '${e.actualChar ?? ''}' байх ёстой.`,
  E1: (e) =>
    `Залгавар дутуу байна. '${e.contextWord}' гэж бичнэ.`,
  E2: (e) =>
    `Буруу залгавар сонгосон. '${e.expectedChar ?? ''}' байх ёстой.`,
  E7: () =>
    'Залгавар дотор бичлэгийн алдаа байна.',
  G1: () =>
    'Эхний үсгийг том бич.',
  G2: () =>
    'Өгүүлбэрийн төгсгөлд цэг тавь.',
  H4: () =>
    'Өөрийн хариуг дахин нягтлан шалгаарай.',
};

function generateFeedback(errors: ClassifiedError[]): string {
  if (errors.length === 0) return 'Зөв бичлээ! Баяр хүргэе!';

  // Return feedback for the highest-severity error (first occurrence)
  const sorted = [...errors].sort((a, b) => b.severity - a.severity);
  const primary = sorted[0];
  const fn = FEEDBACK_MAP[primary.errorCode];
  return fn ? fn(primary) : 'Алдаа байна, дахин оролдоорой.';
}

// ─── Task type routing helpers ───────────────────────────────────────────────

function extractTaskTypeKey(taskType: string): string {
  // 'TT1_CHOICE' → 'TT1', 'TT2_FILL' → 'TT2', etc.
  return taskType.split('_')[0];
}

function processTT1(input: string, options: TT1Options): { expected: string; actual: string } {
  const correct = options.choices.find((c) => c.is_correct);
  return { expected: correct?.text ?? '', actual: input };
}

function processTT2(input: string, options: TT2Options): { expected: string; actual: string } {
  return { expected: options.blank_answer, actual: input };
}

function processTT3(input: string, options: TT3Options): { expected: string; actual: string } {
  return { expected: options.correct_text, actual: input };
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
  if (!task) {
    throw new Error(`Task not found: ${input.taskId}`);
  }

  const ttKey = extractTaskTypeKey(task.task_type);
  const options = task.options as Record<string, unknown>;
  let errors: ClassifiedError[] = [];
  let selfCorrected = false;

  // 2. Route by task type and run answer checker + error classifier
  switch (ttKey) {
    case 'TT1': {
      const { expected, actual } = processTT1(input.inputText, options as unknown as TT1Options);
      if (expected.toLowerCase() === actual.toLowerCase()) {
        // Correct choice
        errors = [];
      } else {
        // Wrong choice — run word-level diff to classify the error
        const diff = checkAnswer(expected, actual);
        errors = classifyWordErrors(diff, expected, actual);
      }
      break;
    }

    case 'TT2': {
      const tt2Opts = options as unknown as TT2Options;
      // Reconstruct the full word: replace the blank with the child's input
      const contextWord = tt2Opts.context_word;
      const pos = tt2Opts.blank_position;
      const fullActual =
        contextWord.slice(0, pos) + input.inputText + contextWord.slice(pos + tt2Opts.blank_answer.length);
      if (tt2Opts.blank_answer === input.inputText) {
        errors = [];
      } else {
        // Compare full reconstructed word against context_word
        const diff = checkAnswer(contextWord, fullActual);
        errors = classifyWordErrors(diff, contextWord, fullActual);
        // Fallback: if the fill is wrong but no specific error code was
        // classified (e.g., a substitution not matching any confusable pair),
        // produce a B1-level error so the score reflects the mistake.
        if (errors.length === 0) {
          errors.push({
            errorCode: 'B1',
            severity: 2,
            position: pos,
            expectedChar: tt2Opts.blank_answer,
            actualChar: input.inputText,
            contextWord,
            message: `Буруу үсэг бичсэн: "${tt2Opts.blank_answer}" байх ёстой газар "${input.inputText}" бичсэн`,
          });
        }
      }
      break;
    }

    case 'TT3': {
      const tt3Opts = options as unknown as TT3Options;
      const { expected, actual } = processTT3(input.inputText, tt3Opts);
      const diff = checkAnswer(expected, actual);
      errors = classifyWordErrors(diff, expected, actual);
      break;
    }

    case 'TT4': {
      const tt4Opts = options as unknown as TT4Options;
      // Single-word or sentence dictation
      const expectedAnswers = tt4Opts.expected_answers;
      if (expectedAnswers.length === 1) {
        // Single word/sentence
        const expected = expectedAnswers[0];
        if (expected.includes(' ') || expected.endsWith('.') || expected.endsWith('?') || expected.endsWith('!')) {
          // Sentence-level
          const sentDiff = checkSentence(expected, input.inputText);
          errors = classifySentenceErrors(sentDiff);
        } else {
          // Word-level
          const diff = checkAnswer(expected, input.inputText);
          errors = classifyWordErrors(diff, expected, input.inputText);
        }
      } else {
        // Multiple expected answers — check each against input sentences
        const inputSentences = input.inputText.split(/(?<=[.!?])\s+/);
        for (let si = 0; si < expectedAnswers.length; si++) {
          const expected = expectedAnswers[si];
          const actual = inputSentences[si] ?? '';
          const sentDiff = checkSentence(expected, actual);
          errors.push(...classifySentenceErrors(sentDiff));
        }
      }
      break;
    }

    case 'TT5': {
      const tt5Opts = options as unknown as TT5Options;
      const inputSentences = input.inputText.split(/(?<=[.!?])\s+/);
      for (let si = 0; si < tt5Opts.expected_answers.length; si++) {
        const expected = tt5Opts.expected_answers[si];
        const actual = inputSentences[si] ?? '';
        const sentDiff = checkSentence(expected, actual);
        errors.push(...classifySentenceErrors(sentDiff));
      }
      break;
    }

    case 'TT6': {
      const tt6Opts = options as unknown as TT6Options;
      const taskMetaForH4: TaskMeta = {
        taskType: 'TT6',
        originalAttempt: tt6Opts.original_attempt,
        revision: input.inputText,
        correctAnswer: tt6Opts.model_answer,
      };

      // Check the revision against the model answer for spelling errors
      const sentDiff = checkSentence(tt6Opts.model_answer, input.inputText);
      errors = classifySentenceErrors(sentDiff, taskMetaForH4);

      // Self-corrected if original was wrong and revision is different (attempted fix)
      if (
        tt6Opts.original_attempt !== tt6Opts.model_answer &&
        input.inputText !== tt6Opts.original_attempt
      ) {
        selfCorrected = true;
      }
      break;
    }

    default:
      throw new Error(`Unknown task type: ${task.task_type}`);
  }

  // 5. Calculate score
  const score = calculateScore(errors);
  const isCorrect = errors.length === 0;

  // 6. Generate feedback
  const feedback = generateFeedback(errors);

  const errorCodes = [...new Set(errors.map((e) => e.errorCode))];

  // 7. Write to DB (if repositories provided)
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

  // 8. Return result
  return {
    score,
    isCorrect,
    errorCodes,
    errorsDetail: errors,
    feedback,
    selfCorrected,
  };
}
