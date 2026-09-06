import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/src/theme/colors';

/**
 * A track-and-fill progress bar (a rounded track View with a same-radius fill View
 * clipped inside it, width driven by `percent`). Shared by the plan screen's overview
 * card, its per-lesson detail row, and the dashboard's per-skill row — each hand-rolled
 * the identical two-View shape at a different height, with layout coming from the
 * surrounding row (`style` carries that: `alignSelf: 'stretch'`, `flex: 1`, ...).
 */
export default function ProgressBar({
  percent,
  height,
  style,
}: {
  percent: number;
  height: number;
  style?: StyleProp<ViewStyle>;
}) {
  const radius = height / 2;
  return (
    <View style={[styles.track, { height, borderRadius: radius }, style]}>
      <View style={[styles.fill, { height, borderRadius: radius, width: `${percent}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.progressFill,
  },
});
