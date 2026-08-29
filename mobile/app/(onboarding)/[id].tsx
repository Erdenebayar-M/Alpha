import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

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

  if (!id) return null;

  const finish = async () => {
    await markOnboardingComplete(id);
    router.replace(`/learner/${id}/lesson`);
  };

  if (step === 'intro') {
    return <OnboardingCarousel onDone={() => setStep('profile')} />;
  }

  if (step === 'profile') {
    return <ProfileSetupFlow learnerId={id} onDone={() => setStep('journeyStart')} />;
  }

  return <JourneyStartScreen onDone={finish} />;
}
