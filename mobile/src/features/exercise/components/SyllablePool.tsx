import { StyleSheet, View } from 'react-native';

import DraggableSyllable from '@/src/features/exercise/components/DraggableSyllable';
import { colors } from '@/src/theme/colors';

interface SyllablePoolProps {
  /** The syllable tiles (word syllables + distractors), in payload order. */
  tiles: string[];
  /** Parallel to `tiles`: whether that tile currently sits in a slot. */
  usedTiles: boolean[];
  isAnswered: boolean;
  onDragStart: (tileIndex: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDrop: (tileIndex: number, x: number, y: number) => void;
}

/**
 * The tray card holding the draggable syllable chips (Figma "Card"). Unlike LetterPool
 * (which wraps to multiple centered rows of fixed-size tiles), the tray is a single
 * row of chips sharing the card's width evenly — Figma never shows more than a
 * handful of syllables at once.
 */
export default function SyllablePool({
  tiles,
  usedTiles,
  isAnswered,
  onDragStart,
  onDragMove,
  onDrop,
}: SyllablePoolProps) {
  return (
    <View style={styles.card}>
      {tiles.map((text, index) => (
        <DraggableSyllable
          key={index}
          text={text}
          used={usedTiles[index]}
          disabled={isAnswered}
          onDragStart={() => onDragStart(index)}
          onDragMove={onDragMove}
          onDrop={(x, y) => onDrop(index, x, y)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    gap: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    borderRadius: 46,
    padding: 36,
    shadowColor: '#2C4064',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
});
