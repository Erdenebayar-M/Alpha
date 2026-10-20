import { useEffect, useRef } from 'react';
import type { Game } from '../../content/schema';
import type { GameResult } from '../../engine/progress';
import { registry } from './registry';
import type { GameContext, GameRenderer } from './types';

interface Props {
  game: Game;
  ctx: GameContext;
  onFinish: (result: GameResult) => void;
  /** Called instead of onFinish when no renderer exists for the Game kind. */
  onSkip: () => void;
}

/** Skips once on mount; keyed by Game id, so re-renders never skip again. */
function Skip({ onSkip }: { onSkip: () => void }) {
  const latest = useRef(onSkip);
  useEffect(() => {
    latest.current = onSkip;
  });
  useEffect(() => latest.current(), []);
  return null;
}

/** The only way a screen mounts a Game: look its kind up, never switch on it. */
export function GameRunner({ game, ctx, onFinish, onSkip }: Props) {
  const Renderer = registry[game.kind] as GameRenderer<Game['kind']> | undefined;
  if (!Renderer) return <Skip key={game.id} onSkip={onSkip} />;
  return <Renderer key={game.id} game={game} ctx={ctx} onFinish={onFinish} />;
}
