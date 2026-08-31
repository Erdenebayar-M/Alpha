import { useRef, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { boardScale, DESIGN, MIN_TYPE_SCALE, useKeyboardStableHeight } from '@/src/features/onboarding/motion';
import ContinueButton from '@/src/features/onboarding/profileSetup/components/ContinueButton';
import { OuterScrollHandlerContext } from '@/src/features/onboarding/profileSetup/components/nestedScrollArbitration';

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
  avoidsKeyboard,
}: {
  children: ReactNode;
  ctaDisabled: boolean;
  onContinue: () => void;
  /**
   * Opt in for steps with text inputs (currently only `PersonalInfoStep`). Off by
   * default so `GenderStep`/`GradeStep` — which never open a keyboard — keep their
   * exact existing render path.
   *
   * When on: the CTA is prevented from rising with the keyboard (see `shrinkAmount`
   * below), and `children` scroll inside a keyboard-avoiding region so the fields stay
   * reachable instead of being hidden behind the keyboard.
   */
  avoidsKeyboard?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Always called (rules-of-hooks); only steps that opt in actually use its frozen
  // value. Freezing height stops Android's keyboard-driven window resize (adjustResize)
  // from rescaling the board — see `useKeyboardStableHeight`.
  const stableHeight = useKeyboardStableHeight(height);
  const scale = boardScale(
    DESIGN,
    width,
    avoidsKeyboard ? stableHeight : height,
    avoidsKeyboard ? MIN_TYPE_SCALE : undefined
  );
  // On Android, `root`'s real flex box still shrinks by this amount even though `scale`
  // (and so the CTA's `bottom` value) is frozen — this cancels that drift so the CTA
  // never visually moves. Always 0 on iOS, where nothing here shrinks `root` anymore.
  const shrinkAmount = avoidsKeyboard ? Math.max(0, stableHeight - height) : 0;
  const outerScrollRef = useRef<ScrollView>(null);

  const cta = (
    <View
      style={[
        styles.cta,
        {
          bottom: Math.max(CTA_BOTTOM * scale, insets.bottom + 12),
          paddingHorizontal: 24,
          transform: [{ translateY: shrinkAmount }],
        },
      ]}
    >
      <ContinueButton disabled={ctaDisabled} onPress={onContinue} scale={scale} />
    </View>
  );

  if (!avoidsKeyboard) {
    return (
      <View style={styles.root}>
        <View style={[styles.column, { top: COLUMN_TOP * scale, width: COLUMN_WIDTH * scale }]}>
          {children}
        </View>
        {cta}
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.root}>
        <KeyboardAvoidingView
          style={[styles.keyboardColumn, { top: COLUMN_TOP * scale }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={outerScrollRef}
            // gesture-handler's ScrollView (not RN's) so this vertical scroller arbitrates
            // correctly with AgeWheel's nested horizontal one on real touch input.
            contentContainerStyle={[styles.scrollContent, { paddingBottom: (CTA_BOTTOM + 80) * scale }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <OuterScrollHandlerContext.Provider value={outerScrollRef}>
              <View style={{ width: COLUMN_WIDTH * scale, alignItems: 'center' }}>{children}</View>
            </OuterScrollHandlerContext.Provider>
          </ScrollView>
        </KeyboardAvoidingView>

        {cta}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  column: { position: 'absolute', alignSelf: 'center', alignItems: 'center' },
  keyboardColumn: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  scrollContent: { alignItems: 'center', flexGrow: 1 },
  cta: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
