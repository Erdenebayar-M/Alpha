import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';

import { AuthProvider } from '@/src/features/auth/AuthContext';
import { queryClient } from '@/src/lib/queryClient';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </QueryClientProvider>
  );
}
