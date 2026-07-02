import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { TaskChoice } from '@/src/features/exercise/types';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface ChoiceGridProps {
  choices: TaskChoice[];
  selectedIndex: number | null;
  isAnswered: boolean;
  onSelect: (index: number) => void;
}

export default function ChoiceGrid({ choices, selectedIndex, isAnswered, onSelect }: ChoiceGridProps) {
  const { height } = useWindowDimensions();
  // Shrink the sheet on short screens so it doesn't crowd the content above it.
  const compact = height < 720;
  const cardMinHeight = Math.max(80, Math.min(height * 0.13, 116));
  const sheetPadding = compact ? 20 : 28;
  const gridGap = compact ? 10 : 14;
  const fontSize = compact ? 20 : 24;

  return (
    <View style={[styles.sheet, { padding: sheetPadding, borderRadius: compact ? 36 : 46 }]}>
      <View style={[styles.grid, { gap: gridGap }]}>
        {choices.map((choice, index) => {
          const isSelected = selectedIndex === index;
          return (
            <Pressable
              key={`${choice.text}-${index}`}
              style={({ pressed }) => [
                styles.card,
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
