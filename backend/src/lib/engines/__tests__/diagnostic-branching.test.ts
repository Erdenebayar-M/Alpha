import { identifyWeakSkills, calculateFinalResult } from '../diagnostic-branching';
import type { PhaseAAttempt, DiagnosticAttempt } from '../diagnostic-branching';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function attempt(
  skill: string,
  score: number,
  errorCodes: string[] = []
): PhaseAAttempt {
  return { task_id: `t-${skill}`, primary_skill: skill, score, error_codes: errorCodes };
}

function allSkillAttempts(score: number): PhaseAAttempt[] {
  return ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map((s) =>
    attempt(s, score)
  );
}

// ---------------------------------------------------------------------------
// identifyWeakSkills
// ---------------------------------------------------------------------------

describe('identifyWeakSkills', () => {
  test('all skills equally weak → tiebreak picks S7 then S2', () => {
    const result = identifyWeakSkills(allSkillAttempts(0.4));
    expect(result).toEqual(['S7', 'S2']);
  });

  test('S3 and S5 weak when they are the only skills below 0.6', () => {
    const attempts = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map((s) =>
      attempt(s, s === 'S3' || s === 'S5' ? 0.4 : 0.8)
    );
    expect(identifyWeakSkills(attempts)).toEqual(['S3', 'S5']);
  });

  test('returns at most 2 skills even when many are weak', () => {
    expect(identifyWeakSkills(allSkillAttempts(0.3))).toHaveLength(2);
  });

  test('no weak skills → empty array', () => {
    expect(identifyWeakSkills(allSkillAttempts(0.9))).toEqual([]);
  });

  test('exactly on the 0.60 boundary is not weak (developing)', () => {
    const attempts = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map((s) =>
      attempt(s, 0.6)
    );
    expect(identifyWeakSkills(attempts)).toEqual([]);
  });

  test('skill with no attempts is not considered weak', () => {
    // Only S3 and S5 have attempts, both weak
    const attempts = [attempt('S3', 0.3), attempt('S5', 0.3)];
    const result = identifyWeakSkills(attempts);
    expect(result).toEqual(['S3', 'S5']);
    // S7 and S2 have no attempts, must not appear
    expect(result).not.toContain('S7');
    expect(result).not.toContain('S2');
  });

  test('tiebreak: S7 beats S2 beats S3 beats S5', () => {
    // S7, S2, S3, S5 all weak — only 2 slots → S7 and S2
    const attempts = ['S7', 'S2', 'S3', 'S5'].map((s) => attempt(s, 0.4));
    expect(identifyWeakSkills(attempts)).toEqual(['S7', 'S2']);
  });

  test('averages multiple attempts for the same skill', () => {
    // S3 has two attempts: 0.3 + 0.9 → avg 0.6 = developing, not weak
    // S5 has one attempt: 0.4 → weak
    const attempts = [
      attempt('S3', 0.3),
      attempt('S3', 0.9),
      attempt('S5', 0.4),
    ];
    const result = identifyWeakSkills(attempts);
    expect(result).toEqual(['S5']);
    expect(result).not.toContain('S3');
  });
});

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
});
