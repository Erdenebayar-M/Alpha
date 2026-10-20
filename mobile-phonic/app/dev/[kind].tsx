import { useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BackButton } from '../../src/components/BackButton';
import { curriculum } from '../../src/content';
import { levelOrder } from '../../src/engine/order';
import { GameRunner } from '../../src/features/games/GameRunner';
import { buildGameContext } from '../../src/features/games/context';
import { colors, space } from '../../src/theme/tokens';

// DEV ONLY: play one Game kind in isolation — orto-phonic://dev/<kind>?level=<levelId>.
// Picks the given Level, or the first Level containing that kind. Never reachable in release.
export default function DevGame() {
  const { kind, level: levelId } = useLocalSearchParams<{ kind: string; level?: string }>();
  const router = useRouter();
  const level = levelOrder(curriculum).find((l) =>
    levelId ? l.id === levelId : l.games.some((g) => g.kind === kind),
  );
  const game = level?.games.find((g) => g.kind === kind);
  const [ctx] = useState(() => (level ? buildGameContext(curriculum, level, {}, Date.now()) : null));
  const [round, setRound] = useState(0);

  if (!__DEV__ || !game || !ctx) return <Redirect href="/" />;

  // Finishing restarts the Game, so it can be played again without navigating.
  const restart = () => setRound((r) => r + 1);
  return (
    <View style={styles.screen}>
      <GameRunner key={round} game={game} ctx={ctx} onFinish={restart} onSkip={() => router.back()} />
      <BackButton onPress={() => router.back()} style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky },
  back: { position: 'absolute', top: space.lg, left: space.lg },
});
