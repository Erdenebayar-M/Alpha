import { Slot } from 'expo-router';

import AuthGate from '@/src/components/AuthGate';

export default function OnboardingLayout() {
  return (
    <AuthGate>
      <Slot />
    </AuthGate>
  );
}
