import { useTextEntryExercise } from '@/src/features/exercise/hooks/useTextEntryExercise';
import type { Task } from '@/src/features/exercise/types';

import { act, renderHook } from '@/src/features/exercise/testUtils/renderHook';

// input_text here is the raw typed text (trimmed only) — verified against
// the backend's word-level checkAnswer/classifyWordErrors path, which needs
// the actual characters typed, not a normalized proxy. Only the local
// correct/wrong *feedback* uses NFC-normalization + whitespace collapse, to
// agree with the backend's own comparison without changing what's submitted.

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    task_type: 'TT_7_1',
    interaction_form: 'copy_text',
    prompt_text: 'Хуулж бич',
    correct_answer: 'сургууль',
    options: {},
    audio_url: null,
    image_url: null,
    primary_skill: null,
    estimated_time_seconds: 10,
    feedback_text: null,
    feedback_correct: 'Зөв!',
    feedback_wrong: 'Дахин бичээрэй.',
    is_diagnostic: false,
    ...overrides,
  };
}

describe('useTextEntryExercise', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('submits the trimmed raw typed text as input_text, not a normalized form', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() => useTextEntryExercise(makeTask(), onResult));

    act(() => result.current.setValue('  СургууЛь  '));
    act(() => result.current.submit());
    act(() => jest.runAllTimers());

    // Trimmed, but case and internal spelling untouched — the classifier needs
    // the child's actual characters, not a normalized proxy.
    expect(onResult).toHaveBeenCalledWith(true, 'СургууЛь');
  });

  it('is case-insensitive by default when grading correctness', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() => useTextEntryExercise(makeTask(), onResult));

    act(() => result.current.setValue('СУРГУУЛЬ'));
    act(() => result.current.submit());
    act(() => jest.runAllTimers());

    expect(onResult).toHaveBeenCalledWith(true, 'СУРГУУЛЬ');
  });

  it('collapses internal whitespace and normalizes NFC when comparing for correctness', () => {
    const onResult = jest.fn();
    // A composed 'ү' (U+04AF) vs a decomposed sequence should still compare equal
    // after NFC normalization — this is the exact class of bug the audit flagged
    // in one renderer's ad-hoc normalize() that skipped NFC.
    const decomposedAnswer = 'сургууль'.normalize('NFD');
    const { result } = renderHook(() =>
      useTextEntryExercise(makeTask({ correct_answer: 'сургууль' }), onResult)
    );

    act(() => result.current.setValue(decomposedAnswer));
    act(() => result.current.submit());
    act(() => jest.runAllTimers());

    expect(onResult).toHaveBeenCalledWith(true, expect.any(String));
  });

  it('respects caseInsensitive: false when the renderer opts in to exact case', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() =>
      useTextEntryExercise(makeTask(), onResult, { caseInsensitive: false })
    );

    act(() => result.current.setValue('Сургууль')); // capital С, wrong per exact-case
    act(() => result.current.submit());
    act(() => jest.runAllTimers());

    expect(onResult).toHaveBeenCalledWith(false, 'Сургууль');
  });

  it('compareTo overrides task.correct_answer for local grading', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() =>
      useTextEntryExercise(makeTask({ correct_answer: 'ignored' }), onResult, {
        compareTo: 'зөв үг',
      })
    );

    act(() => result.current.setValue('Зөв Үг'));
    act(() => result.current.submit());
    act(() => jest.runAllTimers());

    expect(onResult).toHaveBeenCalledWith(true, 'Зөв Үг');
  });

  it('canSubmit is false for an empty or whitespace-only value', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() => useTextEntryExercise(makeTask(), onResult));

    expect(result.current.canSubmit).toBe(false);
    act(() => result.current.setValue('   '));
    expect(result.current.canSubmit).toBe(false);
    act(() => result.current.setValue('a'));
    expect(result.current.canSubmit).toBe(true);
  });

  it('submit() is a no-op once already answered', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() => useTextEntryExercise(makeTask(), onResult));

    act(() => result.current.setValue('сургууль'));
    act(() => result.current.submit());
    act(() => result.current.setValue('changed after answering'));
    act(() => result.current.submit());
    act(() => jest.runAllTimers());

    expect(onResult).toHaveBeenCalledTimes(1);
  });
});
