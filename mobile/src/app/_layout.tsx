import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Fixed light-theme kids' app — no dark mode switching.
export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="diagnostic" />
        <Stack.Screen name="listen" />
      </Stack>
    </>
  );
}
