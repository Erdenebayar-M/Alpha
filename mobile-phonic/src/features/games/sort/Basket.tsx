import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { Sound, Word } from '../../../content/schema';
import { colors, radii, sortGame, space } from '../../../theme/tokens';
import { DropZone, LetterTile, ListenButton, PictureCard, usePop } from '../kit';
import { basketId } from './rounds';

interface Props {
  sound: Sound;
  /** Words already sorted into this basket. */
  placed: Word[];
  width: number;
  tileSize: number;
  thumbSize: number;
}

/** One basket: a drop target showing its Sound's tile, a way to hear it, and what has landed in it. */
export function Basket({ sound, placed, width, tileSize, thumbSize }: Props) {
  const { style, pop } = usePop();

  // Pop whenever a word lands.
  useEffect(() => {
    if (placed.length > 0) pop();
    // pop is recreated each render; it only needs to run when a word lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed.length]);

  return (
    <Animated.View style={style}>
      <DropZone id={basketId(sound.id)} style={[styles.basket, { width }]}>
        <LetterTile sound={sound} size={tileSize} />
        <ListenButton audio={sound.audio} />
        <View style={styles.placed}>
          {placed.map((w) => (
            <PictureCard key={w.id} word={w} size={thumbSize} />
          ))}
        </View>
      </DropZone>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  basket: {
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radii.lg,
    borderWidth: sortGame.borderWidth,
    borderColor: colors.white,
    backgroundColor: colors.sky,
  },
  placed: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xs },
});
