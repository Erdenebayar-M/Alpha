import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Character } from '@/components/character';
import { OptionButton } from '@/components/option-button';
import { ProgressBar } from '@/components/progress-bar';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { DIAGNOSTIC_TOTAL, diagnosticQuestions } from '@/data/diagnostic';

type AudioState = 'idle' | 'playing';

/**
 * Listening multiple-choice diagnostic screen (Figma "second"–"fifth page").
 *
 * One screen, two pieces of state:
 *  - audio:    idle (play) ↔ playing (sound bars)   — Figma 2/4 vs 3/5
 *  - selected: none ↔ an option highlighted         — Figma 2/3 vs 4/5
 *
 * The audio icon, glow, side-waves and dots are baked into the globe art
 * (globe-idle / globe-listening PNGs), so the globe itself is the tap target
 * that toggles audio. Audio is visual-only for now; wire `expo-audio` into the
 * globe `onPress` later.
 */
export default function DiagnosticScreen() {
  const router = useRouter();
  const question = diagnosticQuestions[0];
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [selected, setSelected] = useState<number | null>(null);

  // Picking an answer advances to the next (listen) question.
  const handleSelect = (id: number) => {
    setSelected(id);
    router.push('/listen');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.top}>
          <ProgressBar value={1} total={DIAGNOSTIC_TOTAL} />

          <Text style={styles.greeting}>{question.greeting}</Text>
          <Text style={styles.prompt}>{question.prompt}</Text>

          <Pressable
            onPress={() => setAudioState((prev) => (prev === 'playing' ? 'idle' : 'playing'))}
            accessibilityRole="button"
            accessibilityLabel={
              audioState === 'playing' ? 'Дуу тоглуулж байна' : 'Дуу сонсох'
            }
            hitSlop={12}
            style={styles.characterWrap}>
            <Character variant={audioState === 'playing' ? 'listening' : 'idle'} size={180} />
          </Pressable>
        </View>

        {/* Bottom answer card — 2×2 grid */}
        <View style={styles.card}>
          <View style={styles.grid}>
            {question.options.map((option) => (
              <OptionButton
                key={option.id}
                label={option.label}
                selected={selected === option.id}
                onPress={() => handleSelect(option.id)}
                style={styles.cell}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.diagnosticBg,
  },
  safeArea: {
    flex: 1,
  },
  top: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    alignItems: 'center',
  },
  greeting: {
    color: Brand.greeting,
    fontFamily: Typography.family,
    fontSize: Typography.greeting.fontSize,
    lineHeight: Typography.greeting.lineHeight,
    fontWeight: Typography.greeting.fontWeight,
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  prompt: {
    color: Brand.navy,
    fontFamily: Typography.family,
    fontSize: Typography.title.fontSize,
    lineHeight: Typography.title.lineHeight,
    fontWeight: Typography.title.fontWeight,
    textAlign: 'center',
  },
  characterWrap: {
    marginTop: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    marginTop: Spacing.five,
    backgroundColor: Brand.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.three,
  },
  cell: {
    width: '48%',
  },
});
