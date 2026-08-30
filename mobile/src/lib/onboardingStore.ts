import * as SecureStore from 'expo-secure-store';

import { IS_MOCK } from '@/src/api/client';
import type { Gender } from '@/src/features/onboarding/profileSetup/genderCharacters';

// Per-learner onboarding state: whether the carousel/profile/journey-start
// sequence has already played, and the profile answers it collected. Backed
// by expo-secure-store (same mechanism as the JWT in secureStore.ts) rather
// than a new dependency — this is the only local persistence the app has.
//
// TODO: the backend Learner model (src/api/learner.ts) has no fields for
// gender/surname/givenName/age — only name/grade/daily_minutes/variant. Once
// an endpoint exists to persist them server-side, sync this local profile to
// it instead of leaving it device-local.

export interface OnboardingProfile {
  gender: Gender;
  surname: string;
  givenName: string;
  age: number;
  grade: number;
}

const completionKey = (learnerId: string) => `onboarding_done_${learnerId}`;
const profileKey = (learnerId: string) => `onboarding_profile_${learnerId}`;

// Mock learners (src/lib/mockData.ts's mockLearners) are themselves
// in-memory and reset on every reload — including the hardcoded seed
// learner's id, which a fresh session can select again. A completion flag
// in SecureStore, being Keychain/Keystore-backed, would outlive that reset
// and permanently skip onboarding for it. Track mock completion in memory
// instead so it resets right alongside the learners it describes; real
// learners keep the durable SecureStore behavior below.
const mockCompletedLearners = new Set<string>();

export async function isOnboardingComplete(learnerId: string): Promise<boolean> {
  if (IS_MOCK) return mockCompletedLearners.has(learnerId);
  const value = await SecureStore.getItemAsync(completionKey(learnerId));
  return value === '1';
}

export async function markOnboardingComplete(learnerId: string): Promise<void> {
  if (IS_MOCK) {
    mockCompletedLearners.add(learnerId);
    return;
  }
  await SecureStore.setItemAsync(completionKey(learnerId), '1');
}

export async function saveOnboardingProfile(
  learnerId: string,
  profile: OnboardingProfile,
): Promise<void> {
  await SecureStore.setItemAsync(profileKey(learnerId), JSON.stringify(profile));
}

export async function getOnboardingProfile(learnerId: string): Promise<OnboardingProfile | null> {
  const raw = await SecureStore.getItemAsync(profileKey(learnerId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingProfile;
  } catch {
    return null;
  }
}
