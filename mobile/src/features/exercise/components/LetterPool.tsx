import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const GAP = 12;
const MAX_TILE = 64;
const MIN_TILE = 48;
// Keep at least this many tiles per row so long pools (e.g. 11 letters) wrap tidily.
const MIN_PER_ROW = 4;

interface LetterPoolProps {
  /** The scrambled letter pool, in payload order. */
  tiles: string[];
  /** Parallel to `tiles`: a used tile greys out and stops responding. */
  usedTiles: boolean[];
  /** Tap an available tile to drop it into the next empty slot. */
  onSelect: (index: number) => void;
  /** Once answered the pool freezes. */
  isAnswered: boolean;
}

/**
 * The scrambled letter tiles the child taps to build the word. Tapping fills the next
 * slot and greys the tile (consumed); distractor tiles simply never get used. Wraps to
 * multiple centered rows so a long word's pool fits any screen.
 */
export default function LetterPool({ tiles, usedTiles, onSelect, isAnswered }: LetterPoolProps) {
  const { width } = useWindowDimensions();
  const available = width - 32; // container horizontal padding (16 each side)
  const perRow = Math.max(MIN_PER_ROW, Math.min(tiles.length, 6));
  const raw = Math.floor((available - GAP * (perRow - 1)) / perRow);
  const tileSize = Math.max(MIN_TILE, Math.min(MAX_TILE, raw));
  const fontSize = Math.round(tileSize * 0.44);

  return (
    <View style={styles.pool}>
      {tiles.map((letter, index) => {
        const used = usedTiles[index];
        return (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.tile,
              { width: tileSize, height: tileSize },
              used && styles.tileUsed,
              pressed && !used && !isAnswered && styles.tilePressed,
            ]}
            onPress={() => onSelect(index)}
            disabled={used || isAnswered}
            accessibilityRole="button"
            accessibilityLabel={letter}
            accessibilityState={{ disabled: used }}
          >
            <Text
              style={[styles.tileText, { fontSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {letter}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pool: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GAP,
  },
  tile: {
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  tileUsed: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  tilePressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  tileText: {
    fontFamily: fonts.extrabold,
    color: colors.textChoice,
    textAlign: 'center',
    letterSpacing: -0.056,
  },
});
