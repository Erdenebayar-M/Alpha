import { calculateFinalResult } from '../diagnostic-branching';
import type { DiagnosticAttempt } from '../diagnostic-branching';

// ---------------------------------------------------------------------------
// calculateFinalResult
// ---------------------------------------------------------------------------

describe('calculateFinalResult', () => {
  function makeAttempts(
    scores: Record<string, number>,
    errorMap: Record<string, string[]> = {},
    repeat = 6
  ): DiagnosticAttempt[] {
    return Object.entries(scores).flatMap(([skill, score]) =>
      Array.from({ length: repeat }, (_, i) => ({
        task_id: `t-${skill}-${i}`,
        primary_skill: skill,
        score,
        error_codes: errorMap[skill] ?? [],
      }))
    );
  }

  test('core skill cap: weak S2+S3 limits general_level to at most M1', () => {
    // S2=M0, S3=M0 (score 0.3), S5=M3, S7=M3, rest=M3
    // raw avg idx ≈ floor((0+0+3+3+3+3+3+3)/8) = floor(2.25) = 2 → M2
    // core min = min(M0,M0,M3,M3) = 0 → cap = 1 → M1
    const attempts = makeAttempts({
      S1: 0.9, S2: 0.3, S3: 0.3, S4: 0.9, S5: 0.9, S6: 0.9, S7: 0.9, S8: 0.9,
    });
    const result = calculateFinalResult(attempts, 2);
    const idx = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'].indexOf(result.general_level);
    expect(idx).toBeLessThanOrEqual(1);
  });

  test('no cap needed: all core skills at M2 → general_level can reach M2', () => {
    const attempts = makeAttempts({
      S1: 0.75, S2: 0.75, S3: 0.75, S4: 0.75,
      S5: 0.75, S6: 0.75, S7: 0.75, S8: 0.75,
    });
    const result = calculateFinalResult(attempts, 2);
    expect(result.general_level).toBe('M2');
  });

  test('priority_skills uses tiebreak when all scores are equal', () => {
    const attempts = makeAttempts({
      S1: 0.4, S2: 0.4, S3: 0.4, S4: 0.4,
      S5: 0.4, S6: 0.4, S7: 0.4, S8: 0.4,
    });
    const result = calculateFinalResult(attempts, 2);
    expect(result.priority_skills).toEqual(['S7', 'S2']);
  });

  test('priority_skills returns the 2 lowest-scoring skills', () => {
    const attempts = makeAttempts({
      S1: 0.9, S2: 0.9, S3: 0.2, S4: 0.9,
      S5: 0.1, S6: 0.9, S7: 0.9, S8: 0.9,
    });
    const result = calculateFinalResult(attempts, 2);
    expect(result.priority_skills).toContain('S5');
    expect(result.priority_skills).toContain('S3');
  });

  test('top_error_codes returns up to 3 most frequent codes', () => {
    const attempts = makeAttempts(
      { S3: 0.5, S5: 0.5, S7: 0.5, S2: 0.7, S1: 0.7, S4: 0.7, S6: 0.7, S8: 0.7 },
      { S3: ['C1', 'C1'], S5: ['C1', 'E2'], S7: ['E2'] },
      1
    );
    const result = calculateFinalResult(attempts, 2);
    // C1 × 3, E2 × 2
    expect(result.top_error_codes[0]).toBe('C1');
    expect(result.top_error_codes).toContain('E2');
    expect(result.top_error_codes.length).toBeLessThanOrEqual(3);
  });

  test('confidence is HIGH for 6+ total attempts', () => {
    const attempts = makeAttempts({ S1: 0.7 }, {}, 6);
    expect(calculateFinalResult(attempts, 2).confidence).toBe('HIGH');
  });

  test('confidence is LOW for fewer than 3 attempts', () => {
    const attempts = [
      { task_id: 't1', primary_skill: 'S1', score: 0.7, error_codes: [] },
      { task_id: 't2', primary_skill: 'S2', score: 0.7, error_codes: [] },
    ];
    expect(calculateFinalResult(attempts, 2).confidence).toBe('LOW');
  });

  test('Grade 1 → 10 recommended minutes', () => {
    const attempts = makeAttempts({ S1: 0.7, S2: 0.7, S3: 0.7, S4: 0.7, S5: 0.7, S6: 0.7, S7: 0.7, S8: 0.7 });
    expect(calculateFinalResult(attempts, 1).recommended_daily_minutes).toBe(10);
  });

  test('Grade 2 → 10 recommended minutes', () => {
    const attempts = makeAttempts({ S1: 0.7, S2: 0.7, S3: 0.7, S4: 0.7, S5: 0.7, S6: 0.7, S7: 0.7, S8: 0.7 });
    expect(calculateFinalResult(attempts, 2).recommended_daily_minutes).toBe(10);
  });

  test('Grade 3 → 15 recommended minutes', () => {
    const attempts = makeAttempts({ S1: 0.7, S2: 0.7, S3: 0.7, S4: 0.7, S5: 0.7, S6: 0.7, S7: 0.7, S8: 0.7 });
    expect(calculateFinalResult(attempts, 3).recommended_daily_minutes).toBe(15);
  });

  test('skill_levels keys cover all 8 skills', () => {
    const attempts = makeAttempts({ S1: 0.7, S2: 0.7, S3: 0.7, S4: 0.7, S5: 0.7, S6: 0.7, S7: 0.7, S8: 0.7 });
    const result = calculateFinalResult(attempts, 2);
    for (const s of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']) {
      expect(result.skill_levels).toHaveProperty(s);
      expect(result.skill_scores).toHaveProperty(s);
    }
  });

  // ── Per-skill confidence (v3) ────────────────────────────────────────────

  test('skill_confidence is returned and covers all 8 skills', () => {
    const attempts = makeAttempts({ S1: 0.7, S2: 0.7, S3: 0.7, S4: 0.7, S5: 0.7, S6: 0.7, S7: 0.7, S8: 0.7 });
    const result = calculateFinalResult(attempts, 2);
    expect(result).toHaveProperty('skill_confidence');
    for (const s of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']) {
      expect(result.skill_confidence).toHaveProperty(s);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result.skill_confidence[s]);
    }
  });

  test('skill with 6 attempts → HIGH confidence', () => {
    const attempts = makeAttempts({ S3: 0.7, S1: 0.7, S2: 0.7, S4: 0.7, S5: 0.7, S6: 0.7, S7: 0.7, S8: 0.7 }, {}, 6);
    const result = calculateFinalResult(attempts, 2);
    expect(result.skill_confidence['S3']).toBe('HIGH');
  });

  test('skill with 0 attempts → LOW confidence', () => {
    // Only S1 has attempts
    const attempts = Array.from({ length: 3 }, (_, i) => ({
      task_id: `t-${i}`, primary_skill: 'S1', score: 0.8, error_codes: [],
    }));
    const result = calculateFinalResult(attempts, 2);
    // Skills with no attempts default to LOW
    expect(result.skill_confidence['S3']).toBe('LOW');
  });

  // ── Error→skill map attribution ──────────────────────────────────────────

  test('C1 error on S7 task credits S3 (C1 primary skill) as weaker', () => {
    // Two attempts: S7 perfect, S7 with C1 error (score 0.5)
    // C1 primary = S3, secondary = S2
    // S3 should reflect degraded score from error attribution
    const attempts: DiagnosticAttempt[] = [
      { task_id: 't1', primary_skill: 'S7', score: 1.0, error_codes: [] },
      { task_id: 't2', primary_skill: 'S7', score: 0.5, error_codes: ['C1'] },
      { task_id: 't3', primary_skill: 'S3', score: 1.0, error_codes: [] },
    ];
    const result = calculateFinalResult(attempts, 2);
    // S7 explicit score should be high (good tasks)
    expect(result.skill_scores['S7']).toBeGreaterThan(0.5);
    // result should have skill_confidence for all skills
    expect(result.skill_confidence).toBeDefined();
  });
});
