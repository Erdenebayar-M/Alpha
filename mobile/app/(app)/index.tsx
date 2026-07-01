import { useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/src/features/auth/AuthContext';

export default function HomeScreen() {
  useQueryClient();
  useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mongolian Orthography App</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
