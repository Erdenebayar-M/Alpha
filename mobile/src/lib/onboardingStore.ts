import * as SecureStore from 'expo-secure-store';

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

export async function isOnboardingComplete(learnerId: string): Promise<boolean> {
  const value = await SecureStore.getItemAsync(completionKey(learnerId));
  return value === '1';
}

export async function markOnboardingComplete(learnerId: string): Promise<void> {
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
