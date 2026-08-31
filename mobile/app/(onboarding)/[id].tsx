import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import JourneyStartScreen from '@/src/features/onboarding/journeyStart/JourneyStartScreen';
import OnboardingCarousel from '@/src/features/onboarding/OnboardingCarousel';
import ProfileSetupFlow from '@/src/features/onboarding/profileSetup/ProfileSetupFlow';
import { markOnboardingComplete } from '@/src/lib/onboardingStore';

type Step = 'intro' | 'profile' | 'journeyStart';

// The carousel -> gender/personal-info/grade -> journey-start sequence, run
// once per learner before their first lesson. lesson.tsx redirects here when
// onboardingStore says it hasn't completed yet, and this screen redirects
// back to the lesson when it has.
export default function OnboardingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [step, setStep] = useState<Step>('intro');
  // Dev-only: bump to force a full unmount/remount of the carousel, so Slide1's cold
  // mount (see `useDevMountPerf`) can be repeated without leaving this screen.
  const [introKey, setIntroKey] = useState(0);

  if (!id) return null;

  const finish = async () => {
    await markOnboardingComplete(id);
    router.replace(`/learner/${id}/lesson`);
  };

  if (step === 'intro') {
    return (
      <>
        <OnboardingCarousel key={introKey} onDone={() => setStep('profile')} />
        {__DEV__ ? (
          <Pressable
            style={styles.devRemountButton}
            onPress={() => setIntroKey((k) => k + 1)}
            accessibilityLabel="Remount onboarding intro (dev perf testing)"
          >
            <Text style={styles.devRemountText}>↻ remount</Text>
          </Pressable>
        ) : null}
      </>
    );
  }

  if (step === 'profile') {
    return <ProfileSetupFlow learnerId={id} onDone={() => setStep('journeyStart')} />;
  }

  return <JourneyStartScreen onDone={finish} />;
}

const styles = StyleSheet.create({
  devRemountButton: {
    position: 'absolute',
    top: 56,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  devRemountText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
