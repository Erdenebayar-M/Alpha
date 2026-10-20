import type { GameKind } from '../../content/schema';
import { PlaceholderGame } from './PlaceholderGame';
import type { GameRenderer } from './types';

// Game kind -> renderer (ADR 0003). The mapped type makes a missing kind a type error.
// M2 replaces each PlaceholderGame with the real renderer — one line per kind.
export const registry: { [K in GameKind]: GameRenderer<K> } = {
  'hear-tap': PlaceholderGame,
  trace: PlaceholderGame,
  'build-word': PlaceholderGame,
  'blend-pick': PlaceholderGame,
  sort: PlaceholderGame,
};
