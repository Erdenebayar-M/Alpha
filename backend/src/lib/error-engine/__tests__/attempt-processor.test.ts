import {
  processAttempt,
  type AttemptInput,
  type TaskRecord,
  type TaskRepository,
  type AttemptRepository,
  type ErrorLogRepository,
} from '../attempt-processor';

// ─── Mock task repository ────────────────────────────────────────────────────

const SAMPLE_TASKS: Record<string, TaskRecord> = {
  // TT_LISTEN_CHOOSE — Choice: audio "ном", pick correct from [ном, нум, мод]
  'G12-001': {
    id: 'G12-001',
    task_type: 'TT_1_1',
    correct_answer: 'ном',
    options: {
      choices: [
        { text: 'ном', is_correct: true },
        { text: 'нум', is_correct: false },
        { text: 'мод', is_correct: false },
      ],
      audio_trigger: true,
    },
    feedback_text: 'Зөв сонслоо!',
    primary_skill: 'S1',
    error_targets: ['A2', 'D3'],
  },

  // TT_CHOOSE_CORRECT — Choice: long vowel тогоо/того/тогуу
  'G12-005': {
    id: 'G12-005',
    task_type: 'TT_2_3',
    correct_answer: 'тогоо',
    options: {
      choices: [
        { text: 'тогоо', is_correct: true },
        { text: 'того', is_correct: false },
        { text: 'тогуу', is_correct: false },
      ],
    },
    feedback_text: 'Урт эгшгийг анзаар.',
    primary_skill: 'S3',
    error_targets: ['C1'],
  },

  // TT_CHOOSE_CORRECT — Choice: сүү/су/сү
  'G12-005b': {
    id: 'G12-005b',
    task_type: 'TT_2_3',
    correct_answer: 'сүү',
    options: {
      choices: [
        { text: 'сүү', is_correct: true },
        { text: 'сү', is_correct: false },
        { text: 'су', is_correct: false },
      ],
    },
    feedback_text: 'Урт эгшгийг анзаар.',
    primary_skill: 'S3',
    error_targets: ['C1'],
  },

  // TT_LETTER_FILL — Fill: дэвт_р, blank at position 4, answer "э"
  'G12-007': {
    id: 'G12-007',
    task_type: 'TT_2_1',
    correct_answer: 'дэвтэр',
    options: {
      display_text: 'дэвт_р',
      blank_position: 4,
      blank_answer: 'э',
      context_word: 'дэвтэр',
    },
    feedback_text: 'Балархай эгшгийг бүү мартаарай.',
    primary_skill: 'S4',
    error_targets: ['C4'],
  },

  // TT_FIX_ERROR — Correction: incorrect "того", correct "тогоо"
  'G12-011': {
    id: 'G12-011',
    task_type: 'TT_8_2',
    correct_answer: 'тогоо',
    options: {
      incorrect_text: 'того',
      correct_text: 'тогоо',
      error_type: 'C1',
      hint: 'Урт эгшгийг анзаар',
    },
    feedback_text: 'Зөв заслаа!',
    primary_skill: 'S3',
    error_targets: ['C1'],
  },

  // TT_SHORT_SENTENCE_DICTATION — Dictation: sentence "Би явна."
  'G12-009': {
    id: 'G12-009',
    task_type: 'TT_7_4',
    correct_answer: 'Би явна.',
    options: {
      audio_text: 'Би явна.',
      word_count: 2,
      expected_answers: ['Би явна.'],
      allow_partial: false,
    },
    feedback_text: 'Сайн бичлээ!',
    primary_skill: 'S7',
    error_targets: ['G1', 'G2'],
  },

  // TT_SHORT_SENTENCE_DICTATION — Dictation: sentence "Бат ирлээ."
  'G12-009b': {
    id: 'G12-009b',
    task_type: 'TT_7_4',
    correct_answer: 'Бат ирлээ.',
    options: {
      audio_text: 'Бат ирлээ.',
      word_count: 2,
      expected_answers: ['Бат ирлээ.'],
      allow_partial: false,
    },
    feedback_text: 'Сайн бичлээ!',
    primary_skill: 'S7',
    error_targets: ['G1', 'G2'],
  },

  // TT_8_4 — Self-check: original "сү", model "сүү"
  'G12-012': {
    id: 'G12-012',
    task_type: 'TT_8_4',
    correct_answer: 'сүү',
    options: {
      original_attempt: 'сү',
      model_answer: 'сүү',
      comparison_mode: 'side_by_side',
    },
    feedback_text: 'Өөрийгөө шалгаарай.',
    primary_skill: 'S8',
    error_targets: ['C1'],
  },

  // TT_MATCH_PAIRS — Match pairs: letters ↔ images
  'G12-013': {
    id: 'G12-013',
    task_type: 'TT_1_3',
    correct_answer: 'pairs',
    options: {
      pairs: [
        { left: 'н', right: 'нар' },
        { left: 'м', right: 'мод' },
        { left: 'г', right: 'гэр' },
      ],
    },
    feedback_text: 'Зөв холбосон!',
    primary_skill: 'S1',
    error_targets: ['A2'],
  },

  // TT_ASSEMBLE_WORD — Assemble: [р][а][н] → нар
  'G12-014': {
    id: 'G12-014',
    task_type: 'TT_1_4',
    correct_answer: 'нар',
    options: {
      tiles: ['р', 'а', 'н'],
      correct_order: ['н', 'а', 'р'],
    },
    feedback_text: 'Үсгийн дарааллыг шалгаарай.',
    primary_skill: 'S1',
    error_targets: ['A3', 'B3'],
  },

  // TT_TAP_FIND_ERROR — Tap: find wrong word in sentence
  'G12-015': {
    id: 'G12-015',
    task_type: 'TT_8_1',
    correct_answer: '1',
    options: {
      sentence: 'Намар навч уннаа.',
      error_word_index: 2,
      correct_text: 'Намар навч унана.',
    },
    feedback_text: 'Алдаатай үгийг ол.',
    primary_skill: 'S8',
    error_targets: ['H4'],
  },

  // Word-level choice used to exercise the detect-all path: "сургуулиуд"
  // mistyped as "сргулд" yields 4 word-level errors (C1 + 3×B1).
  'G24-100': {
    id: 'G24-100',
    task_type: 'TT_2_3',
    correct_answer: 'сургуулиуд',
    options: {
      choices: [
        { text: 'сургуулиуд', is_correct: true },
        { text: 'сургууль', is_correct: false },
      ],
    },
    feedback_text: 'Дахин шалгаарай.',
    primary_skill: 'S3',
    error_targets: [],
  },
};

