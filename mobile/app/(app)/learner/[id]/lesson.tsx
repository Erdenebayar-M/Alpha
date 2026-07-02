import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import ExerciseEngine from '@/src/features/exercise/ExerciseEngine';
import { useCompleteLesson, useGetTodayLesson, useSubmitAttempt } from '@/src/features/lesson/useLesson';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useGetTodayLesson(id);
  const submitAttempt = useSubmitAttempt();
  const completeLesson = useCompleteLesson();

  const [taskIndex, setTaskIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [taskStartedAt, setTaskStartedAt] = useState(() => Date.now());

  useEffect(() => {
    setTaskStartedAt(Date.now());
  }, [taskIndex]);

  const tasks = data?.lesson.tasks ?? [];
  const currentTask = tasks[taskIndex];

  const handleResult = async (isCorrect: boolean) => {
    if (isCorrect) {
      setCorrectCount((count) => count + 1);
    }

    if (data?.lesson && currentTask) {
      try {
        await submitAttempt.mutateAsync({
          lesson_id: data.lesson.id,
          task_id: currentTask.id,
          input_text: isCorrect ? currentTask.correct_answer : '',
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || tasks.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No lesson available right now.</Text>
      </View>
    );
  }

  if (isFinished) {
    return (
      <View style={styles.container}>
        <Text style={styles.celebration}>Lesson complete! 🎉</Text>
        <Text style={styles.message}>
          {correctCount} / {tasks.length} correct
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.progress}>
        Task {taskIndex + 1} of {tasks.length}
      </Text>
      <ExerciseEngine key={currentTask.id} task={currentTask} onResult={handleResult} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  screen: {
    flex: 1,
  },
  progress: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  celebration: {
    fontSize: 28,
    fontWeight: '700',
  },
  message: {
    fontSize: 18,
    color: '#4b5563',
  },
});
