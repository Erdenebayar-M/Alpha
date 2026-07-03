import { Pressable, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { VOLUME_HIGH_SVG } from '@/src/features/exercise/components/volumeIcons';
import { colors } from '@/src/theme/colors';

interface SpeakerButtonProps {
  /** Fills the button (icon → white) while audio is playing, so the child sees it's active. */
  playing: boolean;
  onPress: () => void;
  size?: number;
}

/**
 * Round "hear it" button beside the character. Tapping it plays the prompt audio,
 * which in turn drives the character's talking animation (via status.playing).
 */
export default function SpeakerButton({ playing, onPress, size = 48 }: SpeakerButtonProps) {
  const iconSize = Math.round(size * 0.5);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Сонсох"
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        playing && styles.buttonActive,
        pressed && styles.pressed,
      ]}
    >
      <SvgXml
        xml={VOLUME_HIGH_SVG.replace('__C__', playing ? colors.white : colors.primaryBlue)}
        width={iconSize}
        height={iconSize}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F2FF',
  },
  buttonActive: {
    backgroundColor: colors.primaryBlue,
  },
  pressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
});
