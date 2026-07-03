import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { TaskChoice } from '@/src/features/exercise/types';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface ChoiceGridProps {
  choices: TaskChoice[];
  selectedIndex: number | null;
  isAnswered: boolean;
  onSelect: (index: number) => void;
  /** Force all choices onto a single row of equal-width cards (e.g. short letter
   *  choices Б/Р/В). Omit for the default two-column wrapping grid. */
  singleRow?: boolean;
}

export default function ChoiceGrid({ choices, selectedIndex, isAnswered, onSelect, singleRow }: ChoiceGridProps) {
  const { height } = useWindowDimensions();
  // Shrink the sheet on short screens so it doesn't crowd the content above it.
  const compact = height < 720;
  // Word answers get tall cards; single-letter choices (singleRow) get short, roughly
  // square buttons matching the Figma (~66px), not the full word-sized height.
  const cardMinHeight = singleRow
    ? (compact ? 58 : 66)
    : Math.max(80, Math.min(height * 0.13, 116));
  const sheetPadding = compact ? 20 : 28;
  const gridGap = compact ? 10 : 14;
  const fontSize = compact ? 20 : 24;

  return (
    <View style={[styles.sheet, { padding: sheetPadding, borderRadius: compact ? 36 : 46 }]}>
      <View style={[styles.grid, { gap: gridGap }, singleRow && styles.gridSingleRow]}>
        {choices.map((choice, index) => {
          const isSelected = selectedIndex === index;
          return (
            <Pressable
              key={`${choice.text}-${index}`}
              style={({ pressed }) => [
                styles.card,
                singleRow && styles.cardSingleRow,
                { minHeight: cardMinHeight },
                isSelected && styles.cardSelected,
                pressed && !isAnswered && styles.cardPressed,
              ]}
              onPress={() => onSelect(index)}
              disabled={isAnswered}
            >
              <Text
                style={[styles.text, { fontSize }, isSelected && styles.textSelected]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {choice.text}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.sheet,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    shadowColor: '#2C4064',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridSingleRow: {
    flexWrap: 'nowrap',
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.choiceBorder,
    backgroundColor: colors.choiceBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    shadowColor: '#283C64',
    shadowOffset: { width: -1, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 2,
  },
  cardSingleRow: {
    // Equal-width columns that share one row, regardless of choice count.
    flexBasis: 0,
    flexShrink: 1,
  },
  cardSelected: {
    backgroundColor: colors.choiceSelectedBg,
    borderColor: colors.choiceSelectedBorder,
    shadowColor: '#4F7DFF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 9,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  text: {
    fontFamily: fonts.bold,
    color: colors.textChoice,
    textAlign: 'center',
    letterSpacing: -0.048,
  },
  textSelected: {
    fontFamily: fonts.extrabold,
    color: colors.white,
  },
});
