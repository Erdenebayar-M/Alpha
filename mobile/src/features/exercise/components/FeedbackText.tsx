import { StyleSheet, Text } from 'react-native';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface FeedbackTextProps {
  children: string | null;
}

/** Supportive correct/wrong feedback line shared across the choice renderers.
 *  Renders nothing when there is no feedback yet. */
export default function FeedbackText({ children }: FeedbackTextProps) {
  if (!children) return null;
  return <Text style={styles.feedback}>{children}</Text>;
}

const styles = StyleSheet.create({
  feedback: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.textChoice,
    textAlign: 'center',
  },
});
