import { assetIds, rawCurriculum } from '../../src/content';
import { validateCurriculum } from '../../src/content/validate';

describe('World 1 content', () => {
  it('is valid for development', () => {
    const r = validateCurriculum(rawCurriculum, { release: false, ...assetIds });
    expect(r.ok ? [] : r.errors).toEqual([]);
  });

  it('is blocked from release until its draft words are approved and pictured', () => {
    const r = validateCurriculum(rawCurriculum, { release: true, ...assetIds });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.join('\n')).toMatch(/not approved/);
      expect(r.errors.every((e) => /not approved|needs a picture/.test(e))).toBe(true);
    }
  });

  it('has 11 Levels, one per World 1 Sound', () => {
    expect(rawCurriculum.worlds[0].levels.map((l) => l.newSound)).toEqual(
      ['a', 'm', 'o', 'n', 'u', 'l', 'e', 's', 'i', 'oe', 'ue'],
    );
  });
});
