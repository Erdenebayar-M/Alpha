export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The id of the drop zone containing a screen point, or null. Pure, so it is unit-tested. */
export function hitTest(zones: ReadonlyMap<string, Rect>, x: number, y: number): string | null {
  for (const [id, r] of zones) {
    if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) return id;
  }
  return null;
}
