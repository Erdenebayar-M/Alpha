import { StyleSheet, Text, View } from 'react-native';
import type { Sound } from '../../../content/schema';
import { colors, fonts, radii, shadow, tile } from '../../../theme/tokens';

interface Props {
  sound: Sound;
  /** Greyed while waiting to be retried or once used. */
  dimmed?: boolean;
  size?: number;
}

/** A Grapheme on a rounded tile; vowels and consonants get their own colour. */
export function LetterTile({ sound, dimmed = false, size = tile.size }: Props) {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, backgroundColor: sound.vowel ? colors.vowel : colors.consonant, opacity: dimmed ? tile.dimmedOpacity : 1 },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * tile.fontRatio }]}>{sound.grapheme}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', ...shadow },
  text: { fontFamily: fonts.black, color: colors.ink },
});
