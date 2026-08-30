import fs from 'fs';
import path from 'path';

import {
  getInteractionForm,
  resolveInteractionForm,
  taskTypeMap,
} from '@/src/features/exercise/taskTypeMap';

// Pure dispatch-logic coverage for ExerciseEngine.tsx. Deliberately does NOT
// import registry.ts: it pulls in every renderer, which pulls in
// react-native-reanimated/worklets, which needs native module mocking this
// project's jest setup doesn't provide (and rendering pixels correctly is a
// device-testing concern per AGENTS.md §2, not a unit-test one). Instead,
// registry.ts's keys are read as text — same technique as sharedDrift.test.ts.

function readRegistryKeys(): Set<string> {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../registry.ts'),
    'utf-8'
  );
  const match = source.match(
    /export const registry: Record<string, ComponentType<ExerciseRendererProps>> = \{([\s\S]*?)\n\};/
  );
  expect(match).not.toBeNull();
  const keys = new Set<string>();
  for (const m of match![1].matchAll(/^ {2}(\w+):/gm)) {
    keys.add(m[1]);
  }
  return keys;
}

describe('exercise engine dispatch', () => {
  it('every task_type in taskTypeMap resolves to a real registry entry', () => {
    const registryKeys = readRegistryKeys();
    expect(registryKeys.size).toBeGreaterThan(20);

    const missing: string[] = [];
    for (const [taskType, form] of Object.entries(taskTypeMap)) {
      if (!registryKeys.has(form)) missing.push(`${taskType} -> ${form}`);
    }
    expect(missing).toEqual([]);
  });

  it('no task_type maps to the fallback renderer', () => {
    // taskTypeMap.ts's own header claims all 43 backend codes have a real
    // renderer assigned — a task_type falling through to 'fallback' would
    // mean a child hits the "not supported yet" screen for a task the
    // backend considers fully supported.
    const fallenBack = Object.entries(taskTypeMap)
      .filter(([, form]) => form === 'fallback')
      .map(([taskType]) => taskType);
    expect(fallenBack).toEqual([]);
  });

  it('getInteractionForm falls back safely for an unmapped task_type', () => {
    // The engine's actual safety net: an unrecognized code (a new backend
    // task_type this client hasn't been taught yet) must resolve to
    // 'fallback', not throw or resolve to undefined — and 'fallback' itself
    // must be a real registry entry so ExerciseEngine's `registry[form] ??
    // Fallback` still has somewhere real to land.
    expect(getInteractionForm('TT_99_9')).toBe('fallback');
    expect(readRegistryKeys().has('fallback')).toBe(true);
  });

  it('taskTypeMap has no duplicate keys and covers exactly the 43 backend codes', () => {
    const keys = Object.keys(taskTypeMap);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBe(43);
  });

  describe('resolveInteractionForm', () => {
    const isRegistered = (key: string) => readRegistryKeys().has(key);

    it('prefers interaction_form when it names a real registry entry', () => {
      // TT_1_4 defaults to 'assemble_word', but a task explicitly opting into
      // the syllable variant (parked registry key 'syllable_assemble_word')
      // must render that renderer instead.
      expect(
        resolveInteractionForm('TT_1_4', 'syllable_assemble_word', isRegistered),
      ).toBe('syllable_assemble_word');
    });

    it('ignores the backend enum value and falls back to taskTypeMap', () => {
      // A real backend payload sends one of the 7 InteractionForm enum
      // values (schema.prisma), which never names a registry key — dispatch
      // must still land on taskTypeMap's default, not 'fallback'.
      expect(resolveInteractionForm('TT_1_4', 'ASSEMBLE', isRegistered)).toBe(
        'assemble_word',
      );
    });

    it('falls back to taskTypeMap when interaction_form is null', () => {
      expect(resolveInteractionForm('TT_1_4', null, isRegistered)).toBe(
        'assemble_word',
      );
    });

    it('falls back to fallback for an unmapped task_type with no usable override', () => {
      expect(
        resolveInteractionForm('TT_99_9', 'not_a_real_key', isRegistered),
      ).toBe('fallback');
    });
  });
});
