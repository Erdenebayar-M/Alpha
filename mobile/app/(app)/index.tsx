import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import { ApiError } from '@/src/api/client';
import type { Learner } from '@/src/api/learner';
import { useCreateLearner, useGetLearners } from '@/src/features/learner/useLearners';
import { useActiveLearnerStore } from '@/src/store/activeLearner';

const GRADES = [1, 2, 3, 4];

export default function HomeScreen() {
  const router = useRouter();
  const setActiveLearner = useActiveLearnerStore((state) => state.setActiveLearner);
  const { data, isLoading, isError } = useGetLearners();
  const createLearner = useCreateLearner();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSelectLearner = (learner: Learner) => {
    setActiveLearner(learner);
    router.push(`/learner/${learner.id}`);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !grade) {
      setFormError('Please enter a name and pick a grade.');
      return;
    }
    setFormError(null);
    try {
      await createLearner.mutateAsync({ name: name.trim(), grade });
      setName('');
      setGrade(null);
      setIsFormOpen(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Who&apos;s learning today?</Text>

      {isLoading ? <ActivityIndicator style={styles.spacing} /> : null}
      {isError ? <Text style={styles.error}>Couldn&apos;t load children.</Text> : null}

      {data?.learners.map((learner) => (
        <PressableScale key={learner.id} style={styles.card} onPress={() => handleSelectLearner(learner)}>
          <Text style={styles.cardName}>{learner.name}</Text>
          <Text style={styles.cardGrade}>Grade {learner.grade}</Text>
        </PressableScale>
      ))}

      {isFormOpen ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Child's name"
              value={name}
              onChangeText={setName}
            />
            <View style={styles.gradeRow}>
              {GRADES.map((g) => (
                <PressableScale
                  key={g}
                  style={[styles.gradeChip, grade === g && styles.gradeChipSelected]}
                  onPress={() => setGrade(g)}
                >
                  <Text style={[styles.gradeChipText, grade === g && styles.gradeChipTextSelected]}>
                    {g}
                  </Text>
                </PressableScale>
              ))}
            </View>

            {formError ? <Text style={styles.error}>{formError}</Text> : null}

            <PressableScale
              style={[styles.button, createLearner.isPending && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={createLearner.isPending}
            >
              {createLearner.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </PressableScale>
            <PressableScale style={styles.linkButton} onPress={() => setIsFormOpen(false)}>
              <Text style={styles.linkText}>Cancel</Text>
            </PressableScale>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <PressableScale style={styles.addButton} onPress={() => setIsFormOpen(true)}>
          <Text style={styles.addButtonText}>+ Add child</Text>
        </PressableScale>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  spacing: {
    marginVertical: 12,
  },
  card: {
    minHeight: 80,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  cardName: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardGrade: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
  addButton: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    gap: 12,
    marginTop: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  gradeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gradeChip: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeChipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  gradeChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  gradeChipTextSelected: {
    color: '#fff',
  },
  error: {
    color: '#c0392b',
  },
  button: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    color: '#2563eb',
  },
});
