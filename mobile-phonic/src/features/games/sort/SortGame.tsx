import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { playAsset } from '../../../audio/play';
import type { Word } from '../../../content/schema';
import { drag, sortGame } from '../../../theme/tokens';
import { Draggable, encourageRetry, GameShell, PictureCard, useAnswers, useGameArea, useInstructed, useShake, useSpeakEachRound } from '../kit';
import type { GameProps } from '../types';
import { Basket } from './Basket';
import { sortLayout } from './layout';
import { buildRounds, dropOutcome } from './rounds';

/** "Sound Sort": drag each picture into the basket of the Sound its word starts with. */
export function SortGame({ game, ctx, onFinish }: GameProps<'sort'>) {
  return (
    <GameShell kind="sort">
      <Board game={game} ctx={ctx} onFinish={onFinish} />
    </GameShell>
  );
}

// Inside GameShell so it can ask whether the instruction has been heard.
function Board({ game, ctx, onFinish }: GameProps<'sort'>) {
  const rounds = useMemo(
    () => buildRounds(game.words.map(ctx.wordById), game.sounds, ctx.segmentWord, ctx.rng),
    [game.words, game.sounds, ctx],
  );
  const answers = useAnswers(onFinish);
  const instructed = useInstructed();
  const { shake, style: shakeStyle } = useShake();
  const area = useGameArea();
  const layout = sortLayout(area);
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<Record<string, Word[]>>({});

  const round = rounds[index];
  const done = !round;
  const [first, second] = game.sounds.map(ctx.soundById);

  useSpeakEachRound(index, round?.word.audio ?? null);

  // Let the last pop land, then report.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(answers.finish, sortGame.finishMs);
    return () => clearTimeout(t);
    // finish is idempotent and reads the latest onFinish.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const drop = (zoneId: string | null) => {
    const outcome = dropOutcome(round, zoneId);
    if (outcome === 'ignored') return;
    answers.record(round.target, outcome === 'correct');
    if (outcome === 'wrong') {
      shake();
      encourageRetry();
      return;
    }
    setPlaced((p) => ({ ...p, [round.target]: [...(p[round.target] ?? []), round.word] }));
    setIndex(index + 1);
  };

  const basket = (sound: typeof first) => (
    <Basket sound={sound} placed={placed[sound.id] ?? []} width={layout.edge} tileSize={layout.tile} thumbSize={layout.thumb} />
  );

  return (
    <View style={[styles.row, { width: area.width }]}>
      {basket(first)}
      {/* Raised above both baskets so a dragged card is never hidden behind one. */}
      <View style={[styles.card, { width: layout.edge, height: layout.edge }]}>
        {round && (
          <Draggable key={round.word.id} disabled={!instructed} onPickUp={() => playAsset(round.word.audio)} onDrop={drop}>
            <Animated.View style={shakeStyle}>
              <PictureCard word={round.word} size={layout.edge} />
            </Animated.View>
          </Draggable>
        )}
      </View>
      {basket(second)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { zIndex: drag.liftZ },
});
