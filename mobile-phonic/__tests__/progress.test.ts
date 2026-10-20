import { MAX_PROFILES, SCHEMA_VERSION, useProgress, type AvatarId } from '../src/store/progress';

const ALL: AvatarId[] = ['orto', 'narhan', 'sprout', 'buddy'];

const reset = () => useProgress.setState({ profiles: [], activeProfileId: null, settings: { soundOn: true } });

describe('progress store', () => {
  beforeEach(reset);

  it('adds a profile with empty progress', () => {
    const p = useProgress.getState().addProfile('orto');
    expect(p).not.toBeNull();
    expect(p).toMatchObject({ avatar: 'orto', stars: {}, soundAccuracy: {}, stickers: [] });
  });

  it(`refuses more than ${MAX_PROFILES} profiles`, () => {
    const { addProfile } = useProgress.getState();
    for (const a of ALL) expect(addProfile(a)).not.toBeNull();
    expect(useProgress.getState().profiles).toHaveLength(MAX_PROFILES);
    // Bypass the unique-avatar rule so only the cap can refuse.
    useProgress.setState((s) => ({ profiles: s.profiles.map((p) => ({ ...p, avatar: 'orto' as AvatarId })) }));
    expect(addProfile('buddy')).toBeNull();
    expect(useProgress.getState().profiles).toHaveLength(MAX_PROFILES);
  });

  it('refuses an avatar another profile already uses', () => {
    const { addProfile } = useProgress.getState();
    expect(addProfile('buddy')).not.toBeNull();
    expect(addProfile('buddy')).toBeNull();
    expect(useProgress.getState().profiles).toHaveLength(1);
  });

  it('selects a profile', () => {
    const p = useProgress.getState().addProfile('orto')!;
    useProgress.getState().selectProfile(p.id);
    expect(useProgress.getState().activeProfileId).toBe(p.id);
  });

  it('toggles sound', () => {
    useProgress.getState().setSoundOn(false);
    expect(useProgress.getState().settings.soundOn).toBe(false);
  });

  it('clears the active profile when it is removed', () => {
    const p = useProgress.getState().addProfile('sprout')!;
    useProgress.getState().selectProfile(p.id);
    useProgress.getState().removeProfile(p.id);
    expect(useProgress.getState().activeProfileId).toBeNull();
  });

  it('reset wipes progress but keeps the profile', () => {
    const p = useProgress.getState().addProfile('narhan')!;
    useProgress.setState((s) => ({
      profiles: s.profiles.map((x) => ({ ...x, stickers: ['s1'], stars: { l1: { g1: 3 } } })),
    }));
    useProgress.getState().resetProfile(p.id);
    expect(useProgress.getState().profiles[0]).toMatchObject({ id: p.id, avatar: 'narhan', stickers: [], stars: {} });
  });

  it('records a Game result on the active Profile only', () => {
    const a = useProgress.getState().addProfile('orto')!;
    const b = useProgress.getState().addProfile('buddy')!;
    useProgress.getState().selectProfile(a.id);
    const level = { id: 'l1', newSound: 'a', sticker: 's', games: [{ kind: 'trace' as const, id: 'g', sound: 'a' }] };
    useProgress.getState().recordGameResult(level, 'g', { mistakes: 0, answers: [{ sound: 'a', correct: true }] });
    const [pa, pb] = useProgress.getState().profiles;
    expect(pa.stars.l1.g).toBe(3);
    expect(pa.stickers).toEqual(['s']);
    expect(pb.id).toBe(b.id);
    expect(pb.stars).toEqual({});
  });

  it('persists with a schema version', () => {
    expect(useProgress.persist.getOptions().version).toBe(SCHEMA_VERSION);
  });
});
