import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LessonHeader from '@/src/components/LessonHeader';
import ExerciseEngine from '@/src/features/exercise/ExerciseEngine';
import {
  useCompleteLesson,
  useGetTodayLesson,
  useSubmitAttempt,
  type SubmitAttemptInput,
} from '@/src/features/lesson/useLesson';
import { isOnboardingComplete } from '@/src/lib/onboardingStore';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const handleBack = () => {
  if (router.canGoBack()) {
    router.back();
  }
};

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useGetTodayLesson(id);
  const submitAttempt = useSubmitAttempt();
  const completeLesson = useCompleteLesson();

  const [taskIndex, setTaskIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [taskStartedAt, setTaskStartedAt] = useState(() => Date.now());
  // Attempts/completions that failed to reach the server. Kept visible (not
  // silently discarded) with a retry, but never block the lesson from
  // advancing — a network hiccup shouldn't strand a child mid-lesson.
  const [pendingAttempts, setPendingAttempts] = useState<SubmitAttemptInput[]>([]);
  const [completeFailed, setCompleteFailed] = useState(false);
  // Whether this learner still needs app/(onboarding)/[id] before their first
  // lesson. null = not checked yet (don't render either branch until we know).
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    isOnboardingComplete(id).then((done) => {
      if (!cancelled) setNeedsOnboarding(!done);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    // Date.now() is impure, so it can't be read as a pure render-phase derivation —
    // this reset genuinely needs the effect, unlike the render-phase pattern used
    // elsewhere (e.g. useKeyboardStableHeight) for similarly-shaped resets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTaskStartedAt(Date.now());
  }, [taskIndex]);

  const tasks = data?.lesson.tasks ?? [];
  const currentTask = tasks[taskIndex];

  const handleResult = (isCorrect: boolean, inputText: string) => {
    if (isCorrect) {
      setCorrectCount((count) => count + 1);
    }

    if (data?.lesson && currentTask) {
      const attempt: SubmitAttemptInput = {
        lesson_id: data.lesson.id,
        task_id: currentTask.id,
        // The backend requires a non-empty input_text and classifies errors from
        // it server-side; guard against a stray blank so submission never 400s.
        input_text: inputText.length > 0 ? inputText : '✗',
        time_seconds: Math.round((Date.now() - taskStartedAt) / 1000),
      };
      // Fire-and-forget: the response isn't used for anything on screen, so don't
      // block advancing to the next task on the round-trip. Queue it on failure —
      // the banner below offers a real retry instead of the server silently never
      // learning this attempt happened.
      submitAttempt.mutate(attempt, {
        onError: () => setPendingAttempts((prev) => [...prev, attempt]),
      });
    }

    const nextIndex = taskIndex + 1;
    if (nextIndex >= tasks.length) {
      if (data?.lesson) {
        completeLesson.mutate(data.lesson.id, {
          onSuccess: () => setCompleteFailed(false),
          onError: () => setCompleteFailed(true),
        });
      }
      setIsFinished(true);
    } else {
      setTaskIndex(nextIndex);
    }
  };

  const retryPendingAttempts = useCallback(async () => {
    const attempts = pendingAttempts;
    setPendingAttempts([]);
    const stillFailing: SubmitAttemptInput[] = [];
    for (const attempt of attempts) {
      try {
        await submitAttempt.mutateAsync(attempt);
      } catch {
        stillFailing.push(attempt);
      }
    }
    if (stillFailing.length > 0) {
      setPendingAttempts(stillFailing);
    }
  }, [pendingAttempts, submitAttempt]);

  const retryComplete = useCallback(async () => {
    if (!data?.lesson) return;
    try {
      await completeLesson.mutateAsync(data.lesson.id);
      setCompleteFailed(false);
    } catch {
      setCompleteFailed(true);
    }
  }, [data, completeLesson]);

  if (needsOnboarding === null) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.progressFill} />
      </SafeAreaView>
    );
  }

  if (needsOnboarding) {
    return <Redirect href={`/onboarding/${id}`} />;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.progressFill} />
      </SafeAreaView>
    );
  }

  if (isError || tasks.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.message}>Одоогоор хичээл алга байна.</Text>
      </SafeAreaView>
    );
  }

  if (isFinished) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.celebration}>Хичээл дууслаа! 🎉</Text>
        <Text style={styles.message}>
          {correctCount} / {tasks.length} зөв
        </Text>
        {completeFailed && (
          <View style={styles.syncBanner}>
            <Text style={styles.syncBannerText}>Ахиц хадгалагдсангүй.</Text>
            <Pressable onPress={retryComplete} hitSlop={8}>
              <Text style={styles.syncBannerRetry}>Дахин оролдох</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <LessonHeader current={taskIndex + 1} total={tasks.length} onBack={handleBack} />
      {pendingAttempts.length > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>
            {pendingAttempts.length} дасгалын ахиц хадгалагдсангүй.
          </Text>
          <Pressable onPress={retryPendingAttempts} hitSlop={8}>
            <Text style={styles.syncBannerRetry}>Дахин оролдох</Text>
          </Pressable>
        </View>
      )}
      <ExerciseEngine key={currentTask.id} task={currentTask} onResult={handleResult} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  celebration: {
    fontFamily: fonts.black,
    fontSize: 28,
    color: colors.textNavy,
  },
  message: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.textNavy,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FDF1F1',
  },
  syncBannerText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textNavy,
  },
  syncBannerRetry: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.progressText,
    textDecorationLine: 'underline',
  },
});
