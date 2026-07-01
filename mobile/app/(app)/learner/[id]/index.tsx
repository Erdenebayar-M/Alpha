import { StyleSheet, Text, View } from 'react-native';

export default function LearnerHomeScreen() {
  return (
    <View style={styles.container}>
      <Text>Learner Home</Text>
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
