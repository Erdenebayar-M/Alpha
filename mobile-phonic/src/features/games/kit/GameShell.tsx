import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AudioId } from '../../../assets/manifest';
import { playAudio, playAsset, stopAudio } from '../../../audio/play';
import { BubbleButton } from '../../../components/BubbleButton';
import { Character } from '../../../components/Character';
import type { GameKind } from '../../../content/schema';
import { bubble, bubbleArt, colors, space } from '../../../theme/tokens';
import { DropZonesProvider } from './DropZones';
import { useLatest } from './useLatest';

// Every Game's spoken instruction (content/RECORDING.md section B).
const INSTRUCTION: Record<GameKind, AudioId> = {
  'hear-tap': 'ins_hear_tap',
  trace: 'ins_trace',
  'build-word': 'ins_build',
  'blend-pick': 'ins_blend',
  sort: 'ins_sort',
};

/** True once the Game's instruction has been heard (finished or cut short). */
const InstructedCtx = createContext(false);
export const useInstructed = () => useContext(InstructedCtx);

/**
 * Speaks a round's clip: the first once the instruction is over, each later one as soon
 * as `index` changes. Pass null to stay silent (e.g. between rounds).
 */
export function useSpeakEachRound(index: number, audio: string | null) {
  const instructed = useInstructed();
  useEffect(() => {
    if (instructed && audio) playAsset(audio);
  }, [instructed, index, audio]);
}

interface Props {
  kind: GameKind;
  children: ReactNode;
}

/**
 * The frame every Game renders in: Orto speaks the instruction on entry and repeats it
 * when tapped. Children can't read, so this is the only way a Game explains itself.
 * Leaving the Game stops its audio, and no audio callback reaches a Game that is gone.
 */
export function GameShell({ kind, children }: Props) {
  const [instructed, setInstructed] = useState(false);
  const alive = useRef(true);
  const markInstructed = useLatest(() => {
    if (alive.current) setInstructed(true);
  });

  // Only the latest instruction play may mark it heard: tapping Orto mid-instruction
  // interrupts the first play, and that stale settle must not cut the replay short.
  const plays = useRef(0);
  const speakInstruction = () => {
    const mine = ++plays.current;
    playAudio(INSTRUCTION[kind], () => {
      if (mine === plays.current) markInstructed.current();
    });
  };

  useEffect(() => {
    alive.current = true;
    speakInstruction();
    return () => {
      alive.current = false;
      stopAudio();
    };
    // The instruction plays once per Game mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <InstructedCtx.Provider value={instructed}>
      <DropZonesProvider>
        <View style={styles.screen}>
          <View style={styles.play}>{children}</View>
          <BubbleButton accessibilityLabel="instruction" color={colors.skyDeep} onPress={speakInstruction} style={styles.orto}>
            <Character id="chr_orto_point" size={bubble * bubbleArt} />
          </BubbleButton>
        </View>
      </DropZonesProvider>
    </InstructedCtx.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  play: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  orto: { position: 'absolute', right: space.lg, bottom: space.lg },
});
