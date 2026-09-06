import { StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import PuzzleCard from '@/src/features/exercise/components/PuzzleCard';
import { useDragPan } from '@/src/features/exercise/hooks/useDragPan';

interface DraggableImageCardProps {
  leftId: string;
  width: number;
  height: number;
  imageUrl?: string;
  disabled?: boolean;
  /** Highlight border (used when this row was auto-selected as the forced last pair). */
  selected?: boolean;
  /** Fired when the drag begins (renderer re-measures drop targets + lifts this card). */
  onDragStart: (leftId: string) => void;
  /** Fired continuously with the finger's screen position (drives drop-target hover). */
  onDragMove: (x: number, y: number) => void;
  /** Fired on release with the finger's screen position; renderer attempts the link. */
  onDrop: (leftId: string, x: number, y: number) => void;
}

/**
 * A picture card the child drags onto a word to link them. The card follows the
 * finger (lifting + growing so it reads as a picked-up puzzle piece) and always
 * springs back to its slot on release — if the drop linked, the card reflows into
 * its word's row and this instance unmounts; if not, it settles back home.
 */
export default function DraggableImageCard({
  leftId,
  width,
  height,
  imageUrl,
  disabled = false,
  selected = false,
  onDragStart,
  onDragMove,
  onDrop,
}: DraggableImageCardProps) {
  // Always returns to the slot origin on release (via useDragPan's onFinalize); a
  // successful link reflows/unmounts us instead.
  const { pan, style } = useDragPan({
    enabled: !disabled,
    scaleBoost: 0.08,
    shadowOpacity: [0.05, 0.2],
    shadowRadius: [4, 10],
    onDragStart: () => onDragStart(leftId),
    onDragMove,
    onDrop: (x, y) => onDrop(leftId, x, y),
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.base, style]}>
        <PuzzleCard variant="image" width={width} height={height} imageUrl={imageUrl} selected={selected} disabled />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: {
    shadowColor: '#1E2A44',
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
