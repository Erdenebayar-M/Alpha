import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import ArrowIcon from '@/assets/onboarding/profile-setup/arrow.svg';
import { colors } from '@/src/theme/colors';

/**
 * The gradient CTA pill shared by all three profile-setup steps (Figma node
 * `804:9020` disabled / `804:9775` enabled). Same `Svg`-`Rect` gradient technique as
 * `OnboardingCarousel`'s `GradientBackground`, since React Native has no CSS-gradient
 * equivalent for a view background.
 */

const WIDTH = 341;
const HEIGHT = 66;
/** The arrow's Figma box is 52.5x28.941, bled to the asset's natural size by its -24.72% inset. */
const ARROW = { width: 53.415, height: 43.248 };

export default function ContinueButton({
  disabled = false,
  onPress,
  scale = 1,
}: {
  disabled?: boolean;
  onPress: () => void;
  scale?: number;
}) {
  // Figma's disabled variant is the same gradient at 20% alpha. This has to be
  // `stopOpacity` rather than an `rgba()` `stopColor` — SVG stop colours carry no alpha,
  // and react-native-svg renders such a string fully opaque.
  const stopOpacity = disabled ? 0.2 : 1;

  return (
    <Pressable
      style={[
        styles.button,
        {
          width: WIDTH * scale,
          height: HEIGHT * scale,
          borderRadius: 24 * scale,
          borderBottomWidth: 3 * scale,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Үргэлжлүүлэх"
      accessibilityState={{ disabled }}
    >
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="profileCta" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.profileCtaStart} stopOpacity={stopOpacity} />
            <Stop offset="1" stopColor={colors.profileCtaEnd} stopOpacity={stopOpacity} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" rx={24 * scale} fill="url(#profileCta)" />
      </Svg>
      <View pointerEvents="none">
        <ArrowIcon width={ARROW.width * scale} height={ARROW.height * scale} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    maxWidth: '100%',
    borderColor: colors.profileCtaBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
