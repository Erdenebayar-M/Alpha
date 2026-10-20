import { useCallback, useRef } from 'react';
import type { ChoiceHandle } from './ChoiceButton';

/** Keeps a ChoiceButton handle per answer id, so a Game can pop or shake the one tapped. */
export function useChoiceHandles() {
  const handles = useRef<Record<string, ChoiceHandle | null>>({});
  const refFor = useCallback(
    (id: string) => (h: ChoiceHandle | null) => {
      handles.current[id] = h;
    },
    [],
  );
  const get = useCallback((id: string) => handles.current[id] ?? null, []);
  return { refFor, get };
}
