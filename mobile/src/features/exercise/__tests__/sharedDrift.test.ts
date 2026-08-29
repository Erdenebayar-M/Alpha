import fs from 'fs';
import path from 'path';

import { taskTypeMap } from '@/src/features/exercise/taskTypeMap';

// Mobile can't import @app/shared (it isn't an npm workspace — see AGENTS.md
// §2/§6 and the audit that flagged this), so src/features/exercise/types.ts
// hand-mirrors shared/src/validators/task.ts's Task/TaskOptions shapes. This
// test is the seatbelt for that duplication: it reads shared/'s source as
// TEXT (no zod import, no cross-package module resolution — mobile has no
// runtime dependency on shared/ before or after this file) and asserts the
// mirror hasn't drifted. A failure here means someone changed shared/task.ts
// without updating mobile's copy — go read the diff and update types.ts and
// taskTypeMap.ts together.

const SHARED_TASK_TS = path.resolve(__dirname, '../../../../../shared/src/validators/task.ts');

function readSharedSource(): string {
  return fs.readFileSync(SHARED_TASK_TS, 'utf-8');
}

describe('shared/src/validators/task.ts drift', () => {
  it('is readable at the expected path (repo layout has not moved)', () => {
    expect(fs.existsSync(SHARED_TASK_TS)).toBe(true);
  });

  it('TASK_TYPES matches mobile taskTypeMap 1:1', () => {
    const source = readSharedSource();
    const match = source.match(/export const TASK_TYPES = \[([\s\S]*?)\] as const;/);
    expect(match).not.toBeNull();
    const sharedTypes = Array.from((match![1].match(/'(TT_\d+_\d+)'/g) ?? [])).map((s) =>
      s.slice(1, -1)
    );
    expect(sharedTypes.length).toBeGreaterThan(0);

    const mobileTypes = Object.keys(taskTypeMap).sort();
    expect([...sharedTypes].sort()).toEqual(mobileTypes);
  });

  // Every field referenced by any of shared's per-type option shapes must
  // exist on mobile's TaskOptions (as optional — mobile's interface is
  // deliberately a superset/union across all 43 task types, unlike shared's
  // per-type discriminated shapes). Field NAMES only — not zod validation
  // rules, which is a call the plan explicitly scoped out (see
  // theme/spacing.ts-style "no retrofit" notes elsewhere in this codebase).
  it('every shared option-shape field exists on mobile TaskOptions', () => {
    const source = readSharedSource();
    const shapeBlocks = Array.from(
      source.matchAll(/export const \w+Options = z\.object\(\{([\s\S]*?)\n\}\);/g)
    );
    expect(shapeBlocks.length).toBeGreaterThan(0);

    // Top-level field names only (indented by exactly 2 spaces) — skips
    // nested object fields like matchPairsOptions.pairs[].left, which are
    // typed via TaskPair in mobile, not flat TaskOptions fields.
    const fieldNameRe = /^ {2}(\w+):/gm;
    const sharedFields = new Set<string>();
    for (const [, body] of shapeBlocks) {
      for (const m of body.matchAll(fieldNameRe)) {
        sharedFields.add(m[1]);
      }
    }
    expect(sharedFields.size).toBeGreaterThan(10);

    // Fields modeled by dedicated mobile types instead of flat TaskOptions
    // fields (see TaskPair / PunctuationOptions in types.ts).
    const modeledElsewhere = new Set(['pairs']);

    // TaskOptions fields aren't enumerable at runtime (it's a type, not a
    // value), so read the interface's field names from types.ts source
    // instead — same technique as the shared-side extraction above, applied
    // to mobile's own file for symmetry.
    const declaredMobileFields = new Set<string>();
    const typesSource = fs.readFileSync(
      path.resolve(__dirname, '../types.ts'),
      'utf-8'
    );
    const interfaceMatch = typesSource.match(
      /export interface TaskOptions \{([\s\S]*?)\n\}/
    );
    expect(interfaceMatch).not.toBeNull();
    for (const m of interfaceMatch![1].matchAll(/^ {2}(\w+)\??:/gm)) {
      declaredMobileFields.add(m[1]);
    }

    const missing = [...sharedFields].filter(
      (f) => !declaredMobileFields.has(f) && !modeledElsewhere.has(f)
    );
    expect(missing).toEqual([]);
  });
});
