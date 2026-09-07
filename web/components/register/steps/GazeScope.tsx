"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Drives the `--gaze` custom property (globals.css) for every ChildMascot
 * inside it, from whichever field/control currently has focus — mobile's
 * PersonalInfoStep/GradeStep track a `PointedField` id for the same reason
 * (`src/features/onboarding/profileSetup/steps/PersonalInfoStep.tsx`): so
 * moving focus directly between two fields inside this scope can't leave a
 * stray "look up" flicker between one's blur and the next's focus. React's
 * onFocus/onBlur bubble, so one wrapper here covers every field without
 * per-field wiring — mobile wires each field individually because RN's
 * onFocus/onBlur don't bubble the way DOM events do.
 *
 * The blur→clear is deferred a tick rather than applied immediately: a focus
 * move within this scope fires blur then focus synchronously in the same
 * call stack, so the pending clear below is always cancelled before it runs
 * when focus lands on another field in the scope, and only actually fires
 * when focus leaves the scope entirely.
 *
 * `display: contents` so this wrapper doesn't become an extra flex child of
 * SetupCard's `<form>` — its own gap-based rhythm between the mascot and the
 * fields below it depends on both staying direct children.
 */
export default function GazeScope({ children }: { children: ReactNode }) {
  const [pointing, setPointing] = useState(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleFocus() {
    if (clearTimer.current !== null) {
      clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
    setPointing(true);
  }

  function handleBlur() {
    clearTimer.current = setTimeout(() => setPointing(false), 0);
  }

  return (
    <div className="contents" data-gaze={pointing ? "true" : undefined} onFocus={handleFocus} onBlur={handleBlur}>
      {children}
    </div>
  );
}
