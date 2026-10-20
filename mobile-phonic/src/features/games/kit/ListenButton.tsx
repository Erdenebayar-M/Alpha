import { StyleSheet, Text } from 'react-native';
import { playAsset } from '../../../audio/play';
import { BubbleButton } from '../../../components/BubbleButton';
import { colors, fonts, fontSize, touchMin } from '../../../theme/tokens';

/** Replays a content clip (a Sound or Word `audio` id). */
export function ListenButton({ audio, size = touchMin }: { audio: string; size?: number }) {
  return (
    <BubbleButton accessibilityLabel="listen" size={size} color={colors.sun} onPress={() => playAsset(audio)}>
      <Text style={styles.glyph}>🔊</Text>
    </BubbleButton>
  );
}

const styles = StyleSheet.create({ glyph: { fontFamily: fonts.black, fontSize: fontSize.icon, color: colors.ink } });
