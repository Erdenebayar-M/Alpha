import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { hearTap, space, touchMin } from '../../../theme/tokens';
import {
  ChoiceButton,
  encourageRetry,
  GameShell,
  LetterTile,
  ListenButton,
  useAnswers,
  useChoiceHandles,
  useGameArea,
  useInstructed,
  useSpeakEachRound,
} from '../kit';
import type { GameProps } from '../types';
import { buildRounds } from './rounds';

/** "Hear & Tap": Orto says a Sound, the child taps its Grapheme among three tiles. */
export function HearTapGame(props: GameProps<'hear-tap'>) {
  return (
    <GameShell kind="hear-tap">
      <Board {...props} />
    </GameShell>
  );
}

function Board({ game, ctx, onFinish }: GameProps<'hear-tap'>) {
  const rounds = useMemo(() => buildRounds(game.focus, ctx), [game.focus, ctx]);
  const answers = useAnswers(onFinish);
  const instructed = useInstructed();
  const { width, height } = useGameArea();
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [popped, setPopped] = useState(false);
  const choices = useChoiceHandles();
  const advance = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(advance.current), []);

  const round = rounds[index];
  const target = ctx.soundById(round.target);
  useSpeakEachRound(index, target.audio);

  // Three tiles side by side, with the Listen button above them.
  const tileSize = Math.min(hearTap.tileMax, (width - space.lg * 2) / 3, height - touchMin - space.lg);

  const tap = (soundId: string) => {
    if (!instructed || popped || wrong.includes(soundId)) return;
    const correct = soundId === round.target;
    answers.record(round.target, correct);
    if (!correct) {
      setWrong((w) => [...w, soundId]);
      choices.get(soundId)?.shake();
      encourageRetry();
      return;
    }
    setPopped(true);
    choices.get(soundId)?.pop();
    advance.current = setTimeout(() => {
      if (index + 1 < rounds.length) {
        setIndex(index + 1);
        setWrong([]);
        setPopped(false);
      } else {
        answers.finish();
      }
    }, hearTap.nextMs);
  };

  return (
    <View style={styles.column}>
      <ListenButton audio={target.audio} />
      <View key={index} style={styles.row}>
        {round.options.map((id) => (
          <ChoiceButton
            key={id}
            ref={choices.refFor(id)}
            accessibilityLabel={`tile-${id}`}
            dimmed={wrong.includes(id)}
            onPress={() => tap(id)}
          >
            <LetterTile sound={ctx.soundById(id)} size={tileSize} />
          </ChoiceButton>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'center', gap: space.lg },
  row: { flexDirection: 'row', gap: space.lg },
});
