import { StyleSheet, Text } from 'react-native';

import GradientRect from '@/src/components/GradientRect';
import PressableScale from '@/src/components/PressableScale';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * The "Аяллаа эхлэх" CTA on the journey-start page (Figma node 204:11240, "Button").
 * 285x54 at scale 1. Same `Svg`+`Rect`+`LinearGradient` background technique as
 * `ContinueButton` — React Native has no CSS gradient background — but this pill
 * carries a text label instead of an arrow glyph, so it isn't a fit for that component.
 */

const WIDTH = 285;
const HEIGHT = 54;

export default function PrimaryPillButton({
  label,
  onPress,
  scale = 1,
}: {
  label: string;
  onPress: () => void;
  scale?: number;
}) {
  return (
    <PressableScale
      style={[
        styles.button,
        { width: WIDTH * scale, height: HEIGHT * scale, borderRadius: 32 * scale },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <GradientRect
        id="journeyCta"
        from={colors.journeyCtaStart}
        to={colors.journeyCtaEnd}
        rx={32 * scale}
      />
      <Text style={[styles.label, { fontSize: 17 * scale }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    fontFamily: fonts.bold,
    color: colors.white,
  },
});
