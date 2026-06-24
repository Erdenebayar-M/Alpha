import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Character } from '@/components/character';
import { OptionButton } from '@/components/option-button';
import { ProgressBar } from '@/components/progress-bar';
import { Brand, ms, Radius, Spacing, Typography } from '@/constants/theme';
import { DIAGNOSTIC_TOTAL, listenQuestion } from '@/data/diagnostic';

type AudioState = 'idle' | 'playing';

/**
 * Listen-&-choose screen (Figma pages 6–8). A restyled sibling of the diagnostic
 * screen: light-blue background, greeting only (no bold prompt), red-glow globe,
 * and a borderless "soft" selected option. Progress bar matches the diagnostic
 * screen, and the answer grid is anchored to the bottom of the screen.
 *
 * One screen, two pieces of state:
 *  - audio:    idle (play) ↔ playing (sound bars)   — page 6/8 vs 7
 *  - selected: which option is highlighted          — page 6/7 vs 8
 *
 * Audio control / waves / dots are baked into the globe art, so the globe itself
 * is the tap target that toggles audio. Audio is visual-only for now; wire
 * `expo-audio` into the globe `onPress` later.
 */
export default function ListenScreen() {
  const insets = useSafeAreaInsets();
  const question = listenQuestion;
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.top}>
          <View style={styles.progressPill}>
            <ProgressBar value={1} total={DIAGNOSTIC_TOTAL} variant="dark" />
          </View>

          <Text style={styles.greeting}>{question.greeting}</Text>

          <Pressable
            onPress={() => setAudioState((prev) => (prev === 'playing' ? 'idle' : 'playing'))}
            accessibilityRole="button"
            accessibilityLabel={
              audioState === 'playing' ? 'Дуу тоглуулж байна' : 'Дуу сонсох'
            }
            hitSlop={12}
            style={styles.characterWrap}>
            <Character
              variant={audioState === 'playing' ? 'listening' : 'idle'}
              accent="purple"
              size={ms(240)}
            />
          </Pressable>
        </View>

        {/* Floating answer card — 2×2 grid, detached from the screen edges */}
        <View style={[styles.card, { marginBottom: insets.bottom + Spacing.three }]}>
          <View style={styles.grid}>
            {question.options.map((option) => (
              <OptionButton
                key={option.id}
                label={option.label}
                variant="soft"
                selected={selected === option.id}
                onPress={() => setSelected(option.id)}
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
    backgroundColor: Brand.listenBg,
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
  progressPill: {
    alignSelf: 'stretch',
    backgroundColor: Brand.card,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
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
  characterWrap: {
    marginTop: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    // Floating card: hug the grid content, detached from the screen edges.
    marginTop: 'auto',
    marginHorizontal: Spacing.three,
    backgroundColor: Brand.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Brand.optionBorderCool,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
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
