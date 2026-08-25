import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { boardScale, DESIGN } from '@/src/features/onboarding/motion';
import ContinueButton from '@/src/features/onboarding/profileSetup/components/ContinueButton';

/**
 * The skeleton every profile-setup step shares (Figma 804-8990 / 804-9969 / 804-10366):
 * a 216-wide column centred on the 390x844 board with its top at y=121, and a 341x66
 * CTA near the bottom.
 *
 * Everything is multiplied by `boardScale(DESIGN, width, height)` — the same helper the
 * onboarding carousel uses — so the steps size off *both* axes and never hard-code
 * Figma's frame coordinates (AGENTS.md §12). The CTA additionally clears the bottom
 * safe-area inset, the way `OnboardingCarousel` does for its page dots.
 */

/** Content frame 67 sits at y=111 and pads 10, so the column starts at 121. */
const COLUMN_TOP = 121;
const COLUMN_WIDTH = 216;
/** The CTA's top edge is y=683..690 across the three frames; 844-686-66 from the bottom. */
const CTA_BOTTOM = 92;

export default function ProfileStepLayout({
  children,
  ctaDisabled,
  onContinue,
}: {
  children: ReactNode;
  ctaDisabled: boolean;
  onContinue: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = boardScale(DESIGN, width, height);

  return (
    <View style={styles.root}>
      <View style={[styles.column, { top: COLUMN_TOP * scale, width: COLUMN_WIDTH * scale }]}>
        {children}
      </View>

      <View
        style={[
          styles.cta,
          { bottom: Math.max(CTA_BOTTOM * scale, insets.bottom + 12), paddingHorizontal: 24 },
        ]}
      >
        <ContinueButton disabled={ctaDisabled} onPress={onContinue} scale={scale} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  column: { position: 'absolute', alignSelf: 'center', alignItems: 'center' },
  cta: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
