import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { audio, type AudioAsset, type AudioId } from '../assets/manifest';
import { useProgress } from '../store/progress';

// iOS ships no Mongolian voice; Russian reads Cyrillic closely enough for placeholders.
const PLACEHOLDER_LANGUAGE = 'ru-RU';

/**
 * Called exactly once when a clip is over, however it ended: finished, interrupted by
 * another clip or stopAudio(), failed, or skipped because sound is off. Games advance
 * on this, so it must never be lost — a lost callback is a stuck Game.
 */
export type Settle = (interrupted: boolean) => void;

let current: AudioPlayer | null = null;
let pending: ((interrupted: boolean) => void) | null = null;

function play(asset: AudioAsset | undefined, onSettled?: Settle): void {
  stopAudio();
  let settled = false;
  const settle = (interrupted: boolean) => {
    if (settled) return;
    settled = true;
    if (pending === settle) pending = null;
    onSettled?.(interrupted);
  };

  if (!asset || !useProgress.getState().settings.soundOn) {
    settle(false);
    return;
  }
  pending = settle;
  if (asset.kind === 'speech') {
    Speech.speak(asset.text, {
      language: PLACEHOLDER_LANGUAGE,
      rate: 0.85,
      onDone: () => settle(false),
      onStopped: () => settle(true),
      onError: () => settle(true),
    });
    return;
  }
  const player = createAudioPlayer(asset.source);
  player.addListener('playbackStatusUpdate', (s) => {
    if (s.didJustFinish) settle(false);
    else if (s.error) settle(true);
  });
  current = player;
  player.play();
}

/** Plays one clip by Asset ID, stopping whatever was playing. */
export function playAudio(id: AudioId, onSettled?: Settle): void {
  play(audio[id], onSettled);
}

/**
 * Plays a clip named by content (a Sound's or Word's `audio`). Curriculum validation
 * guarantees every such id is in the manifest; an unknown id settles at once.
 */
export function playAsset(id: string, onSettled?: Settle): void {
  play((audio as Record<string, AudioAsset>)[id], onSettled);
}

/**
 * Plays clips back to back (e.g. a word's Sounds, then the word). If any new play
 * interrupts it, the rest is skipped — but `onSettled(true)` still fires, once.
 */
export function playQueue(ids: readonly string[], onSettled?: Settle): void {
  const [first, ...rest] = ids;
  if (first === undefined) {
    onSettled?.(false);
    return;
  }
  playAsset(first, (interrupted) => (interrupted ? onSettled?.(true) : playQueue(rest, onSettled)));
}

/** Stops the current clip. Its settle callback runs on the next microtask, after the caller's own play has started. */
export function stopAudio(): void {
  const interrupted = pending;
  pending = null;
  Speech.stop();
  current?.remove();
  current = null;
  if (interrupted) queueMicrotask(() => interrupted(true));
}
