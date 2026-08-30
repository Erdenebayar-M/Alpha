import { useAudioPlayer, useAudioPlayerStatus, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';

interface UseTaskAudioOptions {
  /** Keep the prompt looping while the child adjusts volume/speed (AudioControls
   *  screens). Renderers that need the audio to reach a definite end (to drive a
   *  sprout pose, for instance) pass false. Default true. */
  loop?: boolean;
  /** Rewind to the start before playing on every toggle, so a replay always
   *  plays the whole prompt rather than resuming mid-way. Default false. */
  replayFromStart?: boolean;
}

/**
 * The useAudioPlayer + loop effect + play/pause toggle that used to be
 * hand-copied (identical down to the comments) into ~17 renderers. Every
 * renderer previously wrapped playback calls in try/catch because some mock
 * players don't implement every method — that's preserved here.
 */
export function useTaskAudio(
  url: string | null | undefined,
  options: UseTaskAudioOptions = {},
): { player: AudioPlayer; status: AudioStatus; toggle: () => void } {
  const { loop = true, replayFromStart = false } = options;
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    try {
      // player is a native AudioPlayer handle, not compiler-tracked data — expo-audio
      // has no construction-time `loop` option, so mutating it post-hoc is the only,
      // documented way to set it.
      // eslint-disable-next-line react-hooks/immutability
      player.loop = loop;
    } catch {
      // ignore; some mock players may not support looping
    }
  }, [player, loop]);

  const toggle = useCallback(() => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        if (replayFromStart) player.seekTo(0);
        player.play();
      }
    } catch {
      // ignore playback errors (e.g. an unreachable mock URL)
    }
  }, [player, status.playing, replayFromStart]);

  return { player, status, toggle };
}

/**
 * The "settle into a done pose once playback finishes, reset when it plays
 * again" latch duplicated across the sprout-driven renderers (FillBlank,
 * AssembleWord, FillLetterTiles, SyllableAssembleWord, MatchPairs).
 */
export function useAudioFinishedLatch(status: AudioStatus): boolean {
  const [hasFinished, setHasFinished] = useState(false);
  // Tracked so the two transitions below (finish sets the latch, a fresh play clears
  // it) can be detected and applied during render — see motion.ts's
  // useKeyboardStableHeight for the same pattern, and why it replaces an effect.
  const [prevDidJustFinish, setPrevDidJustFinish] = useState(status.didJustFinish);
  const [prevPlaying, setPrevPlaying] = useState(status.playing);

  if (status.didJustFinish !== prevDidJustFinish) {
    setPrevDidJustFinish(status.didJustFinish);
    if (status.didJustFinish) setHasFinished(true);
  }
  if (status.playing !== prevPlaying) {
    setPrevPlaying(status.playing);
    if (status.playing) setHasFinished(false);
  }

  return hasFinished;
}
