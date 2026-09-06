import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * A view-filling linear-gradient background, drawn as an `Svg`+`Rect`+`LinearGradient`
 * since React Native has no CSS-gradient equivalent for a view background. Shared by
 * `ContinueButton`, `PrimaryPillButton`, and `OnboardingCarousel`'s `GradientBackground`
 * — same technique, differing only in colours, direction, corner radius, and (for the
 * profile-setup CTA's disabled state) stop opacity.
 *
 * `id` must be unique per on-screen instance — it's the caller's existing gradient id,
 * carried over unchanged so behaviour stays identical to each pre-extraction copy.
 */
export default function GradientRect({
  id,
  from,
  to,
  rx = 0,
  opacity = 1,
  vertical = false,
}: {
  id: string;
  from: string;
  to: string;
  rx?: number;
  opacity?: number;
  vertical?: boolean;
}) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={vertical ? '0' : '1'} y2={vertical ? '1' : '0'}>
          <Stop offset="0" stopColor={from} stopOpacity={opacity} />
          <Stop offset="1" stopColor={to} stopOpacity={opacity} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" rx={rx} fill={`url(#${id})`} />
    </Svg>
  );
}
