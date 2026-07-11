import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useActiveLearnerStore } from '@/src/store/activeLearner';

export default function LearnerHomeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const activeLearner = useActiveLearnerStore((state) => state.activeLearner);

  const name = activeLearner?.id === id ? activeLearner.name : null;

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{name ?? 'Welcome'}</Text>

      <Pressable style={styles.button} onPress={() => router.push(`/learner/${id}/diagnostic`)}>
        <Text style={styles.buttonText}>Start diagnostic</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.secondaryButton]}
        onPress={() => router.push(`/learner/${id}/lesson`)}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Start today&apos;s lesson</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.secondaryButton]}
        onPress={() => router.push(`/learner/${id}/plan`)}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Төлөвлөгөө</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.secondaryButton]}
        onPress={() => router.push(`/learner/${id}/dashboard`)}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>View progress</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  button: {
    width: '100%',
    minHeight: 80,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#eef2ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#2563eb',
  },
});
