import { createElement } from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// Minimal renderHook, hand-rolled because @testing-library/react-native's
// version in this project has a broken integration with its own
// "test-renderer" peer dependency (renderHook()'s returned `result` comes
// back undefined) — filed as environment-specific, not a code issue here.
// react-test-renderer itself works fine and is all this needs: a component
// that runs the hook and stashes its latest return value in a ref-like box.
export function renderHook<T>(callback: () => T): { result: { current: T } } {
  const result = { current: undefined as unknown as T };

  function TestComponent() {
    result.current = callback();
    return null;
  }

  act(() => {
    TestRenderer.create(createElement(TestComponent));
  });

  return { result };
}

export { act };
