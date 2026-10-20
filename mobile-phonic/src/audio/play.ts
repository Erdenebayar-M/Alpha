import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { audio, type AudioAsset, type AudioId } from '../assets/manifest';
import { useProgress } from '../store/progress';

// iOS ships no Mongolian voice; Russian reads Cyrillic closely enough for placeholders.
const PLACEHOLDER_LANGUAGE = 'ru-RU';

let current: AudioPlayer | null = null;

function play(asset: AudioAsset): void {
  if (!useProgress.getState().settings.soundOn) return;
  stopAudio();
  if (asset.kind === 'speech') {
    Speech.speak(asset.text, { language: PLACEHOLDER_LANGUAGE, rate: 0.85 });
    return;
  }
  current = createAudioPlayer(asset.source);
  current.play();
}

/** Plays one clip by Asset ID, stopping whatever was playing. Silent when sound is off. */
export function playAudio(id: AudioId): void {
  play(audio[id]);
}

/**
 * Plays a clip named by content (a Sound's or Word's `audio`). Curriculum validation
 * guarantees every such id is in the manifest; an unknown id is ignored, never a crash.
 */
export function playAsset(id: string): void {
  const asset = (audio as Record<string, AudioAsset>)[id];
  if (asset) play(asset);
}

export function stopAudio(): void {
  Speech.stop();
  current?.remove();
  current = null;
}
