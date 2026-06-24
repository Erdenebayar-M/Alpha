import { StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, Spacing, Typography } from '@/constants/theme';

type ProgressBarProps = {
  /** Current step (1-based). */
  value: number;
  /** Total number of steps. */
  total: number;
  /**
   * Track styling:
   *  - `light` (default): cream track + blue fill (diagnostic screen).
   *  - `dark`: dark track + purple fill (listen screen, pages 6–8).
   */
  variant?: 'light' | 'dark';
};

/** "1/8" label with a filled track, shown at the top of the diagnostic flow. */
export function ProgressBar({ value, total, variant = 'light' }: ProgressBarProps) {
  const ratio = total > 0 ? Math.min(Math.max(value / total, 0), 1) : 0;
  const isDark = variant === 'dark';
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        {value}/{total}
      </Text>
      <View style={[styles.track, isDark && styles.trackDark]}>
        <View
          style={[styles.fill, isDark && styles.fillDark, { width: `${ratio * 100}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  label: {
    color: Brand.navy,
    fontFamily: Typography.family,
    fontSize: 15,
    fontWeight: '700',
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Brand.progressTrack,
    overflow: 'hidden',
  },
  trackDark: {
    backgroundColor: Brand.progressTrackDark,
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Brand.accentBlue,
  },
  fillDark: {
    backgroundColor: Brand.progressFillPurple,
  },
});
