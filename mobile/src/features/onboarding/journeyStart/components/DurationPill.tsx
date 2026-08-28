import { StyleSheet, Text, View } from 'react-native';

import Clock from '@/assets/onboarding/journey-start/clock.svg';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * The "Ойролцоогоор 1-2 минут" chip below the CTA (Figma node 204:11241, "Frame 30").
 * 235x48 (24x24 icon, gap 10, px 20 / py 12) at scale 1.
 */

export default function DurationPill({ label, scale = 1 }: { label: string; scale?: number }) {
  return (
    <View
      style={[
        styles.pill,
        {
          borderRadius: 32 * scale,
          paddingHorizontal: 20 * scale,
          paddingVertical: 12 * scale,
          gap: 10 * scale,
        },
      ]}
    >
      <Clock width={24 * scale} height={24 * scale} />
      <Text style={[styles.label, { fontSize: 13 * scale }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.journeyDurationBg,
  },
  label: {
    fontFamily: fonts.regular,
    color: colors.journeyDurationText,
  },
});
