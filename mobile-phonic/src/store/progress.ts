import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Level } from '../content/schema';
import { applyGameResult, type GameResult } from '../engine/progress';
import { mmkvStorage } from './storage';

// Bump on any breaking change to the persisted shape and add a `migrate` step (ADR 0001).
export const SCHEMA_VERSION = 1;
// One Profile per avatar; with 4 avatars this cap is a safety net, not reachable normally.
export const MAX_PROFILES = 4;

export type AvatarId = 'orto' | 'narhan' | 'sprout' | 'buddy';

export interface SoundTally {
  correct: number;
  attempts: number;
}

export interface Profile {
  id: string;
  avatar: AvatarId;
  createdAt: number;
  /** levelId -> gameId -> best Stars (0–3). Rules live in src/engine (M1). */
  stars: Record<string, Record<string, number>>;
  /** Sound id (e.g. "m") -> Sound accuracy tally. */
  soundAccuracy: Record<string, SoundTally>;
  /** Sticker ids in the order earned. */
  stickers: string[];
}

export interface Settings {
  soundOn: boolean;
}

interface ProgressState {
  profiles: Profile[];
  activeProfileId: string | null;
  settings: Settings;
  addProfile: (avatar: AvatarId) => Profile | null;
  removeProfile: (id: string) => void;
  selectProfile: (id: string | null) => void;
  resetProfile: (id: string) => void;
  setSoundOn: (on: boolean) => void;
  /** Records a finished Game for the active Profile (Stars, Sound accuracy, Sticker). */
  recordGameResult: (level: Level, gameId: string, result: GameResult) => void;
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const emptyProgress = (): Pick<Profile, 'stars' | 'soundAccuracy' | 'stickers'> => ({
  stars: {},
  soundAccuracy: {},
  stickers: [],
});

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      settings: { soundOn: true },

      addProfile: (avatar) => {
        const { profiles } = get();
        // The avatar is the only thing that tells children apart, so each is used once.
        if (profiles.length >= MAX_PROFILES || profiles.some((p) => p.avatar === avatar)) return null;
        const profile: Profile = { id: newId(), avatar, createdAt: Date.now(), ...emptyProgress() };
        set((s) => ({ profiles: [...s.profiles, profile] }));
        return profile;
      },
      removeProfile: (id) =>
        set((s) => ({
          profiles: s.profiles.filter((p) => p.id !== id),
          activeProfileId: s.activeProfileId === id ? null : s.activeProfileId,
        })),
      selectProfile: (id) => set({ activeProfileId: id }),
      resetProfile: (id) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...emptyProgress() } : p)),
        })),
      setSoundOn: (on) => set((s) => ({ settings: { ...s.settings, soundOn: on } })),
      recordGameResult: (level, gameId, result) =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === s.activeProfileId ? applyGameResult(p, level, gameId, result) : p,
          ),
        })),
    }),
    { name: 'progress', version: SCHEMA_VERSION, storage: mmkvStorage },
  ),
);

export const useActiveProfile = () =>
  useProgress((s) => s.profiles.find((p) => p.id === s.activeProfileId) ?? null);
