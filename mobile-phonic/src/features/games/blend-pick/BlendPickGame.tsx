import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { playAsset, playQueue } from '../../../audio/play';
import type { Word } from '../../../content/schema';
import { blend, space } from '../../../theme/tokens';
import {
  ChoiceButton,
  encourageRetry,
  GameShell,
  LetterTile,
  ListenButton,
  PictureCard,
  useAnswers,
  useChoiceHandles,
  useGameArea,
  useInstructed,
} from '../kit';
import type { GameProps } from '../types';
import { blendLayout, buildRounds, type Round } from './rounds';
import { SlideTrack } from './SlideTrack';

interface RoundProps {
  round: Round;
  ctx: GameProps<'blend-pick'>['ctx'];
  /** Report a choice; the Game records it. */
  onAnswer: (round: Round, correct: boolean) => void;
  onNext: () => void;
}

/** One word: slide the track to hear it, then pick its picture. */
function RoundView({ round, ctx, onAnswer, onNext }: RoundProps) {
  const area = useGameArea();
  const instructed = useInstructed();
  const { tileSize, cardSize } = blendLayout(area.width, area.height, round.sounds.length);
  const [blended, setBlended] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [dimmed, setDimmed] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const handles = useChoiceHandles();
  // The Sounds voiced by the latest sweep, so the word can queue behind the last one.
  const voicing = useRef({ turn: 0, busy: false, wordNext: false });

  const slice = tileSize + blend.tileGap;
  const soundAudio = (i: number) => ctx.soundById(round.sounds[i]).audio;

  const sweep = (passed: number[], complete: boolean) => {
    const v = voicing.current;
    const clips = passed.map(soundAudio);
    if (passed.length) setActive(passed[passed.length - 1]);
    if (complete) {
      setBlended(true);
      if (!clips.length && v.busy) {
        v.wordNext = true; // the last Sound is still playing: the word follows it
        return;
      }
      v.busy = false;
      playQueue([...clips, round.word.audio]);
      return;
    }
    const mine = ++v.turn;
    v.busy = true;
    v.wordNext = false;
    playQueue(clips, (interrupted) => {
      if (v.turn !== mine || interrupted) return;
      v.busy = false;
      if (v.wordNext) playAsset(round.word.audio);
    });
  };

  const pick = (choice: Word) => {
    const correct = choice.id === round.word.id;
    onAnswer(round, correct);
    const handle = handles.get(choice.id);
    if (!correct) {
      handle?.shake();
      setDimmed((d) => [...d, choice.id]);
      return;
    }
    handle?.pop();
    setSolved(true);
    playAsset(round.word.audio, onNext);
  };

  return (
    <View style={styles.round}>
      <View style={styles.tiles}>
        {round.sounds.map((id, i) => (
          <View key={`${id}-${i}`} style={[styles.slice, { width: slice }]}>
            <View style={{ transform: [{ scale: active === i ? blend.activeScale : 1 }] }}>
              <LetterTile sound={ctx.soundById(id)} size={tileSize} />
            </View>
          </View>
        ))}
      </View>
      {blended ? (
        <View style={styles.row}>
          {round.choices.map((choice) => (
            <ChoiceButton
              key={choice.id}
              ref={handles.refFor(choice.id)}
              accessibilityLabel={`picture-${choice.id}`}
              dimmed={dimmed.includes(choice.id)}
              disabled={solved || !instructed}
              onPress={() => pick(choice)}
            >
              <PictureCard word={choice} size={cardSize} />
            </ChoiceButton>
          ))}
          <ListenButton audio={round.word.audio} />
        </View>
      ) : (
        <SlideTrack width={slice * round.sounds.length} count={round.sounds.length} onSweep={sweep} onLift={() => setActive(null)} enabled={instructed} />
      )}
    </View>
  );
}

/** Blend & Pick: slide a finger under the tiles to hear the word, then pick its picture. */
export function BlendPickGame({ game, ctx, onFinish }: GameProps<'blend-pick'>) {
  const [rounds] = useState(() => buildRounds(game.words, ctx));
  const [index, setIndex] = useState(0);
  const answers = useAnswers(onFinish);
  const round = rounds[index];

  const answer = (r: Round, correct: boolean) => {
    if (correct) r.sounds.forEach((s) => answers.record(s, true));
    else {
      answers.record(r.sounds[0], false);
      encourageRetry();
    }
  };

  const next = () => (index + 1 < rounds.length ? setIndex(index + 1) : answers.finish());

  return <GameShell kind="blend-pick">{round && <RoundView key={round.word.id} round={round} ctx={ctx} onAnswer={answer} onNext={next} />}</GameShell>;
}

const styles = StyleSheet.create({
  round: { alignItems: 'center', gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  // No gap: the tile slices must line up exactly with the slide track below.
  tiles: { flexDirection: 'row' },
  slice: { alignItems: 'center' },
});
