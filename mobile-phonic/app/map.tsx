import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BackButton } from '../src/components/BackButton';
import { Character } from '../src/components/Character';
import { characterSize, colors, fonts, fontSize, space } from '../src/theme/tokens';

// M0 placeholder. The World map (path of Level nodes) is built in M3.
export default function MapScreen() {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <BackButton onPress={() => router.back()} style={styles.back} />
      <Character id="chr_orto" size={characterSize.map} />
      <Text style={styles.title}>1</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.steppe, alignItems: 'center', justifyContent: 'center', gap: space.md },
  back: { position: 'absolute', top: space.lg, left: space.lg },
  title: { fontFamily: fonts.black, fontSize: fontSize.title, color: colors.ink },
});
