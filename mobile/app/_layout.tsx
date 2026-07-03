import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/src/features/auth/AuthContext';
import { queryClient } from '@/src/lib/queryClient';
import { fontAssets } from '@/src/theme/typography';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);

  // Hold routing until Nunito is ready so the first paint uses the brand font
  // (avoids a flash of the system font, which also lacks Өө / Үү).
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Slot />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
