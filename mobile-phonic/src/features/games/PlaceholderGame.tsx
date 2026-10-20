import { StyleSheet, Text, View } from 'react-native';
import { BubbleButton } from '../../components/BubbleButton';
import { colors, fonts, fontSize } from '../../theme/tokens';
import type { GameKind } from '../../content/schema';
import type { GameProps } from './types';

// Stand-in until each Game kind gets its real renderer in M2. Tap to finish with 3 Stars.
export function PlaceholderGame<K extends GameKind>({ onFinish }: GameProps<K>) {
  return (
    <View style={styles.center}>
      <BubbleButton accessibilityLabel="finish-game" color={colors.success} onPress={() => onFinish({ mistakes: 0, answers: [] })}>
        <Text style={styles.glyph}>✓</Text>
      </BubbleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontFamily: fonts.black, fontSize: fontSize.plus, color: colors.white },
});
