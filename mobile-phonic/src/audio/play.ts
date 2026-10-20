import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { audio, type AudioAsset, type AudioId } from '../assets/manifest';
import { useProgress } from '../store/progress';

// iOS ships no Mongolian voice; Russian reads Cyrillic closely enough for placeholders.
const PLACEHOLDER_LANGUAGE = 'ru-RU';

let current: AudioPlayer | null = null;

/** Plays one clip by Asset ID, stopping whatever was playing. Silent when sound is off. */
export function playAudio(id: AudioId): void {
  if (!useProgress.getState().settings.soundOn) return;
  stopAudio();
  const asset: AudioAsset = audio[id];
  if (asset.kind === 'speech') {
    Speech.speak(asset.text, { language: PLACEHOLDER_LANGUAGE, rate: 0.85 });
    return;
  }
  current = createAudioPlayer(asset.source);
  current.play();
}

export function stopAudio(): void {
  Speech.stop();
  current?.remove();
  current = null;
}
