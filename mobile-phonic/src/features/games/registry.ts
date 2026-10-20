import type { GameKind } from '../../content/schema';
import { BlendPickGame } from './blend-pick/BlendPickGame';
import { BuildWordGame } from './build-word/BuildWordGame';
import { HearTapGame } from './hear-tap/HearTapGame';
import { SortGame } from './sort/SortGame';
import { TraceGame } from './trace/TraceGame';
import type { GameRenderer } from './types';

// Game kind -> renderer (ADR 0003). The mapped type makes a missing kind a type error.
// Adding a Game kind = its renderer folder + one line here.
export const registry: { [K in GameKind]: GameRenderer<K> } = {
  'hear-tap': HearTapGame,
  trace: TraceGame,
  'build-word': BuildWordGame,
  'blend-pick': BlendPickGame,
  sort: SortGame,
};
