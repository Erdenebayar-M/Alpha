import { readFileSync } from 'fs';
import { join } from 'path';
import { audio, images, listPlaceholders, type AudioAsset, type ImageAsset } from '../src/assets/manifest';

describe('asset manifest', () => {
  it('has an audio entry for every clip in content/RECORDING.md', () => {
    const md = readFileSync(join(__dirname, '../content/RECORDING.md'), 'utf8');
    const ids = [...md.matchAll(/`((?:ph|ins|fb|fl)_[a-z0-9_]+)`/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(Object.keys(audio)).toContain(id);
  });

  it('lists exactly the speech placeholders and todo-art entries', () => {
    const expected = [
      ...Object.entries(audio as Record<string, AudioAsset>).filter(([, a]) => a.kind === 'speech').map(([id]) => `audio:${id}`),
      ...Object.entries(images as Record<string, ImageAsset>).filter(([, a]) => a.kind === 'todo-art').map(([id]) => `image:${id}`),
    ];
    expect(listPlaceholders().sort()).toEqual(expected.sort());
    expect(listPlaceholders()).toContain('image:chr_orto_cheer');
    expect(listPlaceholders()).not.toContain('image:chr_orto');
  });
});
