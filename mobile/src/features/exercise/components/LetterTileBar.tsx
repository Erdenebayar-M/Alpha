import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BackspaceIcon } from '@/src/features/exercise/components/icons';
import type { TaskChoice } from '@/src/features/exercise/types';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface LetterTileBarProps {
  tiles: TaskChoice[];
  selectedIndex: number | null;
  isAnswered: boolean;
  onSelect: (index: number) => void;
  onBackspace: () => void;
}

/**
 * Bottom answer sheet for fill-in-the-blank letter tasks: a row of tappable letter
 * tiles plus a backspace key. Shares ChoiceGrid's sheet chrome so the fill-letter
 * screen speaks the same visual language as the choice/text screens.
 */
export default function LetterTileBar({
  tiles,
  selectedIndex,
  isAnswered,
  onSelect,
  onBackspace,
}: LetterTileBarProps) {
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const sheetPadding = compact ? 20 : 28;
  const tileMinHeight = Math.max(58, Math.min(height * 0.09, 72));
  const fontSize = compact ? 22 : 26;

  return (
    <View style={[styles.sheet, { padding: sheetPadding, borderRadius: compact ? 36 : 46 }]}>
      <View style={styles.row}>
        {tiles.map((tile, index) => {
          const isSelected = selectedIndex === index;
          return (
            <Pressable
              key={`${tile.text}-${index}`}
              style={({ pressed }) => [
                styles.tile,
                { minHeight: tileMinHeight },
                isSelected && styles.tileSelected,
                pressed && !isAnswered && styles.tilePressed,
              ]}
              onPress={() => onSelect(index)}
              disabled={isAnswered}
              accessibilityRole="button"
              accessibilityLabel={tile.text}
            >
              <Text
                style={[styles.tileText, { fontSize }, isSelected && styles.tileTextSelected]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {tile.text}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          style={({ pressed }) => [
            styles.backspace,
            { minHeight: tileMinHeight },
            pressed && !isAnswered && styles.tilePressed,
          ]}
          onPress={onBackspace}
          disabled={isAnswered || selectedIndex === null}
          accessibilityRole="button"
          accessibilityLabel="Устгах"
        >
          <BackspaceIcon size={26} color={selectedIndex === null ? colors.textMuted : colors.textChoice} />
        </Pressable>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  tile: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.choiceBorder,
    backgroundColor: colors.choiceBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    shadowColor: '#283C64',
    shadowOffset: { width: -1, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 2,
  },
  tileSelected: {
    backgroundColor: colors.choiceSelectedBg,
    borderColor: colors.choiceSelectedBorder,
    shadowColor: '#4F7DFF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 9,
  },
  tilePressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  tileText: {
    fontFamily: fonts.extrabold,
    color: colors.textChoice,
    textAlign: 'center',
    letterSpacing: -0.048,
  },
  tileTextSelected: {
    color: colors.white,
  },
  backspace: {
    width: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.choiceBg,
    borderWidth: 2,
    borderColor: colors.choiceBorder,
  },
});
