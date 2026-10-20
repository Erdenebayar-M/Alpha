import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { Sound } from '../../../content/schema';
import { playAsset, playQueue } from '../../../audio/play';
import { buildWord, colors, drag, radii, space, tile as tileToken, touchMin } from '../../../theme/tokens';
import {
  Draggable,
  DropZone,
  encourageRetry,
  GameShell,
  LetterTile,
  ListenButton,
  useAnswers,
  useGameArea,
  useInstructed,
  useLatest,
  usePop,
  useShake,
  useSpeakEachRound,
} from '../kit';
import type { GameProps } from '../types';
import { buildRounds, judgeDrop, slotId, slotIndex, splitRows, type Drop, type Round } from './rounds';

/** A tile that has just been locked into its slot pops once. */
function PlacedTile({ sound, size }: { sound: Sound; size: number }) {
  const { style, pop } = usePop();
  useEffect(pop, []); // eslint-disable-line react-hooks/exhaustive-deps -- once, on arrival
  return (
    <Animated.View style={style}>
      <LetterTile sound={sound} size={size} />
    </Animated.View>
  );
}

interface TrayTileProps {
  sound: Sound;
  size: number;
  disabled: boolean;
  /** Reports the drop; a 'wrong' answer makes the tile shake. */
  onDrop: (zoneId: string | null) => Drop;
}

function TrayTile({ sound, size, disabled, onDrop }: TrayTileProps) {
  const { style, shake } = useShake();
  // Draggable's own lift only beats its siblings, so the held tile's container is raised too.
  const [held, setHeld] = useState(false);
  return (
    <Animated.View style={[style, held && styles.held]}>
      <Draggable
        disabled={disabled}
        onPickUp={() => setHeld(true)}
        onDrop={(zoneId) => {
          setHeld(false);
          if (onDrop(zoneId) === 'wrong') shake();
        }}
      >
        <LetterTile sound={sound} size={size} />
      </Draggable>
    </Animated.View>
  );
}

function Board({ game, ctx, onFinish }: GameProps<'build-word'>) {
  const area = useGameArea();
  const instructed = useInstructed();
  const answers = useAnswers(onFinish);
  const [rounds] = useState<Round[]>(() => buildRounds(game, ctx));
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<(string | null)[]>(() => rounds[0]?.sounds.map(() => null) ?? []);
  const [busy, setBusy] = useState(false);
  // Gestures and audio callbacks fire from closures built before the latest render.
  const live = useLatest({ busy, index });
  // Written in the drop itself too, so two near-simultaneous drops never judge a stale board.
  const board = useRef(placed);
  useEffect(() => {
    board.current = placed;
  }, [placed]);

  const round = rounds[index];
  const word = round ? ctx.wordById(round.wordId) : null;

  useSpeakEachRound(index, word?.audio ?? null);
  useEffect(() => {
    if (!round) answers.finish();
    // finish is idempotent and reads only refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Every slot filled: read the Sounds in order, then the word. However that ends, move on. */
  const celebrate = (r: Round) => {
    setBusy(true);
    const clips = [...r.sounds.map((s) => ctx.soundById(s).audio), ctx.wordById(r.wordId).audio];
    playQueue(clips, () => {
      const next = rounds[live.current.index + 1];
      if (!next) return answers.finish();
      setIndex((i) => i + 1);
      setPlaced(next.sounds.map(() => null));
      setBusy(false);
    });
  };

  const drop = (tileKey: string, zoneId: string | null): Drop => {
    if (!round || live.current.busy) return 'ignore';
    const slot = slotIndex(zoneId);
    const outcome = judgeDrop(round, board.current, tileKey, slot);
    if (outcome === 'ignore' || slot === null) return outcome;
    const sound = round.sounds[slot];
    answers.record(sound, outcome === 'right');
    if (outcome === 'wrong') {
      encourageRetry();
      return outcome;
    }
    playAsset(ctx.soundById(sound).audio);
    const next = board.current.map((k, i) => (i === slot ? tileKey : k));
    board.current = next;
    setPlaced(next);
    if (next.every((k) => k !== null)) celebrate(round);
    return outcome;
  };

  if (!round || !word) return null;

  // The widest row decides the tile size. When the tray can't keep touchMin tiles in one row
  // (small phones, long words), it wraps into two rows instead of running under Orto.
  const fit = (pieces: number, extra: number) => Math.floor((area.width - extra - space.md * (pieces - 1)) / pieces);
  const trayRows = splitRows(round.tiles, fit(round.tiles.length, 0) < touchMin ? 2 : 1);
  const perRow = trayRows[0].length;
  const down = Math.floor((area.height - space.xl - space.md * (trayRows.length - 1)) / (trayRows.length + 1));
  const size = Math.max(touchMin, Math.min(tileToken.size, down, fit(perRow, 0), fit(round.sounds.length, touchMin + space.md)));

  return (
    <View style={styles.column}>
      <View style={styles.row}>
        <ListenButton audio={word.audio} />
        {round.sounds.map((s, i) => {
          const key = placed[i];
          return (
            <DropZone key={slotId(i)} id={slotId(i)} style={[{ width: size, height: size }, key === null && styles.empty]}>
              {key !== null && <PlacedTile sound={ctx.soundById(s)} size={size} />}
            </DropZone>
          );
        })}
      </View>
      <View style={styles.tray}>
        {trayRows.map((row) => (
          <View key={row[0].key} style={styles.row}>
            {row.map((t) =>
              placed.includes(t.key) ? (
                <View key={t.key} style={{ width: size, height: size }} />
              ) : (
                <TrayTile key={t.key} sound={ctx.soundById(t.sound)} size={size} disabled={busy || !instructed} onDrop={(z) => drop(t.key, z)} />
              ),
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export function BuildWordGame(props: GameProps<'build-word'>) {
  return (
    <GameShell kind="build-word">
      <Board {...props} />
    </GameShell>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'center', gap: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
  tray: { gap: space.md },
  held: { zIndex: drag.liftZ },
  // Only an empty slot shows its outline; a placed tile fills the slot exactly.
  empty: {
    borderRadius: radii.md,
    borderWidth: buildWord.slotBorder,
    borderStyle: 'dashed',
    borderColor: colors.placeholderInk,
    backgroundColor: buildWord.slotFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
