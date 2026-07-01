import { StyleSheet, Text, View } from 'react-native';

export default function DiagnosticScreen() {
  return (
    <View style={styles.container}>
      <Text>Diagnostic</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
