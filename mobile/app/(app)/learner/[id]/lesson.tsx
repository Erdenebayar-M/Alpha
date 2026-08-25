import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LessonHeader from '@/src/components/LessonHeader';
import ExerciseEngine from '@/src/features/exercise/ExerciseEngine';
import OnboardingCarousel from '@/src/features/onboarding/OnboardingCarousel';
import { useCompleteLesson, useGetTodayLesson, useSubmitAttempt } from '@/src/features/lesson/useLesson';
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
  // The onboarding carousel opens today's lesson. It renders ahead of the loading
  // and error branches so its entrance plays while /lesson/today is still in flight.
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    setTaskStartedAt(Date.now());
  }, [taskIndex]);

  const tasks = data?.lesson.tasks ?? [];
  const currentTask = tasks[taskIndex];

  const handleResult = async (isCorrect: boolean, inputText: string) => {
    if (isCorrect) {
      setCorrectCount((count) => count + 1);
    }

    if (data?.lesson && currentTask) {
      try {
        await submitAttempt.mutateAsync({
          lesson_id: data.lesson.id,
          task_id: currentTask.id,
          // The backend requires a non-empty input_text and classifies errors from
          // it server-side; guard against a stray blank so submission never 400s.
          input_text: inputText.length > 0 ? inputText : '✗',
          time_seconds: Math.round((Date.now() - taskStartedAt) / 1000),
        });
      } catch {
        // best-effort; local lesson progress still advances
      }
    }

    const nextIndex = taskIndex + 1;
    if (nextIndex >= tasks.length) {
      if (data?.lesson) {
        try {
          await completeLesson.mutateAsync(data.lesson.id);
        } catch {
          // best-effort
        }
      }
      setIsFinished(true);
    } else {
      setTaskIndex(nextIndex);
    }
  };

  if (showIntro) {
    return <OnboardingCarousel onDone={() => setShowIntro(false)} />;
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
        <Text style={styles.message}>No lesson available right now.</Text>
      </SafeAreaView>
    );
  }

  if (isFinished) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.celebration}>Lesson complete! 🎉</Text>
        <Text style={styles.message}>
          {correctCount} / {tasks.length} correct
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <LessonHeader current={taskIndex + 1} total={tasks.length} onBack={handleBack} />
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
});
