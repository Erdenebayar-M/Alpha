import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronLeftIcon } from '@/src/features/exercise/components/icons';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface LessonHeaderProps {
  current: number;
  total: number;
  onBack: () => void;
}

export default function LessonHeader({ current, total, onBack }: LessonHeaderProps) {
  const ratio = total > 0 ? Math.min(Math.max(current / total, 0), 1) : 0;

  return (
    <View style={styles.row}>
      <Pressable style={styles.backButton} hitSlop={10} onPress={onBack} accessibilityLabel="Back">
        <ChevronLeftIcon />
      </Pressable>

      <View style={styles.progress}>
        <Text style={styles.count}>
          {current}/{total}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 20,
    paddingRight: 16,
    height: 44,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backButtonBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  count: {
    fontFamily: fonts.extrabold,
    fontSize: 13,
    color: colors.progressText,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  fill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.progressFill,
  },
});
