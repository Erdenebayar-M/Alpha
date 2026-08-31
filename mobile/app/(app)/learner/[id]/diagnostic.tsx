import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PressableScale from '@/src/components/PressableScale';
import { ApiError } from '@/src/api/client';
import type { DiagnosticResult } from '@/src/api/diagnostic';
import { useStartDiagnostic, useSubmitDiagnostic } from '@/src/features/diagnostic/useDiagnostic';
import { ChevronLeftIcon } from '@/src/features/exercise/components/icons';
import ExerciseEngine from '@/src/features/exercise/ExerciseEngine';
import type { Task } from '@/src/features/exercise/types';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; canRetry: boolean }
  | { kind: 'running'; sessionId: string; task: Task; itemNumber: number }
  | { kind: 'done'; result: DiagnosticResult };

export default function DiagnosticScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Always returns to the learner menu (not just one step back) — swiping from the
  // screen's left edge is the gesture for a plain one-step pop instead.
  const goBack = () => {
    router.replace(`/learner/${id}`);
  };

  const startDiagnostic = useStartDiagnostic();
  const submitDiagnostic = useSubmitDiagnostic();

  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [taskStartedAt, setTaskStartedAt] = useState(() => Date.now());
  const startedRef = useRef(false);

  // Kick off the session exactly once when the screen mounts.
  useEffect(() => {
    if (startedRef.current || !id) return;
    startedRef.current = true;
    (async () => {
      try {
        const res = await startDiagnostic.mutateAsync(id);
        setTaskStartedAt(Date.now());
        setPhase({ kind: 'running', sessionId: res.session_id, task: res.task, itemNumber: res.item_number });
      } catch (err) {
        setPhase({ kind: 'error', ...describeStartError(err) });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleResult = async (isCorrect: boolean, inputText: string) => {
    if (phase.kind !== 'running') return;
    const { sessionId, task } = phase;

    try {
      const res = await submitDiagnostic.mutateAsync({
        session_id: sessionId,
        task_id: task.id,
        // The backend requires a non-empty input_text and re-scores/classifies errors
        // from it server-side; renderers always produce a non-empty answer, but guard
        // against a stray blank so submission never 400s.
        input_text: inputText.length > 0 ? inputText : '✗',
        time_seconds: Math.round((Date.now() - taskStartedAt) / 1000),
      });

      if (res.completed) {
        setPhase({ kind: 'done', result: res.result });
      } else {
        setTaskStartedAt(Date.now());
        setPhase({ kind: 'running', sessionId, task: res.next_task, itemNumber: res.item_number });
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Сүлжээний алдаа гарлаа. Дахин оролдоно уу.';
      setPhase({ kind: 'error', message, canRetry: false });
    }
  };

  if (phase.kind === 'loading') {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.progressFill} />
        <Text style={styles.message}>Онош бэлдэж байна…</Text>
      </SafeAreaView>
    );
  }

  if (phase.kind === 'error') {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <Text style={styles.message}>{phase.message}</Text>
        <PressableScale style={styles.primaryButton} onPress={() => router.replace(`/learner/${id}/dashboard`)}>
          <Text style={styles.primaryButtonText}>Ахиц харах</Text>
        </PressableScale>
        <PressableScale style={styles.linkButton} onPress={goBack}>
          <Text style={styles.linkText}>Буцах</Text>
        </PressableScale>
      </SafeAreaView>
    );
  }

  if (phase.kind === 'done') {
    const { result } = phase;
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <Text style={styles.celebration}>Онош дууслаа! 🎉</Text>
        <Text style={styles.levelBadge}>Түвшин: {result.general_level}</Text>
        {result.priority_skills.length > 0 ? (
          <Text style={styles.message}>
            Анхаарах чадвар: {result.priority_skills.join(', ')}
          </Text>
        ) : null}
        <Text style={styles.message}>
          Өдрийн дасгал: ~{result.recommended_daily_minutes} мин
        </Text>
        <PressableScale style={styles.primaryButton} onPress={() => router.replace(`/learner/${id}/dashboard`)}>
          <Text style={styles.primaryButtonText}>Ахиц харах</Text>
        </PressableScale>
      </SafeAreaView>
    );
  }

  // running
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <PressableScale style={styles.backButton} hitSlop={10} onPress={goBack} accessibilityLabel="Back">
          <ChevronLeftIcon />
        </PressableScale>
        <Text style={styles.itemCount}>Асуулт {phase.itemNumber}</Text>
        <View style={styles.backButton} />
      </View>
      <ExerciseEngine key={phase.task.id} task={phase.task} onResult={handleResult} />
    </SafeAreaView>
  );
}

function describeStartError(err: unknown): { message: string; canRetry: boolean } {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return { message: 'Энэ сурагч онош аль хэдийн өгсөн байна.', canRetry: false };
    }
    if (err.status === 422) {
      return { message: 'Энэ ангийн онош одоогоор бэлэн болоогүй байна.', canRetry: false };
    }
    return { message: err.message, canRetry: false };
  }
  return { message: 'Сүлжээний алдаа гарлаа. Дахин оролдоно уу.', canRetry: true };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 44,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backButtonBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCount: {
    fontFamily: fonts.extrabold,
    fontSize: 15,
    color: colors.progressText,
  },
  celebration: {
    fontFamily: fonts.black,
    fontSize: 26,
    color: colors.textNavy,
    textAlign: 'center',
  },
  levelBadge: {
    fontFamily: fonts.black,
    fontSize: 20,
    color: colors.textChoice,
  },
  message: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.textNavy,
    textAlign: 'center',
  },
  primaryButton: {
    minWidth: 200,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.white,
  },
  linkButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.primaryBlue,
  },
});
