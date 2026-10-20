import { sortGame, space, tile } from '../../../theme/tokens';

/**
 * Sizes for the basket / card / basket row, from the room the Game may use. The three
 * pieces share one edge, so the row is exactly 3 edges + 2 gaps wide and always fits.
 */
export function sortLayout(area: { width: number; height: number }) {
  const gap = space.sm;
  const edge = Math.min(tile.pictureSize, (area.width - 2 * gap) / 3, area.height * sortGame.cardRatio);
  return {
    gap,
    /** Card edge; also the width of each basket. */
    edge,
    tile: Math.min(tile.size, area.height * sortGame.tileRatio),
    thumb: edge * sortGame.placedRatio,
  };
}
