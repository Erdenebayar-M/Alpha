import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import { BackspaceIcon } from '@/src/features/exercise/components/icons';
import type { TaskChoice } from '@/src/features/exercise/types';
import { colors } from '@/src/theme/colors';
import { shadows } from '@/src/theme/shadows';
import { fonts } from '@/src/theme/typography';

interface LetterTileBarProps {
  /** Plain letters, or choice objects when the payload carries `options.choices`. */
  tiles: (TaskChoice | string)[];
  /** Single-blank tasks: the one highlighted tile. Omit when using `usedTiles`. */
  selectedIndex?: number | null;
  /** Multi-blank tasks: parallel to `tiles`, a placed tile fades out and goes inert. */
  usedTiles?: boolean[];
  isAnswered: boolean;
  onSelect: (index: number) => void;
  onBackspace: () => void;
}

/**
 * Bottom answer sheet for fill-in-the-blank letter tasks: a row of tappable letter
 * tiles plus a backspace key. Shares ChoiceGrid's sheet chrome so the fill-letter
 * screen speaks the same visual language as the choice/text screens.
 *
 * Two selection models share the chrome. Pass `selectedIndex` for a single blank —
 * the chosen tile fills blue and backspace clears it. Pass `usedTiles` when the word
 * has several blanks — each placed tile is *consumed* (faded, inert) and backspace
 * pulls the last one back out.
 */
export default function LetterTileBar({
  tiles,
  selectedIndex = null,
  usedTiles,
  isAnswered,
  onSelect,
  onBackspace,
}: LetterTileBarProps) {
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const sheetPadding = compact ? 20 : 28;
  const tileMinHeight = Math.max(58, Math.min(height * 0.09, 72));
  const fontSize = compact ? 22 : 26;
  const hasBackspaceTarget = usedTiles ? usedTiles.some(Boolean) : selectedIndex !== null;

  return (
    <View style={[styles.sheet, { padding: sheetPadding, borderRadius: compact ? 36 : 46 }]}>
      <View style={styles.row}>
        {tiles.map((tile, index) => {
          const label = typeof tile === 'string' ? tile : tile.text;
          const isSelected = selectedIndex === index;
          const isUsed = usedTiles?.[index] ?? false;
          const isInert = isAnswered || isUsed;
          return (
            <PressableScale
              key={`${label}-${index}`}
              style={({ pressed }) => [
                styles.tile,
                { minHeight: tileMinHeight },
                isSelected && styles.tileSelected,
                isUsed && styles.tileUsed,
                pressed && !isInert && styles.tilePressed,
              ]}
              onPress={() => onSelect(index)}
              disabled={isInert}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ disabled: isInert }}
            >
              <Text
                style={[styles.tileText, { fontSize }, isSelected && styles.tileTextSelected]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {label}
              </Text>
            </PressableScale>
          );
        })}

        <PressableScale
          style={({ pressed }) => [
            styles.backspace,
            { minHeight: tileMinHeight },
            pressed && !isAnswered && styles.tilePressed,
          ]}
          onPress={onBackspace}
          disabled={isAnswered || !hasBackspaceTarget}
          accessibilityRole="button"
          accessibilityLabel="Устгах"
        >
          <BackspaceIcon size={26} color={hasBackspaceTarget ? colors.textChoice : colors.textMuted} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.sheet,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    ...shadows.sheet(6),
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
    ...shadows.sheetEdge,
  },
  tileSelected: {
    backgroundColor: colors.choiceSelectedBg,
    borderColor: colors.choiceSelectedBorder,
    shadowColor: '#4F7DFF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 9,
  },
  tileUsed: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  tilePressed: {
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
