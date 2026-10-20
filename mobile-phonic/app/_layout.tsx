import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { fontFiles } from '../src/assets/manifest';
import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  const [loaded, error] = useFonts(fontFiles);
  // On a font error, render with system fonts rather than a blank screen.
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar hidden />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.sky } }} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
