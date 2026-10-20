import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { contentImageSource } from '../../../assets/manifest';
import type { Word } from '../../../content/schema';
import { colors, fonts, radii, shadow, tile } from '../../../theme/tokens';

interface Props {
  word: Word;
  size?: number;
}

/**
 * The picture for a word. Until its art exists (M4), a dev placeholder shows the word's
 * text on the card — release validation refuses picture Games without real pictures.
 */
export function PictureCard({ word, size = tile.pictureSize }: Props) {
  return (
    <View style={[styles.card, { width: size, height: size }]}>
      {word.image ? (
        <Image source={contentImageSource(word.image)} style={{ width: size, height: size }} contentFit="contain" />
      ) : (
        <Text style={[styles.placeholder, { fontSize: size * tile.placeholderFontRatio }]}>{word.text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadow },
  placeholder: { fontFamily: fonts.extraBold, color: colors.placeholderInk },
});
