import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { playAsset } from '../../../audio/play';
import { colors, radii, space, trace } from '../../../theme/tokens';
import { encourageRetry, GameShell, ListenButton, useAnswers, useGameArea } from '../kit';
import type { GameProps } from '../types';
import { STROKES } from './strokes';
import { TraceBoard } from './TraceBoard';
import { boardSize } from './tracing';

/** "Trace": draw the Grapheme along its strokes, three times, hearing the Sound each time. */
export function TraceGame({ game, ctx, onFinish }: GameProps<'trace'>) {
  const area = useGameArea();
  const sound = ctx.soundById(game.sound);
  const strokes = STROKES[sound.id];
  const answers = useAnswers(onFinish);
  const [done, setDone] = useState(0);
  const [round, setRound] = useState(0);
  const count = useRef(0);

  // A Sound without strokes (a later World) must not trap the child: end the Game.
  useEffect(() => {
    if (!strokes) answers.finish();
    // Runs once per Game mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!strokes) return null;

  const onStray = () => {
    answers.record(sound.id, false);
    encourageRetry();
  };

  const onComplete = () => {
    answers.record(sound.id, true);
    count.current += 1;
    setDone(count.current);
    // The Sound is heard on the finished letter; the next tracing (or the end) follows it.
    playAsset(sound.audio, () => (count.current >= trace.reps ? answers.finish() : setRound(count.current)));
  };

  return (
    <GameShell kind="trace">
      <View style={styles.row}>
        <TraceBoard key={round} strokes={strokes} size={boardSize(area)} onStray={onStray} onComplete={onComplete} />
        <View style={styles.side}>
          <ListenButton audio={sound.audio} />
          {Array.from({ length: trace.reps }, (_, i) => (
            <View key={i} style={[styles.dot, { opacity: i < done ? 1 : trace.repDotOffOpacity }]} />
          ))}
        </View>
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  side: { alignItems: 'center', gap: space.md },
  dot: { width: trace.repDot, height: trace.repDot, borderRadius: radii.pill, backgroundColor: colors.sun },
});
