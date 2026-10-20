import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { playAudio } from '../src/audio/play';
import { Character } from '../src/components/Character';
import { ProfilePicker } from '../src/features/profiles/ProfilePicker';
import { characterSize, colors, space } from '../src/theme/tokens';

export default function Home() {
  const router = useRouter();
  useEffect(() => playAudio('fl_welcome'), []);

  return (
    <View style={styles.screen}>
      <Character id="chr_orto" size={characterSize.hero} />
      <ProfilePicker onPlay={() => router.push('/map')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center', gap: space.xl },
});
