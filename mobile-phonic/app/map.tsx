import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BackButton } from '../src/components/BackButton';
import { BubbleButton } from '../src/components/BubbleButton';
import { Character } from '../src/components/Character';
import { curriculum } from '../src/content';
import { unlockedLevelIds } from '../src/engine/stars';
import { useActiveProfile } from '../src/store/progress';
import { characterSize, colors, fonts, fontSize, space } from '../src/theme/tokens';

// M1 stand-in: a row of open Level bubbles so Games can be played end to end.
// The real World map (path, landscape, Stars) is M3.
export default function MapScreen() {
  const router = useRouter();
  const profile = useActiveProfile();
  const open = unlockedLevelIds(curriculum, profile?.stars ?? {});
  const levels = curriculum.worlds[0].levels.filter((l) => open.has(l.id));

  return (
    <View style={styles.screen}>
      <BackButton onPress={() => router.back()} style={styles.back} />
      <Character id="chr_orto" size={characterSize.map} />
      <View style={styles.row}>
        {levels.map((l, i) => (
          <BubbleButton key={l.id} accessibilityLabel={l.id} onPress={() => router.push(`/level/${l.id}`)}>
            <Text style={styles.num}>{i + 1}</Text>
          </BubbleButton>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.steppe, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  back: { position: 'absolute', top: space.lg, left: space.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center', paddingHorizontal: space.xl },
  num: { fontFamily: fonts.black, fontSize: fontSize.title, color: colors.ink },
});
