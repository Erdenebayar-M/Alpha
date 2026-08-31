import { Easing } from 'react-native-reanimated';

// Shared press-feedback tuning for PressableScale, so every button in the app presses
// the same way: a firm, quick depress with no bounce or overshoot on release (distinct
// from the onboarding-only slide choreography in src/features/onboarding/motion.ts).

/** How far a button shrinks on press-in — shallow, so text stays crisp and the
 *  button reads as depressed rather than squashed. */
export const PRESS_SCALE = 0.98;

/** Press-in scale for the tappable character avatar — deeper than PRESS_SCALE so a
 *  tap reads as a satisfying "boop" on the character rather than a button click. */
export const CHARACTER_PRESS_SCALE = 0.88;

/** Press-down must land under the finger, not after it. */
export const PRESS_DOWN_DURATION = 60;

/** Release settles straight back to 100% — never past it. A button, not a jelly. */
export const PRESS_UP_DURATION = 120;

/** Both directions: fast start, soft stop, zero overshoot. */
export const PRESS_EASING = Easing.out(Easing.quad);
