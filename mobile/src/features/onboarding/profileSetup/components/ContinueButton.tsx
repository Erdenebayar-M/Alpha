import { StyleSheet, View } from 'react-native';

import GradientRect from '@/src/components/GradientRect';
import PressableScale from '@/src/components/PressableScale';
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
    <PressableScale
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
      <GradientRect
        id="profileCta"
        from={colors.profileCtaStart}
        to={colors.profileCtaEnd}
        opacity={stopOpacity}
        rx={24 * scale}
      />
      <View pointerEvents="none">
        <ArrowIcon width={ARROW.width * scale} height={ARROW.height * scale} />
      </View>
    </PressableScale>
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
