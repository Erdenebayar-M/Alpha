import { StyleSheet, Text, View } from 'react-native';

export default function CheckpointScreen() {
  return (
    <View style={styles.container}>
      <Text>Checkpoint</Text>
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
