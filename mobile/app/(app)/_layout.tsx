import { Stack } from 'expo-router';

import AuthGate from '@/src/components/AuthGate';

export default function AppLayout() {
  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthGate>
  );
}
