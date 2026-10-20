import { StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, fonts, fontSize } from '../theme/tokens';
import { BubbleButton } from './BubbleButton';

interface Props {
  onPress: () => void;
  style?: ViewStyle;
}

/** The one "go back" bubble, used wherever a child can step back. */
export function BackButton({ onPress, style }: Props) {
  return (
    <BubbleButton accessibilityLabel="back" onPress={onPress} style={style}>
      <Text style={styles.glyph}>‹</Text>
    </BubbleButton>
  );
}

const styles = StyleSheet.create({
  glyph: { fontFamily: fonts.black, fontSize: fontSize.plus, color: colors.skyDeep },
});
