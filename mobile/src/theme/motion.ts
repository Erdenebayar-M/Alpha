// Shared press-feedback tuning for PressableScale, so every button in the app
// bounces the same way (distinct from the onboarding-only slide choreography in
// src/features/onboarding/motion.ts).

/** How far a button shrinks on press-in. */
export const PRESS_SCALE = 0.92;

/** Snappy press-down — a spring here would feel laggy compared to the finger. */
export const PRESS_DOWN_DURATION = 80;

/** Springy release — the kid-friendly "pop" back to full size, with a touch of overshoot. */
export const PRESS_SCALE_SPRING = { damping: 10, stiffness: 300 } as const;
