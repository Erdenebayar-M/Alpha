import { Redirect, Slot } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/src/features/auth/AuthContext';

/** Shared by every route group that requires a logged-in parent — (app) and
 *  (onboarding) both mount this as their whole _layout. Redirects to /login
 *  while unauthenticated; otherwise renders the group's own routes. */
export default function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
