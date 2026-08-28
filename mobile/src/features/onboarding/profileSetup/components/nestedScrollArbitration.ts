import { createContext, useContext, type RefObject } from 'react';
import type { ScrollView } from 'react-native-gesture-handler';

/**
 * `ProfileStepLayout`'s outer vertical scroller (the `avoidsKeyboard` branch) nests a
 * horizontal scroller (`AgeWheel`) several JSX levels down, inside `children`. Two
 * independent gesture-handler `ScrollView`s nested with no declared relationship resolve
 * deterministically — the outer one wins recognition outright and the inner one never
 * receives the gesture. Sharing the outer scroller's ref this way lets a nested scroller
 * pass it to its own `simultaneousHandlers`, so RNGH lets both recognize the gesture at
 * once and native per-axis disambiguation decides instead.
 */
export const OuterScrollHandlerContext = createContext<RefObject<ScrollView | null> | null>(null);

export function useOuterScrollHandler() {
  return useContext(OuterScrollHandlerContext);
}
