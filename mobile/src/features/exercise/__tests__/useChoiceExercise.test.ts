import { act, renderHook } from '@/src/features/exercise/testUtils/renderHook';

import { useChoiceExercise } from '@/src/features/exercise/hooks/useChoiceExercise';
import type { Task } from '@/src/features/exercise/types';

// The onResult(isCorrect, inputText) contract is what the backend's
// attempt-processor grades against (verified in the mobile audit against
// attempt-processor.ts's CHOICE_TYPES branch: expected text comes from the
// selected choice's own text, matched exactly). A regression here changes
// what every choice-based renderer (8 of them) reports as answered.

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    task_type: 'TT_1_1',
    interaction_form: 'multiple_choice',
    prompt_text: 'Аль нь зөв бэ?',
    correct_answer: 'а',
    options: {
      choices: [
        { text: 'а', is_correct: true },
        { text: 'б', is_correct: false },
        { text: 'в', is_correct: false },
      ],
    },
    audio_url: null,
    image_url: null,
    primary_skill: null,
    estimated_time_seconds: 10,
    feedback_text: null,
    feedback_correct: 'Зөв байна!',
    feedback_wrong: 'Дахин оролдоорой.',
    is_diagnostic: false,
    ...overrides,
  };
}

describe('useChoiceExercise', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('submit() reports the correct choice text and isCorrect=true', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() => useChoiceExercise(makeTask(), onResult));

    act(() => result.current.select(0)); // the correct choice
    act(() => result.current.submit());
    act(() => jest.runAllTimers());

    expect(onResult).toHaveBeenCalledWith(true, 'а');
  });

  it('submit() reports the wrong choice text and isCorrect=false', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() => useChoiceExercise(makeTask(), onResult));

    act(() => result.current.select(1)); // 'б', wrong
    act(() => result.current.submit());
    act(() => jest.runAllTimers());

    expect(onResult).toHaveBeenCalledWith(false, 'б');
  });

  it('autoSubmit commits on select without a separate submit() call', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() =>
      useChoiceExercise(makeTask(), onResult, { autoSubmit: true })
    );

    act(() => result.current.select(0));
    expect(result.current.isAnswered).toBe(true);
    act(() => jest.runAllTimers());

    expect(onResult).toHaveBeenCalledWith(true, 'а');
  });

  it('a second select() after answering is ignored (one attempt per task)', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() =>
      useChoiceExercise(makeTask(), onResult, { autoSubmit: true })
    );

    act(() => result.current.select(0)); // correct
    act(() => result.current.select(1)); // should be a no-op — already answered
    act(() => jest.runAllTimers());

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(true, 'а');
  });

  it('holds a wrong answer on screen longer than a correct one (AGENTS §8 gentle failure)', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() => useChoiceExercise(makeTask(), onResult));

    act(() => result.current.select(1)); // wrong
    act(() => result.current.submit());
    act(() => jest.advanceTimersByTime(350)); // the correct-answer delay
    expect(onResult).not.toHaveBeenCalled(); // still reading feedback_wrong

    act(() => jest.advanceTimersByTime(1200 - 350));
    expect(onResult).toHaveBeenCalledWith(false, 'б');
  });

  it('diagnostic tasks advance quickly regardless of correctness', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() =>
      useChoiceExercise(makeTask({ is_diagnostic: true }), onResult)
    );

    act(() => result.current.select(1)); // wrong, but diagnostic — no feedback shown
    act(() => result.current.submit());
    act(() => jest.advanceTimersByTime(300));

    expect(onResult).toHaveBeenCalledWith(false, 'б');
  });

  it('canSubmit is false until a choice is selected, then true until answered', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() => useChoiceExercise(makeTask(), onResult));

    expect(result.current.canSubmit).toBe(false);
    act(() => result.current.select(0));
    expect(result.current.canSubmit).toBe(true);
    act(() => result.current.submit());
    expect(result.current.canSubmit).toBe(false);
  });
});
