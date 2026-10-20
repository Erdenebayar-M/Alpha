import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BackButton } from '../../src/components/BackButton';
import { curriculum } from '../../src/content';
import { unlockedLevelIds } from '../../src/engine/stars';
import { GameRunner } from '../../src/features/games/GameRunner';
import { useLevelRun } from '../../src/features/level/useLevelRun';
import { useActiveProfile } from '../../src/store/progress';
import { colors, space } from '../../src/theme/tokens';

export default function LevelScreen() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const router = useRouter();
  const profile = useActiveProfile();
  const run = useLevelRun(levelId);
  // Locked Levels (or no Profile to record into) can't be played, even via a deep link.
  const allowed = !!profile && unlockedLevelIds(curriculum, profile.stars).has(levelId);

  useEffect(() => {
    if (run.done || !allowed) router.back();
  }, [run.done, allowed, router]);

  return (
    <View style={styles.screen}>
      {allowed && run.game && run.ctx && (
        <GameRunner game={run.game} ctx={run.ctx} onFinish={run.finish} onSkip={run.skip} />
      )}
      <BackButton onPress={() => router.back()} style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky },
  back: { position: 'absolute', top: space.lg, left: space.lg },
});