const mockTaskRepo: TaskRepository = {
  async findById(taskId: string) {
    return SAMPLE_TASKS[taskId] ?? null;
  },
};

// ─── Mock DB repositories ────────────────────────────────────────────────────

function createMockAttemptRepo() {
  const calls: unknown[] = [];
  const repo: AttemptRepository = {
    async create(data) {
      calls.push(data);
      return { id: 'attempt-mock-id' };
    },
  };
  return { repo, calls };
}

function createMockErrorLogRepo() {
  const calls: unknown[] = [];
  const repo: ErrorLogRepository = {
    async createMany(data) {
      calls.push(data);
    },
  };
  return { repo, calls };
}

function makeInput(taskId: string, inputText: string, overrides?: Partial<AttemptInput>): AttemptInput {
  return { learnerId: 'learner-1', taskId, inputText, timeSeconds: 10, ...overrides };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TT_LISTEN_CHOOSE / TT_CHOOSE_CORRECT — Choice
// ═══════════════════════════════════════════════════════════════════════════════

describe('Choice (TT_LISTEN_CHOOSE / TT_CHOOSE_CORRECT)', () => {
  it('correct choice "ном" → score 1.0, no errors', async () => {
    const result = await processAttempt(makeInput('G12-001', 'ном'), mockTaskRepo);
    expect(result.score).toBe(1.0);
    expect(result.isCorrect).toBe(true);
    expect(result.errorCodes).toHaveLength(0);
    expect(result.feedback).toBe('Зөв бичлээ! Баяр хүргэе!');
  });

  it('wrong choice "нум" → score 0.5, D3 error', async () => {
    const result = await processAttempt(makeInput('G12-001', 'нум'), mockTaskRepo);
    expect(result.score).toBe(0.5);
    expect(result.isCorrect).toBe(false);
    expect(result.errorCodes).toContain('D3');
  });

  it('wrong choice "того" → score 0.5, C1 error', async () => {
    const result = await processAttempt(makeInput('G12-005', 'того'), mockTaskRepo);
    expect(result.score).toBe(0.5);
    expect(result.isCorrect).toBe(false);
    expect(result.errorCodes).toContain('C1');
  });

  it('wrong choice "сү" → C1 error', async () => {
    const result = await processAttempt(makeInput('G12-005b', 'сү'), mockTaskRepo);
    expect(result.isCorrect).toBe(false);
    expect(result.errorCodes).toContain('C1');
  });

  it('correct choice "тогоо" → score 1.0', async () => {
    const result = await processAttempt(makeInput('G12-005', 'тогоо'), mockTaskRepo);
    expect(result.score).toBe(1.0);
    expect(result.isCorrect).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TT_LETTER_FILL — Fill
// ═══════════════════════════════════════════════════════════════════════════════

describe('Fill (TT_LETTER_FILL)', () => {
  it('fill "э" → score 1.0, correct', async () => {
    const result = await processAttempt(makeInput('G12-007', 'э'), mockTaskRepo);
    expect(result.score).toBe(1.0);
    expect(result.isCorrect).toBe(true);
  });

  it('fill "а" → score 0.5, wrong letter', async () => {
    const result = await processAttempt(makeInput('G12-007', 'а'), mockTaskRepo);
    expect(result.score).toBe(0.5);
    expect(result.isCorrect).toBe(false);
    expect(result.errorsDetail.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TT_FIX_ERROR — Correction
// ═══════════════════════════════════════════════════════════════════════════════

describe('Correction (TT_FIX_ERROR)', () => {
  it('"тогоо" (correct fix) → score 1.0', async () => {
    const result = await processAttempt(makeInput('G12-011', 'тогоо'), mockTaskRepo);
    expect(result.score).toBe(1.0);
    expect(result.isCorrect).toBe(true);
  });

  it('"того" (unchanged) → C1 error', async () => {
    const result = await processAttempt(makeInput('G12-011', 'того'), mockTaskRepo);
    expect(result.isCorrect).toBe(false);
    expect(result.errorCodes).toContain('C1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TT_SHORT_SENTENCE_DICTATION — Dictation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Dictation (TT_SHORT_SENTENCE_DICTATION)', () => {
  it('"Би явна." → score 1.0', async () => {
    const result = await processAttempt(makeInput('G12-009', 'Би явна.'), mockTaskRepo);
    expect(result.score).toBe(1.0);
    expect(result.isCorrect).toBe(true);
  });

  it('"бат ирлээ" vs "Бат ирлээ." → G1+G2', async () => {
    const result = await processAttempt(makeInput('G12-009b', 'бат ирлээ'), mockTaskRepo);
    expect(result.isCorrect).toBe(false);
    expect(result.errorCodes).toContain('G1');
    expect(result.errorCodes).toContain('G2');
    expect(result.score).toBe(0.75);
  });

  it('"Би явна" (missing period) → G2 only', async () => {
    const result = await processAttempt(makeInput('G12-009', 'Би явна'), mockTaskRepo);
    expect(result.errorCodes).toContain('G2');
    expect(result.errorCodes).not.toContain('G1');
    expect(result.score).toBe(0.75);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TT_8_4 — Self-check
// ═══════════════════════════════════════════════════════════════════════════════

describe('Self-check (TT_8_4)', () => {
  it('revision "сүү" (correct fix) → score 1.0, selfCorrected', async () => {
    const result = await processAttempt(makeInput('G12-012', 'сүү'), mockTaskRepo);
    expect(result.score).toBe(1.0);
    expect(result.isCorrect).toBe(true);
    expect(result.selfCorrected).toBe(true);
    expect(result.errorCodes).not.toContain('H4');
  });

  it('revision "сү" (unchanged) → H4', async () => {
    const result = await processAttempt(makeInput('G12-012', 'сү'), mockTaskRepo);
    expect(result.errorCodes).toContain('H4');
    expect(result.selfCorrected).toBe(false);
  });

  it('revision empty string → no H4 (child attempted, differs from original)', async () => {
    const result = await processAttempt(makeInput('G12-012', ''), mockTaskRepo);
    expect(result.errorCodes).not.toContain('H4');
    expect(result.selfCorrected).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TT_MATCH_PAIRS — Match pairs (new)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Match pairs (TT_MATCH_PAIRS)', () => {
  it('all pairs correct → score 1.0', async () => {
    const submitted = JSON.stringify([
      { left: 'н', right: 'нар' },
      { left: 'м', right: 'мод' },
      { left: 'г', right: 'гэр' },
    ]);
    const result = await processAttempt(makeInput('G12-013', submitted), mockTaskRepo);
    expect(result.score).toBe(1.0);
    expect(result.isCorrect).toBe(true);
  });

  it('one wrong pair → errors, score < 1.0', async () => {
    const submitted = JSON.stringify([
      { left: 'н', right: 'мод' }, // wrong
      { left: 'м', right: 'мод' },
      { left: 'г', right: 'гэр' },
    ]);
    const result = await processAttempt(makeInput('G12-013', submitted), mockTaskRepo);
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBeLessThan(1.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TT_ASSEMBLE_WORD — Assemble tiles (new)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Assemble word (TT_ASSEMBLE_WORD)', () => {
  it('correct order ["н","а","р"] → score 1.0', async () => {
    const submitted = JSON.stringify(['н', 'а', 'р']);
    const result = await processAttempt(makeInput('G12-014', submitted), mockTaskRepo);
    expect(result.score).toBe(1.0);
    expect(result.isCorrect).toBe(true);
  });

  it('wrong order ["р","а","н"] → errors', async () => {
    const submitted = JSON.stringify(['р', 'а', 'н']);
    const result = await processAttempt(makeInput('G12-014', submitted), mockTaskRepo);
    expect(result.isCorrect).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TT_TAP_FIND_ERROR — Tap to find error (new)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Tap find error (TT_TAP_FIND_ERROR)', () => {
  it('tapped correct index 2 → score 1.0', async () => {
    const result = await processAttempt(makeInput('G12-015', '2'), mockTaskRepo);
    expect(result.score).toBe(1.0);
    expect(result.isCorrect).toBe(true);
  });

  it('tapped wrong index 0 → H4 error', async () => {
    const result = await processAttempt(makeInput('G12-015', '0'), mockTaskRepo);
    expect(result.isCorrect).toBe(false);
    expect(result.errorCodes).toContain('H4');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Feedback
// ═══════════════════════════════════════════════════════════════════════════════

describe('Feedback', () => {
  it('correct answer → "Зөв бичлээ! Баяр хүргэе!"', async () => {
    const result = await processAttempt(makeInput('G12-001', 'ном'), mockTaskRepo);
    expect(result.feedback).toBe('Зөв бичлээ! Баяр хүргэе!');
  });

  it('C1 error → feedback about long vowel', async () => {
    const result = await processAttempt(makeInput('G12-005', 'того'), mockTaskRepo);
    expect(result.feedback).toContain('Урт эгшгийг анзаар');
  });

  it('D3 error → feedback about confusable sounds', async () => {
    const result = await processAttempt(makeInput('G12-001', 'нум'), mockTaskRepo);
    expect(result.feedback).toContain('Төстэй авиаг андуурсан');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DB writes
// ═══════════════════════════════════════════════════════════════════════════════

describe('DB writes', () => {
  it('creates Attempt record with correct fields', async () => {
    const { repo: attemptRepo, calls: attemptCalls } = createMockAttemptRepo();
    const { repo: errorLogRepo } = createMockErrorLogRepo();

    await processAttempt(
      makeInput('G12-001', 'нум', { lessonId: 'lesson-1' }),
      mockTaskRepo, attemptRepo, errorLogRepo,
    );

    expect(attemptCalls).toHaveLength(1);
    const call = attemptCalls[0] as Record<string, unknown>;
    expect(call.learnerId).toBe('learner-1');
    expect(call.taskId).toBe('G12-001');
    expect(call.lessonId).toBe('lesson-1');
    expect(call.inputText).toBe('нум');
    expect(call.score).toBe(0.5);
    expect(call.errorCodes).toContain('D3');
    expect(call.context).toBe('LESSON');
  });

  it('creates ErrorLog records for each error', async () => {
    const { repo: attemptRepo } = createMockAttemptRepo();
    const { repo: errorLogRepo, calls: errorCalls } = createMockErrorLogRepo();

    await processAttempt(makeInput('G12-005', 'того'), mockTaskRepo, attemptRepo, errorLogRepo);

    expect(errorCalls).toHaveLength(1);
    const call = errorCalls[0] as Record<string, unknown>;
    expect(call).toHaveProperty('attemptId', 'attempt-mock-id');
    const errors = call.errors as Array<Record<string, unknown>>;
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].errorCode).toBe('C1');
  });

  it('sets context to DIAGNOSTIC when diagnosticSessionId provided', async () => {
    const { repo: attemptRepo, calls } = createMockAttemptRepo();
    await processAttempt(
      makeInput('G12-001', 'ном', { diagnosticSessionId: 'diag-1' }),
      mockTaskRepo, attemptRepo,
    );
    const call = calls[0] as Record<string, unknown>;
    expect(call.context).toBe('DIAGNOSTIC');
  });

  it('does not write to DB when repos not provided', async () => {
    const result = await processAttempt(makeInput('G12-001', 'нум'), mockTaskRepo);
    expect(result.score).toBe(0.5);
  });

  it('skips ErrorLog when no errors', async () => {
    const { repo: attemptRepo } = createMockAttemptRepo();
    const { repo: errorLogRepo, calls: errorCalls } = createMockErrorLogRepo();
    await processAttempt(makeInput('G12-001', 'ном'), mockTaskRepo, attemptRepo, errorLogRepo);
    expect(errorCalls).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Error handling
// ═══════════════════════════════════════════════════════════════════════════════

describe('Error handling', () => {
  it('throws when task not found', async () => {
    await expect(
      processAttempt(makeInput('NONEXISTENT', 'x'), mockTaskRepo),
    ).rejects.toThrow('Task not found');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Detect-all wiring — full error list flows to score, errorCodes, and ErrorLog;
// the cap-of-3 applies ONLY to learner-facing feedback.
// ═══════════════════════════════════════════════════════════════════════════════

describe('Detect-all wiring (cap only in feedback)', () => {
  it('writes the FULL untrimmed error list to ErrorLog and Attempt.errorCodes', async () => {
    const { repo: attemptRepo, calls: attemptCalls } = createMockAttemptRepo();
    const { repo: errorLogRepo, calls: errorLogCalls } = createMockErrorLogRepo();

    // "сургуулиуд" → "сргулд" classifies to 4 errors (C1 + 3×B1).
    const result = await processAttempt(
      makeInput('G24-100', 'сргулд'),
      mockTaskRepo,
      attemptRepo,
      errorLogRepo,
    );

    // AttemptResult exposes the full detail list (not capped to 3).
    expect(result.errorsDetail).toHaveLength(4);

    // ErrorLog receives every detected error.
    const logged = (errorLogCalls[0] as { errors: unknown[] }).errors;
    expect(logged).toHaveLength(4);

    // Attempt.errorCodes carries the full (deduped) code set → skillsFromErrors.
    const stored = (attemptCalls[0] as { errorCodes: string[] }).errorCodes;
    expect(stored).toEqual(['C1', 'B1']);

    // Score reflects the full list of severity-2 errors (4 → 0.25), not a cap.
    expect(result.score).toBe(0.25);

    // Feedback still resolves to a single, non-empty learner message.
    expect(typeof result.feedback).toBe('string');
    expect(result.feedback.length).toBeGreaterThan(0);
  });
});
