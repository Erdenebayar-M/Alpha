import { StyleSheet, Text, View } from 'react-native';

export default function LessonScreen() {
  return (
    <View style={styles.container}>
      <Text>Lesson</Text>
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
